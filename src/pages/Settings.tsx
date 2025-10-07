import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Webhook, Bot, Zap, Save, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SettingRow {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  // Settings state
  const [onesenderApiUrl, setOnesenderApiUrl] = useState("");
  const [onesenderApiKey, setOnesenderApiKey] = useState("");
  const [aiVendor, setAiVendor] = useState("lovable");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings" as any)
        .select("*");

      if (error) throw error;

      if (data) {
        const settingsMap = (data as any[]).reduce((acc: any, setting: any) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});

        setOnesenderApiUrl(settingsMap.onesender_api_url || "");
        setOnesenderApiKey(settingsMap.onesender_api_key || "");
        setAiVendor(settingsMap.ai_vendor || "lovable");
        setAiApiKey(settingsMap.ai_api_key || "");
        setAiModel(settingsMap.ai_model || "");
        setSystemPrompt(settingsMap.system_prompt || "");
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates = [
        { key: "onesender_api_url", value: onesenderApiUrl },
        { key: "onesender_api_key", value: onesenderApiKey },
        { key: "ai_vendor", value: aiVendor },
        { key: "ai_api_key", value: aiApiKey },
        { key: "ai_model", value: aiModel },
        { key: "system_prompt", value: systemPrompt },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("settings" as any)
          .upsert(
            { 
              user_id: user.id, 
              key: update.key, 
              value: update.value, 
              updated_at: new Date().toISOString() 
            } as any,
            { onConflict: 'user_id,key' }
          );

        if (error) throw error;
      }

      toast({
        title: "Settings saved!",
        description: "Pengaturan berhasil disimpan.",
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

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Password baru dan konfirmasi harus sama.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password terlalu pendek",
        description: "Password minimal 6 karakter.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password berhasil diubah!",
        description: "Password Anda telah diperbarui.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Konfigurasi dan informasi sistem
          </p>
        </div>

        {/* OneSender API Configuration */}
        <Card className="shadow-card gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              OneSender API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id="api-url"
                value={onesenderApiUrl}
                onChange={(e) => setOnesenderApiUrl(e.target.value)}
                placeholder="http://194.127.192.254:3002/api/v1/messages"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={onesenderApiKey}
                onChange={(e) => setOnesenderApiKey(e.target.value)}
                placeholder="Your OneSender API Key"
              />
            </div>
            <Button onClick={saveSettings} disabled={loading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan Pengaturan OneSender"}
            </Button>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-vendor">AI Provider</Label>
              <select
                id="ai-vendor"
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                value={aiVendor}
                onChange={(e) => setAiVendor(e.target.value)}
              >
                <option value="lovable">Lovable AI (Free - Gemini & GPT-5)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            {aiVendor !== 'lovable' && (
              <div className="space-y-2">
                <Label htmlFor="ai-api-key">AI API Key</Label>
                <Input
                  id="ai-api-key"
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Your AI API Key"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ai-model">AI Model</Label>
              <Input
                id="ai-model"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder={
                  aiVendor === 'lovable' ? 'google/gemini-2.5-flash' :
                  aiVendor === 'gemini' ? 'gemini-2.5-flash' :
                  aiVendor === 'openai' ? 'gpt-4o-mini' :
                  'auto'
                }
              />
              <p className="text-xs text-muted-foreground">
                {aiVendor === 'lovable' && 'Model: google/gemini-2.5-flash, google/gemini-2.5-pro, openai/gpt-5, openai/gpt-5-mini'}
                {aiVendor === 'gemini' && 'Model: gemini-2.5-flash, gemini-2.5-pro'}
                {aiVendor === 'openai' && 'Model: gpt-4o, gpt-4o-mini, gpt-4-turbo'}
                {aiVendor === 'openrouter' && 'Model: auto atau model spesifik dari OpenRouter'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt (AI Behavior)</Label>
              <textarea
                id="system-prompt"
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional."
              />
              <p className="text-xs text-muted-foreground">
                Tentukan perilaku dan karakter AI dalam menjawab pertanyaan pelanggan. 
                Untuk melihat transparansi lengkap AI, kunjungi halaman <Link to="/ai-behavior" className="text-primary hover:underline">AI Behavior</Link>.
              </p>
            </div>

            <Button onClick={saveSettings} disabled={loading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan Pengaturan AI"}
            </Button>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Fitur AI:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Balasan otomatis cerdas ketika tidak ada trigger match</li>
                <li>✓ Menggunakan Knowledge Base sebagai konteks</li>
                <li>✓ Respons dalam bahasa Indonesia</li>
                <li>✓ {aiVendor === 'lovable' ? 'Gratis menggunakan Lovable AI' : `Custom ${aiVendor} integration`}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Ubah Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi password baru"
              />
            </div>
            <Button onClick={changePassword} disabled={loadingPassword} className="w-full">
              <Key className="w-4 h-4 mr-2" />
              {loadingPassword ? "Mengubah..." : "Ubah Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhook Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Webhook Endpoint (User-Specific):</p>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-xs block overflow-x-auto break-all">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onesender-webhook?user_id=YOUR_USER_ID`}
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ganti YOUR_USER_ID dengan user ID Anda dari dashboard
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm">
                <strong>Cara menggunakan:</strong> Daftarkan URL webhook di atas ke OneSender dashboard Anda. 
                Setiap pesan WhatsApp yang masuk akan dikirim ke endpoint ini untuk diproses.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-medium">Lovable Cloud (PostgreSQL)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Backend:</span>
                <span className="font-medium">Supabase Edge Functions</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-success">Online</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
