import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";

type Setting = {
  key: string;
  value: string;
};

export default function APIConfiguration() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [onesenderApiUrl, setOnesenderApiUrl] = useState("");
  const [onesenderApiKey, setOnesenderApiKey] = useState("");
  const [aiVendor, setAiVendor] = useState("lovable");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*");

      if (error) throw error;

      const settingsMap = data.reduce((acc: any, setting: Setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      setOnesenderApiUrl(settingsMap.onesender_api_url || "");
      setOnesenderApiKey(settingsMap.onesender_api_key || "");
      setAiVendor(settingsMap.ai_vendor || "lovable");
      setAiApiKey(settingsMap.ai_api_key || "");
      setAiModel(settingsMap.ai_model || "google/gemini-2.5-flash");
      setSystemPrompt(settingsMap.system_prompt || "");
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Gagal memuat pengaturan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const settingsToUpdate = [
        { key: "onesender_api_url", value: onesenderApiUrl },
        { key: "onesender_api_key", value: onesenderApiKey },
        { key: "ai_vendor", value: aiVendor },
        { key: "ai_api_key", value: aiApiKey },
        { key: "ai_model", value: aiModel },
        { key: "system_prompt", value: systemPrompt },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from("settings")
          .upsert({
            user_id: session.user.id,
            key: setting.key,
            value: setting.value,
          }, {
            onConflict: 'user_id,key'
          });

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan API berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Konfigurasi API & AI
          </h1>
          <p className="text-muted-foreground">
            Kelola integrasi API OneSender dan AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>OneSender API</CardTitle>
            <CardDescription>
              Konfigurasi koneksi ke OneSender untuk mengirim pesan WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onesender_url">OneSender API URL</Label>
              <Input
                id="onesender_url"
                placeholder="https://api.onesender.id"
                value={onesenderApiUrl}
                onChange={(e) => setOnesenderApiUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onesender_key">OneSender API Key</Label>
              <Input
                id="onesender_key"
                type="password"
                placeholder="Masukkan API key OneSender"
                value={onesenderApiKey}
                onChange={(e) => setOnesenderApiKey(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>
              Konfigurasi vendor AI dan model yang digunakan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai_vendor">AI Vendor</Label>
              <Select value={aiVendor} onValueChange={setAiVendor}>
                <SelectTrigger id="ai_vendor">
                  <SelectValue placeholder="Pilih vendor AI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">Lovable AI</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiVendor !== "lovable" && (
              <div className="space-y-2">
                <Label htmlFor="ai_key">AI API Key</Label>
                <Input
                  id="ai_key"
                  type="password"
                  placeholder="Masukkan API key AI"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ai_model">AI Model</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger id="ai_model">
                  <SelectValue placeholder="Pilih model AI" />
                </SelectTrigger>
                <SelectContent>
                  {aiVendor === "lovable" && (
                    <>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="openai/gpt-5-nano">GPT-5 Nano</SelectItem>
                      <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                    </>
                  )}
                  {aiVendor === "openai" && (
                    <>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {aiVendor === "anthropic" && (
                    <>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">System Prompt</Label>
              <Textarea
                id="system_prompt"
                placeholder="Masukkan system prompt untuk AI"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                System prompt menentukan perilaku dan karakter AI saat membalas pesan
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
