import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type PaymentProof = {
  id: string;
  created_at: string;
  user_id: string;
  package_id: string;
  amount: number;
  payment_method: string;
  proof_image_url: string;
  status: string;
  notes: string | null;
  profiles: {
    email: string;
    name: string | null;
  };
  packages: {
    name: string;
    duration_days: number;
  };
};

export default function PaymentVerification() {
  const [payments, setPayments] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('payment_proofs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payment_proofs' },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select(`
          *,
          packages(name, duration_days)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      if (data) {
        const userIds = data.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, name")
          .in("user_id", userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const paymentsWithProfiles = data.map(payment => ({
          ...payment,
          profiles: profilesMap.get(payment.user_id) || { email: "", name: null }
        }));
        
        setPayments(paymentsWithProfiles as any);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (paymentId: string, status: "approved" | "rejected", packageId: string, userId: string, durationDays: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tidak terautentikasi");

      // Update payment status
      const { error: updateError } = await supabase
        .from("payment_proofs")
        .update({
          status,
          verified_by: session.user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      // If approved, extend user subscription
      if (status === "approved") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("expire_at, status")
          .eq("user_id", userId)
          .single();

        let newExpireDate: Date;
        const now = new Date();
        
        if (profile?.expire_at) {
          const currentExpire = new Date(profile.expire_at);
          if (currentExpire > now) {
            newExpireDate = new Date(currentExpire.getTime() + durationDays * 24 * 60 * 60 * 1000);
          } else {
            newExpireDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
          }
        } else {
          newExpireDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        const { data: packageData } = await supabase
          .from("packages")
          .select("name")
          .eq("id", packageId)
          .single();

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            expire_at: newExpireDate.toISOString(),
            plan: packageData?.name || "custom",
            status: "active",
          })
          .eq("user_id", userId);

        if (profileError) throw profileError;

        // Send WhatsApp notification in background (don't wait for it)
        supabase.functions.invoke('send-subscription-notification', {
          body: {
            userId: userId,
            packageName: packageData?.name || "Paket",
            expiryDate: newExpireDate.toISOString()
          }
        }).catch(err => console.error('Failed to send subscription notification:', err));

        // Create notification for user
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_approved",
          title: "Pembayaran Disetujui",
          message: `Pembayaran Anda untuk paket ${packageData?.name} telah disetujui. Langganan Anda diperpanjang ${durationDays} hari.`,
        });

        // Log activity
        await supabase.from("activity_logs").insert({
          admin_id: session.user.id,
          target_user_id: userId,
          action: "perpanjang_langganan",
          details: `Langganan diperpanjang ${durationDays} hari melalui verifikasi pembayaran`,
        });
      } else {
        // Create notification for rejected payment
        const { data: packageData } = await supabase
          .from("packages")
          .select("name")
          .eq("id", packageId)
          .single();

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_rejected",
          title: "Pembayaran Ditolak",
          message: `Pembayaran Anda untuk paket ${packageData?.name} telah ditolak. Silakan hubungi admin untuk informasi lebih lanjut.`,
        });
      }

      toast({
        title: "Berhasil",
        description: `Pembayaran ${status === "approved" ? "disetujui" : "ditolak"}`,
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(price);
  };

  const pendingCount = payments.filter(p => p.status === "pending").length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Verifikasi Pembayaran</h1>
            <p className="text-muted-foreground">Kelola dan verifikasi bukti pembayaran user</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pembayaran Baru
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada pembayaran</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{payment.profiles?.name || payment.profiles?.email}</p>
                        <p className="text-sm text-muted-foreground">{payment.profiles?.email}</p>
                        <p className="text-sm">
                          <strong>Paket:</strong> {payment.packages?.name} ({payment.packages?.duration_days} hari)
                        </p>
                        <p className="text-sm">
                          <strong>Jumlah:</strong> {formatPrice(payment.amount)}
                        </p>
                        <p className="text-sm">
                          <strong>Metode:</strong> {payment.payment_method === "transfer" ? "Transfer Bank" : "QRIS"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        {getStatusBadge(payment.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImage(payment.proof_image_url)}
                          className="w-full"
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Lihat Bukti
                        </Button>
                      </div>
                    </div>
                    
                    {payment.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(payment.id, "approved", payment.package_id, payment.user_id, payment.packages?.duration_days || 0)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerify(payment.id, "rejected", payment.package_id, payment.user_id, 0)}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran</DialogTitle>
            <DialogDescription>Periksa bukti pembayaran dengan teliti</DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <img src={selectedImage} alt="Bukti Pembayaran" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
