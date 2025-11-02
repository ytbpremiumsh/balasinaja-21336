import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SubscriptionData = {
  plan: string;
  status: string;
  expire_at: string | null;
  name: string | null;
};

export function SubscriptionInfo() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('plan, status, expire_at, name')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (expireAt: string | null) => {
    if (!expireAt) return 0;
    const now = new Date();
    const expire = new Date(expireAt);
    const diff = expire.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isExpired = (expireAt: string | null) => {
    if (!expireAt) return true;
    return new Date(expireAt) < new Date();
  };

  if (loading) {
    return <Card><CardContent className="pt-6">Memuat data langganan...</CardContent></Card>;
  }

  if (!subscription) {
    return null;
  }

  const expired = isExpired(subscription.expire_at);
  const daysRemaining = getDaysRemaining(subscription.expire_at);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status Langganan
          </span>
          <Badge variant={expired ? "destructive" : "default"} className="capitalize">
            {subscription.plan}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expired ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Langganan Anda telah berakhir. Perpanjang untuk melanjutkan menggunakan layanan.
            </AlertDescription>
          </Alert>
        ) : daysRemaining <= 7 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Langganan Anda akan berakhir dalam {daysRemaining} hari.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Langganan Anda aktif dan valid.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Paket Langganan</p>
            <p className="text-lg font-semibold capitalize">{subscription.plan}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-semibold capitalize">
              {expired ? 'Expired' : subscription.status}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Berlaku Hingga</p>
            <p className="text-lg font-semibold">{formatDate(subscription.expire_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sisa Waktu</p>
            <p className="text-lg font-semibold">
              {expired ? '0 hari' : `${daysRemaining} hari`}
            </p>
          </div>
        </div>

        {expired && (
          <Button className="w-full" size="lg">
            Perpanjang Langganan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
