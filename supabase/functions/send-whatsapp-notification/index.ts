import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from JWT token in Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError || !roles) {
      console.error('Not admin:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, message, userId } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API settings (either from user or from admin settings)
    let apiUrl = '';
    let apiKey = '';

    if (userId) {
      // Get user's settings
      const { data: settings } = await supabaseAdmin
        .from('settings')
        .select('key, value')
        .eq('user_id', userId)
        .in('key', ['onesender_api_url', 'onesender_api_key']);

      settings?.forEach(setting => {
        if (setting.key === 'onesender_api_url') apiUrl = setting.value;
        if (setting.key === 'onesender_api_key') apiKey = setting.value;
      });
    }

    // If no user settings or empty, try to get from first available user settings
    if (!apiUrl || !apiKey) {
      const { data: defaultSettings } = await supabaseAdmin
        .from('settings')
        .select('key, value')
        .in('key', ['onesender_api_url', 'onesender_api_key'])
        .limit(2);

      defaultSettings?.forEach(setting => {
        if (!apiUrl && setting.key === 'onesender_api_url') apiUrl = setting.value;
        if (!apiKey && setting.key === 'onesender_api_key') apiKey = setting.value;
      });
    }

    if (!apiUrl || !apiKey) {
      console.error('API settings missing - apiUrl:', !!apiUrl, 'apiKey:', !!apiKey);
      return new Response(
        JSON.stringify({ 
          error: 'API settings not configured. Please set OneSender API credentials in Settings page.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending WhatsApp notification to:', phone);

    // Prepare request body for OneSender API
    const requestBody = {
      to: phone,
      type: 'text',
      text: {
        body: message
      },
      priority: 10
    };

    console.log('OneSender request body:', JSON.stringify(requestBody));

    // Send WhatsApp message using OneSender API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('OneSender API response status:', response.status);
    console.log('OneSender API response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});