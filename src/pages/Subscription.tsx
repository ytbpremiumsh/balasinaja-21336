import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, CreditCard } from "lucide-react";
import qrisImage from "@/assets/QRIS.png";
import ewalletImage from "@/assets/E-Wallet.png";
import transferImage from "@/assets/Transfer_Bank.png";

type PackageType = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
};

export default function Subscription() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("duration_days", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data paket",
        variant: "destructive",
      });
    } else {
      setPackages(data || []);
    }
  };


  const handleMayarPayment = async () => {
    if (!selectedPackage) {
      toast({
        title: "Error",
        description: "Pilih paket terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tidak terautentikasi");

      const { data, error } = await supabase.functions.invoke('mayar-checkout', {
        body: { package_id: selectedPackage }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Checkout URL tidak ditemukan");
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Perpanjangan Langganan</h1>
          <p className="text-muted-foreground">Pilih paket dan lakukan pembayaran</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Package Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Paket Langganan
              </CardTitle>
              <CardDescription>Pilih paket yang sesuai dengan kebutuhan Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pkg.duration_days} hari
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-primary">{formatPrice(pkg.price)}</p>
                    </div>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Rincian Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedPkg ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paket</span>
                      <span className="font-medium">{selectedPkg.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Durasi</span>
                      <span className="font-medium">{selectedPkg.duration_days} hari</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-semibold">Total Pembayaran</span>
                      <span className="font-bold text-lg text-primary">
                        {formatPrice(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-center">Metode Pembayaran</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="border rounded-lg p-2 bg-background">
                        <img src={qrisImage} alt="QRIS" className="w-full h-12 object-contain" />
                        <p className="text-xs text-center mt-1 font-medium">QRIS</p>
                      </div>
                      <div className="border rounded-lg p-2 bg-background">
                        <img src={ewalletImage} alt="E-Wallet" className="w-full h-12 object-contain" />
                        <p className="text-xs text-center mt-1 font-medium">E-Wallet</p>
                      </div>
                      <div className="border rounded-lg p-2 bg-background">
                        <img src={transferImage} alt="Transfer Bank" className="w-full h-12 object-contain" />
                        <p className="text-xs text-center mt-1 font-medium">Transfer</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleMayarPayment} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Memproses..." : "Bayar Sekarang"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Anda akan diarahkan ke halaman pembayaran Mayar yang aman
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Pilih paket terlebih dahulu</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
