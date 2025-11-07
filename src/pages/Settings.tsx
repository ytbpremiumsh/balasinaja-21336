import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User as UserIcon, Key } from "lucide-react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("name, whatsapp_number")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      setBusinessName(data?.name || "");
      setWhatsappNumber(data?.whatsapp_number || "");
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: businessName,
          whatsapp_number: whatsappNumber,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Profil berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserIcon className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Kelola informasi bisnis dan profil Anda
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Bisnis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nama Bisnis</Label>
                <Input
                  id="business_name"
                  placeholder="Masukkan nama bisnis"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_business">No WhatsApp Bisnis</Label>
                <Input
                  id="whatsapp_business"
                  placeholder="628123456789"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>
                Kelola password dan keamanan akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPasswordDialog(true)} variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Ubah Password
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>

        <ChangePasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
        />
      </ExpiredUserGuard>
    </Layout>
  );
}
