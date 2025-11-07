import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  const paymentId = searchParams.get("payment_id");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("payment_proofs")
          .select("status")
          .eq("id", paymentId)
          .single();

        if (!error && data) {
          setPaymentStatus(data.status);
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [paymentId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Pembayaran Berhasil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Terima kasih! Pembayaran Anda sedang diproses.
            </p>
            {paymentStatus === "approved" && (
              <p className="text-sm text-green-600">
                ✓ Pembayaran telah dikonfirmasi dan langganan Anda telah diperpanjang.
              </p>
            )}
            {paymentStatus === "pending" && (
              <p className="text-sm text-yellow-600">
                ⏱ Pembayaran sedang diverifikasi. Anda akan menerima notifikasi setelah pembayaran dikonfirmasi.
              </p>
            )}
            <div className="flex gap-2 justify-center pt-4">
              <Button onClick={() => navigate("/dashboard")}>
                Kembali ke Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate("/subscription")}>
                Lihat Langganan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
