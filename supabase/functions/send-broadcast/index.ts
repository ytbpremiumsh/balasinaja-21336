import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  recipients: string[];
  message: string;
  category_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { recipients, message, category_id }: BroadcastRequest = await req.json();

    console.log("📢 Broadcast request:", {
      userId: user.id,
      categoryId: category_id,
      recipientCount: recipients.length,
    });

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id);

    if (settingsError) throw settingsError;

    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    const apiUrl = settingsMap.onesender_api_url;
    const apiKey = settingsMap.onesender_api_key;

    if (!apiUrl || !apiKey) {
      throw new Error("OneSender API not configured. Please set API URL and API Key in Settings.");
    }

    console.log("🔧 Using OneSender API:", apiUrl);

    // Create broadcast log
    const { data: logData, error: logError } = await supabase
      .from("broadcast_logs")
      .insert({
        user_id: user.id,
        category_id,
        message,
        total_recipients: recipients.length,
        status: "processing",
      })
      .select()
      .single();

    if (logError) throw logError;

    const logId = logData.id;

    // Send messages to all recipients
    let successCount = 0;
    let failCount = 0;

    for (const phone of recipients) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            phone: phone,
            message: message,
            message_type: "text",
          }),
        });

        if (response.ok) {
          successCount++;
          console.log(`✅ Message sent to ${phone}`);
        } else {
          failCount++;
          console.error(`❌ Failed to send to ${phone}:`, await response.text());
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error sending to ${phone}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update broadcast log
    await supabase
      .from("broadcast_logs")
      .update({
        total_sent: successCount,
        total_failed: failCount,
        status: "completed",
      })
      .eq("id", logId);

    console.log("📊 Broadcast completed:", {
      total: recipients.length,
      success: successCount,
      failed: failCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: recipients.length,
        sent: successCount,
        failed: failCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Broadcast error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
