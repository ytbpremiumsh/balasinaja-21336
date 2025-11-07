import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Upload, CreditCard, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PackageType = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
};

type PaymentSettings = {
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  qris_code: string | null;
  qris_image_url: string | null;
};

export default function Subscription() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchPaymentSettings();
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

  const fetchPaymentSettings = async () => {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .single();

    if (!error && data) {
      setPaymentSettings(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPackage || !proofImage) {
      toast({
        title: "Error",
        description: "Pilih paket dan upload bukti pembayaran",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tidak terautentikasi");

      // Upload image
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(proofImage);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const selectedPkg = packages.find(p => p.id === selectedPackage);
        if (!selectedPkg) throw new Error("Paket tidak ditemukan");

        const { error: insertError } = await supabase
          .from("payment_proofs")
          .insert({
            user_id: session.user.id,
            package_id: selectedPackage,
            amount: selectedPkg.price,
            payment_method: paymentMethod,
            proof_image_url: base64,
            status: "pending",
          });

        if (insertError) throw insertError;

        toast({
          title: "Berhasil",
          description: "Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.",
        });

        setSelectedPackage("");
        setProofImage(null);
        setPaymentMethod("transfer");
        
        // Reset file input
        const fileInput = document.getElementById("proof-image") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      };

      reader.onerror = () => {
        throw new Error("Gagal membaca file");
      };

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(price);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Perpanjangan Langganan</h1>
          <p className="text-muted-foreground">Pilih paket dan lakukan pembayaran</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Package Selection */}
          <Card>
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
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pkg.duration_days} hari
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatPrice(pkg.price)}</p>
                    </div>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <div className="space-y-6">
            {paymentSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Informasi Pembayaran
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentSettings.bank_name && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Transfer Bank</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Bank:</strong> {paymentSettings.bank_name}</p>
                        <p><strong>No. Rekening:</strong> {paymentSettings.account_number}</p>
                        <p><strong>Atas Nama:</strong> {paymentSettings.account_holder}</p>
                      </div>
                    </div>
                  )}
                  
                  {paymentSettings.qris_code && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">QRIS</h4>
                      {paymentSettings.qris_image_url ? (
                        <img 
                          src={paymentSettings.qris_image_url} 
                          alt="QRIS Code" 
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <p className="text-sm">{paymentSettings.qris_code}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Payment with Mayar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Bayar Otomatis dengan Mayar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Bayar langsung dengan sistem pembayaran otomatis Mayar. Setelah pembayaran berhasil, langganan Anda akan langsung diperpanjang secara otomatis.
                  </p>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                    <p className="font-medium mb-2">📝 Cara kerja:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Pilih paket di sebelah kiri</li>
                      <li>Klik tombol "Bayar Sekarang"</li>
                      <li>Anda akan diarahkan ke halaman pembayaran Mayar</li>
                      <li>Selesaikan pembayaran</li>
                      <li>Langganan otomatis diperpanjang</li>
                    </ol>
                  </div>
                  <Button 
                    onClick={handleMayarPayment} 
                    className="w-full" 
                    disabled={loading || !selectedPackage}
                    size="lg"
                  >
                    {loading ? "Memproses..." : "Bayar Sekarang dengan Mayar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Payment Proof */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Bukti Pembayaran Manual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="payment-method">Metode Pembayaran</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Transfer Bank</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="proof-image">Bukti Transfer</Label>
                    <Input
                      id="proof-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || !selectedPackage}>
                    {loading ? "Mengirim..." : "Kirim Bukti Pembayaran"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
