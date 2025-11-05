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

    console.log('🕐 Processing scheduled broadcasts...');

    // Get all pending broadcast queue items that are scheduled for now or past
    const { data: queueItems, error: queueError } = await supabase
      .from('broadcast_queue')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString())
      .limit(100);

    if (queueError) {
      console.error('❌ Error fetching queue:', queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No scheduled broadcasts to process');
      return new Response(
        JSON.stringify({ message: 'No scheduled broadcasts to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${queueItems.length} scheduled messages to send`);

    let successCount = 0;
    let failCount = 0;

    // Process each queue item
    for (const item of queueItems) {
      try {
        // Get broadcast log to find user_id
        const { data: broadcastLog, error: logError } = await supabase
          .from('broadcast_logs')
          .select('user_id')
          .eq('id', item.broadcast_log_id)
          .single();

        if (logError || !broadcastLog) {
          console.error('❌ Cannot find broadcast log for queue item:', item.id);
          await supabase
            .from('broadcast_queue')
            .update({
              status: 'failed',
              error_message: 'Broadcast log not found'
            })
            .eq('id', item.id);
          failCount++;
          continue;
        }

        // Get user's OneSender settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('key, value')
          .eq('user_id', broadcastLog.user_id)
          .in('key', ['onesender_api_url', 'onesender_api_key']);

        if (settingsError) {
          console.error('❌ Error fetching settings:', settingsError);
          await supabase
            .from('broadcast_queue')
            .update({
              status: 'failed',
              error_message: 'Cannot fetch user settings'
            })
            .eq('id', item.id);
          failCount++;
          continue;
        }

        const settingsMap: any = {};
        if (settingsData) {
          settingsData.forEach((setting: any) => {
            settingsMap[setting.key] = setting.value;
          });
        }

        const apiUrl = settingsMap.onesender_api_url || '';
        const apiKey = settingsMap.onesender_api_key || '';

        if (!apiUrl || !apiKey) {
          console.error('❌ OneSender API not configured for user:', broadcastLog.user_id);
          await supabase
            .from('broadcast_queue')
            .update({
              status: 'failed',
              error_message: 'OneSender API not configured'
            })
            .eq('id', item.id);
          failCount++;
          continue;
        }

        // Send message via OneSender
        const payload: any = {
          to: item.phone,
          type: item.media_type || 'text',
          priority: 10
        };

        if (payload.type === 'text') {
          payload.text = { body: item.message };
        } else if (payload.type === 'image') {
          payload.image = { link: item.media_url, caption: item.message };
        } else if (payload.type === 'document') {
          payload.document = { link: item.media_url, caption: item.message };
        }

        console.log(`📤 Sending to ${item.phone}...`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log(`✅ Message sent to ${item.phone}`);
          await supabase
            .from('broadcast_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          // Update broadcast log counters
          await supabase.rpc('increment', {
            row_id: item.broadcast_log_id,
            x: 1
          });

          successCount++;
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to send to ${item.phone}:`, errorText);
          
          const retryCount = (item.retry_count || 0) + 1;
          
          if (retryCount < 3) {
            // Retry later
            await supabase
              .from('broadcast_queue')
              .update({
                retry_count: retryCount,
                scheduled_at: new Date(Date.now() + 300000).toISOString(), // Retry in 5 minutes
                error_message: errorText
              })
              .eq('id', item.id);
          } else {
            // Max retries reached, mark as failed
            await supabase
              .from('broadcast_queue')
              .update({
                status: 'failed',
                error_message: `Max retries reached: ${errorText}`
              })
              .eq('id', item.id);
          }
          
          failCount++;
        }

        // Add delay between messages (1-3 seconds)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      } catch (error: any) {
        console.error(`❌ Error processing queue item ${item.id}:`, error);
        await supabase
          .from('broadcast_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', item.id);
        failCount++;
      }
    }

    console.log(`✅ Processed ${successCount} messages, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: queueItems.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});