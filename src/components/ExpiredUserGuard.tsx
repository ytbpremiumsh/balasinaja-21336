import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ExpiredUserGuardProps = {
  children: React.ReactNode;
};

export function ExpiredUserGuard({ children }: ExpiredUserGuardProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExpiration();
  }, []);

  const checkExpiration = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('expire_at')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (data?.expire_at) {
        const expireDate = new Date(data.expire_at);
        const now = new Date();
        setIsExpired(expireDate < now);
      }
    } catch (error) {
      console.error('Error checking expiration:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">Memuat...</div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-6">
                  <Lock className="h-16 w-16 text-red-500" />
                </div>
              </div>
              
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Langganan Anda Telah Berakhir</AlertTitle>
                <AlertDescription>
                  Akses ke fitur ini telah dikunci karena masa aktif langganan Anda telah habis.
                  Silakan perpanjang langganan untuk melanjutkan menggunakan layanan BalasinAja.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Untuk Melanjutkan:</h3>
                <ul className="text-left space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span>Hubungi admin untuk perpanjangan masa aktif</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span>Pilih paket langganan yang sesuai</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span>Lakukan pembayaran</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <span>Akses fitur akan otomatis aktif kembali</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => window.location.href = '/'}>
                  Kembali ke Dashboard
                </Button>
                <Button size="lg" variant="outline">
                  Hubungi Admin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
