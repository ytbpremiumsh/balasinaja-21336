import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user_id from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      console.error('❌ No user_id provided');
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('🔥 Webhook received for user:', userId, JSON.stringify(payload, null, 2));

    // Validate message
    const isValid = !payload.is_group && 
                   !payload.is_from_me && 
                   ['text', 'image', 'document'].includes(payload.message_type);

    if (!isValid) {
      console.log('⚠️ Message ignored (group/self/invalid type)');
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse phone number
    const phone = String(payload.from_id).replace(/(@s\.whatsapp\.net|@g\.us|@newsletter|@lid)/g, '');
    const name = payload.from_name || '';
    const messageText = payload.message_text || '';
    const messageType = payload.message_type;
    const messageId = payload.message_id;

    // Save or update contact
    const { error: contactError } = await supabase
      .from('contacts')
      .upsert({ phone, name, user_id: userId }, { onConflict: 'phone' });

    if (contactError) {
      console.error('Error saving contact:', contactError);
    } else {
      console.log('📇 Contact saved:', phone);
    }

    // Save to inbox
    const { error: inboxError } = await supabase
      .from('inbox')
      .insert({
        message_id: messageId,
        phone,
        name,
        inbox_type: messageType,
        inbox_message: messageText,
        status: 'received',
        user_id: userId
      });

    if (inboxError) {
      console.error('Error saving to inbox:', inboxError);
      throw inboxError;
    }
    console.log('📥 Message saved to inbox');

    // Check for trigger match
    const { data: trigger } = await supabase
      .from('autoreplies')
      .select('*')
      .eq('user_id', userId)
      .ilike('trigger', messageText.trim())
      .single();

    if (trigger) {
      console.log('✅ Trigger matched:', trigger.trigger);

      // Get contact name for personalization
      const { data: contact } = await supabase
        .from('contacts')
        .select('name')
        .eq('phone', phone)
        .single();

      const contactName = contact?.name || name;
      let replyContent = trigger.content
        .replace('{PHONE}', phone)
        .replace('{NAME}', contactName);

      // Send reply via OneSender
      const sent = await sendOneSenderMessage(userId, phone, trigger.message_type, replyContent, trigger.url_image || '');

      if (sent) {
        // Update inbox with reply
        await supabase
          .from('inbox')
          .update({
            reply_type: trigger.message_type,
            reply_message: replyContent,
            reply_image: trigger.url_image || '',
            status: 'replied_trigger'
          })
          .eq('message_id', messageId);

        console.log('📣 Reply sent via trigger');
        return new Response(JSON.stringify({ status: 'replied_trigger' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // AI fallback for text messages
    if (messageType === 'text') {
      console.log('🤖 Attempting AI reply...');
      
      const aiReply = await generateAiReply(supabase, userId, messageText);
      
      if (aiReply) {
        console.log('✅ AI generated reply');
        
        const sent = await sendOneSenderMessage(userId, phone, 'text', aiReply, '');
        
        if (sent) {
          await supabase
            .from('inbox')
            .update({
              reply_type: 'text',
              reply_message: aiReply,
              status: 'replied_ai'
            })
            .eq('message_id', messageId);

          console.log('🤖 AI reply sent');
          return new Response(JSON.stringify({ status: 'replied_ai' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // No reply sent
    console.log('🚫 No reply sent');
    await supabase
      .from('inbox')
      .update({ status: 'no_reply' })
      .eq('message_id', messageId);

    return new Response(JSON.stringify({ status: 'no_reply' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAiReply(supabase: any, userId: string, question: string): Promise<string> {
  try {
    // Get AI model and system prompt from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', ['ai_model', 'system_prompt']);

    let aiModel = 'google/gemini-2.5-flash';
    let systemPrompt = 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.';

    if (settings) {
      const modelSetting = settings.find((s: any) => s.key === 'ai_model');
      const promptSetting = settings.find((s: any) => s.key === 'system_prompt');
      if (modelSetting) aiModel = modelSetting.value;
      if (promptSetting) systemPrompt = promptSetting.value;
    }

    // Get knowledge base for context
    const { data: knowledge } = await supabase
      .from('ai_knowledge_base')
      .select('question, answer')
      .eq('user_id', userId)
      .limit(10);

    let context = '';
    if (knowledge && knowledge.length > 0) {
      context = knowledge
        .map((k: any) => `Q: ${k.question}\nA: ${k.answer}`)
        .join('\n---\n');
    }

    const userPrompt = context 
      ? `${context}\n\nUser question: ${question}`
      : question;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';

  } catch (error) {
    console.error('Error generating AI reply:', error);
    return '';
  }
}

async function sendOneSenderMessage(userId: string, to: string, type: string, text: string, image: string): Promise<boolean> {
  try {
    // Create supabase client to access settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API URL and Key from database settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', ['onesender_api_url', 'onesender_api_key']);

    const settingsMap: any = {};
    if (settingsData) {
      settingsData.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });
    }

    const apiUrl = settingsMap.onesender_api_url || 'http://194.127.192.254:3002/api/v1/messages';
    const apiKey = settingsMap.onesender_api_key || Deno.env.get('ONESENDER_API_KEY');

    if (!apiKey) {
      console.error('OneSender API key not configured');
      return false;
    }

    const payload: any = {
      to,
      type,
      priority: 10
    };

    if (type === 'text') {
      payload.text = { body: text };
    } else if (type === 'image') {
      payload.image = { link: image, caption: text };
    } else if (type === 'document') {
      payload.document = { link: image, caption: text };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('📤 Message sent to OneSender');
      return true;
    } else {
      console.error('OneSender API error:', await response.text());
      return false;
    }

  } catch (error) {
    console.error('Error sending to OneSender:', error);
    return false;
  }
}
