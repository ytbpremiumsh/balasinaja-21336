import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  recipients: Array<{ phone: string; name?: string }>;
  message: string;
  category_id: string;
  media_type?: string;
  media_url?: string;
  scheduled_at?: string;
  delay_min?: number;
  delay_max?: number;
  use_personalization?: boolean;
  template_id?: string;
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

    const { 
      recipients, 
      message, 
      category_id,
      media_type = "text",
      media_url,
      scheduled_at,
      delay_min = 1,
      delay_max = 3,
      use_personalization = false,
      template_id
    }: BroadcastRequest = await req.json();

    console.log("📢 Broadcast request:", {
      userId: user.id,
      categoryId: category_id,
      recipientCount: recipients.length,
      mediaType: media_type,
      scheduled: scheduled_at,
    });

    // Get user settings - WAJIB dari user sendiri
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id);

    if (settingsError) throw settingsError;

    const settingsMap = settings?.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {}) || {};

    const apiUrl = settingsMap.onesender_api_url;
    const apiKey = settingsMap.onesender_api_key;

    if (!apiUrl || !apiKey) {
      throw new Error("OneSender API belum dikonfigurasi. Silakan set API URL dan API Key di halaman Settings Anda.");
    }

    // Create broadcast log
    const { data: logData, error: logError } = await supabase
      .from("broadcast_logs")
      .insert({
        user_id: user.id,
        category_id,
        message,
        total_recipients: recipients.length,
        status: scheduled_at ? "scheduled" : "processing",
        media_type,
        media_url,
        scheduled_at,
        delay_min,
        delay_max,
        use_personalization,
        template_id,
      })
      .select()
      .single();

    if (logError) throw logError;

    const logId = logData.id;

    // Create queue entries for each recipient
    const queueEntries = recipients.map((recipient) => {
      let personalizedMessage = message;
      
      // Apply personalization if enabled
      if (use_personalization && recipient.name) {
        personalizedMessage = message
          .replace(/\{\{nama\}\}/g, recipient.name)
          .replace(/\{\{tanggal\}\}/g, new Date().toLocaleDateString('id-ID'))
          .replace(/\{\{phone\}\}/g, recipient.phone);
      }

      return {
        broadcast_log_id: logId,
        phone: recipient.phone,
        name: recipient.name,
        message: personalizedMessage,
        media_type,
        media_url,
        status: scheduled_at ? "scheduled" : "pending",
        scheduled_at: scheduled_at || null,
      };
    });

    const { error: queueError } = await supabase
      .from("broadcast_queue")
      .insert(queueEntries);

    if (queueError) throw queueError;

    // If scheduled, don't send now
    if (scheduled_at) {
      console.log("📅 Broadcast scheduled for:", scheduled_at);
      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          broadcast_id: logId,
          total: recipients.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Process queue immediately if not scheduled
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        // Get personalized message from queue
        const { data: queueItem } = await supabase
          .from("broadcast_queue")
          .select("*")
          .eq("broadcast_log_id", logId)
          .eq("phone", recipient.phone)
          .single();

        if (!queueItem) continue;

        // Update status to processing
        await supabase
          .from("broadcast_queue")
          .update({ status: "processing" })
          .eq("id", queueItem.id);

        // Prepare request body for OneSender API
        const requestBody: any = {
          to: recipient.phone,
          type: media_type,
          priority: 10
        };

        // Determine API endpoint based on media type
        let apiEndpoint = apiUrl;
        
        // For image broadcasts, use the media endpoint
        if (media_type === "image") {
          apiEndpoint = apiUrl.replace("/api/v1/message/send", "/api/v1/media");
        }

        // Format message based on type for OneSender
        if (media_type === "text") {
          requestBody.text = {
            body: queueItem.message
          };
        } else if (media_type === "image") {
          requestBody.image = {
            link: media_url,
            caption: queueItem.message
          };
        } else if (media_type === "video") {
          requestBody.video = {
            link: media_url,
            caption: queueItem.message
          };
        } else if (media_type === "document") {
          requestBody.document = {
            link: media_url,
            caption: queueItem.message,
            filename: "document.pdf"
          };
        }

        console.log("📤 Sending to OneSender API:", { 
          url: apiEndpoint, 
          phone: recipient.phone,
          messageType: media_type
        });

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          successCount++;
          await supabase
            .from("broadcast_queue")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString() 
            })
            .eq("id", queueItem.id);
          console.log(`✅ Message sent to ${recipient.phone}`);
        } else {
          const errorText = await response.text();
          const isWhatsAppError = errorText.includes('not registered') || 
                                  errorText.includes('not a whatsapp') || 
                                  response.status === 404 ||
                                  response.status === 400;
          
          failCount++;
          await supabase
            .from("broadcast_queue")
            .update({ 
              status: "failed",
              error_message: isWhatsAppError 
                ? 'Nomor tidak terdaftar di WhatsApp' 
                : errorText,
            })
            .eq("id", queueItem.id);
          console.error(`❌ Failed to send to ${recipient.phone}:`, response.status, errorText);
        }
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error sending to ${recipient.phone}:`, errorMessage);
        
        // Update queue with error
        await supabase
          .from("broadcast_queue")
          .update({ 
            status: "failed",
            error_message: errorMessage,
          })
          .eq("broadcast_log_id", logId)
          .eq("phone", recipient.phone);
      }

      // Random delay between delay_min and delay_max seconds
      const delaySeconds = delay_min + Math.random() * (delay_max - delay_min);
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
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
        broadcast_id: logId,
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