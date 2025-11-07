import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData = await req.json();
    
    console.log('Mayar webhook received:', JSON.stringify(webhookData));

    // Extract payment info from webhook
    const status = webhookData.status;
    const metadata = webhookData.metadata || {};
    const paymentProofId = metadata.payment_proof_id;
    const userId = metadata.user_id;
    const packageId = metadata.package_id;

    if (!paymentProofId) {
      throw new Error('Payment proof ID not found in webhook data');
    }

    // Update payment proof status
    if (status === 'paid' || status === 'settled') {
      // Update payment proof to approved
      const { error: updateError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          notes: 'Pembayaran berhasil via Mayar'
        })
        .eq('id', paymentProofId);

      if (updateError) {
        console.error('Error updating payment proof:', updateError);
        throw updateError;
      }

      // Get package details to calculate new expiry
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('duration_days')
        .eq('id', packageId)
        .single();

      if (!packageError && packageData) {
        // Get current user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('expire_at')
          .eq('user_id', userId)
          .single();

        if (!profileError && profile) {
          // Calculate new expiry date
          const currentExpiry = new Date(profile.expire_at);
          const now = new Date();
          const baseDate = currentExpiry > now ? currentExpiry : now;
          const newExpiry = new Date(baseDate);
          newExpiry.setDate(newExpiry.getDate() + packageData.duration_days);

          // Update user profile
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              expire_at: newExpiry.toISOString(),
              status: 'active',
              plan: 'premium'
            })
            .eq('user_id', userId);

          if (profileUpdateError) {
            console.error('Error updating profile:', profileUpdateError);
          } else {
            console.log('Profile updated successfully, new expiry:', newExpiry);
            
            // Send notification
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'payment',
              title: 'Pembayaran Berhasil',
              message: `Pembayaran Anda telah dikonfirmasi. Langganan diperpanjang hingga ${newExpiry.toLocaleDateString('id-ID')}`
            });
          }
        }
      }

      console.log('Payment processed successfully');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in mayar-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
