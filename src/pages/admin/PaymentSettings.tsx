import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, CreditCard } from "lucide-react";

export default function PaymentSettings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
    qris_code: "",
    qris_image_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .single();

    if (!error && data) {
      setSettings({
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        account_holder: data.account_holder || "",
        qris_code: data.qris_code || "",
        qris_image_url: data.qris_image_url || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("payment_settings")
        .select("id")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("payment_settings")
          .update(settings)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_settings")
          .insert([settings]);

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan pembayaran berhasil disimpan",
      });
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan Pembayaran</h1>
          <p className="text-muted-foreground">Kelola informasi pembayaran untuk user</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informasi Pembayaran
            </CardTitle>
            <CardDescription>
              Informasi ini akan ditampilkan kepada user saat melakukan perpanjangan langganan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Transfer Bank</h3>
                
                <div>
                  <Label htmlFor="bank_name">Nama Bank</Label>
                  <Input
                    id="bank_name"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    placeholder="Contoh: BCA, Mandiri"
                  />
                </div>

                <div>
                  <Label htmlFor="account_number">Nomor Rekening</Label>
                  <Input
                    id="account_number"
                    value={settings.account_number}
                    onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                    placeholder="Contoh: 1234567890"
                  />
                </div>

                <div>
                  <Label htmlFor="account_holder">Atas Nama</Label>
                  <Input
                    id="account_holder"
                    value={settings.account_holder}
                    onChange={(e) => setSettings({ ...settings, account_holder: e.target.value })}
                    placeholder="Contoh: PT. BalasinAja"
                  />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">QRIS / E-Wallet</h3>
                
                <div>
                  <Label htmlFor="qris_code">Kode QRIS</Label>
                  <Input
                    id="qris_code"
                    value={settings.qris_code}
                    onChange={(e) => setSettings({ ...settings, qris_code: e.target.value })}
                    placeholder="Masukkan kode QRIS atau nomor e-wallet"
                  />
                </div>

                <div>
                  <Label htmlFor="qris_image_url">URL Gambar QRIS</Label>
                  <Input
                    id="qris_image_url"
                    value={settings.qris_image_url}
                    onChange={(e) => setSettings({ ...settings, qris_image_url: e.target.value })}
                    placeholder="https://example.com/qris.png"
                  />
                  {settings.qris_image_url && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                      <img 
                        src={settings.qris_image_url} 
                        alt="QRIS Preview" 
                        className="w-48 h-48 border rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
