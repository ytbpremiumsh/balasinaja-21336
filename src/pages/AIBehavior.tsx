import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageSquare, Shield, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AIBehavior() {
  const [aiVendor, setAiVendor] = useState("lovable");
  const [aiModel, setAiModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeCount, setKnowledgeCount] = useState(0);

  useEffect(() => {
    loadAISettings();
    loadKnowledgeCount();
  }, []);

  const loadAISettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*");

      if (error) throw error;

      if (data) {
        const settingsMap = data.reduce((acc: any, setting: any) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});

        setAiVendor(settingsMap.ai_vendor || "lovable");
        setAiModel(settingsMap.ai_model || "google/gemini-2.5-flash");
        setSystemPrompt(settingsMap.system_prompt || "");
      }
    } catch (error: any) {
      console.error("Error loading AI settings:", error);
    }
  };

  const loadKnowledgeCount = async () => {
    try {
      const { count, error } = await supabase
        .from("ai_knowledge_base")
        .select("*", { count: 'exact', head: true });

      if (error) throw error;
      setKnowledgeCount(count || 0);
    } catch (error: any) {
      console.error("Error loading knowledge count:", error);
    }
  };

  const getProviderName = (vendor: string) => {
    switch (vendor) {
      case 'lovable': return 'Lovable AI';
      case 'gemini': return 'Google Gemini';
      case 'openai': return 'OpenAI';
      case 'openrouter': return 'OpenRouter';
      default: return vendor;
    }
  };

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            AI Behavior
          </h1>
          <p className="text-muted-foreground mt-2">
            Transparansi mengenai identitas dan perilaku AI
          </p>
        </div>

        {/* AI Identity */}
        <Card className="shadow-card gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Identitas AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Provider</p>
                <p className="text-lg font-semibold">{getProviderName(aiVendor)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Model</p>
                <p className="text-lg font-semibold">{aiModel || 'google/gemini-2.5-flash'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm">
                <Info className="w-4 h-4 inline mr-2" />
                <strong>AI ini adalah asisten virtual</strong> yang dirancang untuk membantu 
                menjawab pertanyaan pelanggan Anda secara otomatis melalui WhatsApp.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Behavior */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Perilaku Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">System Prompt</p>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {systemPrompt || "Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Knowledge Base: {knowledgeCount} entries
              </Badge>
              <Badge variant="outline">
                Bahasa: Indonesia
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* How AI Works */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Cara Kerja AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Penerimaan Pesan</p>
                  <p className="text-sm text-muted-foreground">
                    AI menerima pesan dari pelanggan melalui webhook OneSender
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Cek Autoreply Trigger</p>
                  <p className="text-sm text-muted-foreground">
                    Sistem mencari trigger yang cocok dengan pesan masuk
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">AI Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Jika tidak ada trigger, AI memproses pesan menggunakan Knowledge Base sebagai konteks
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Kirim Balasan</p>
                  <p className="text-sm text-muted-foreground">
                    Balasan AI dikirim kembali ke pelanggan melalui WhatsApp
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities & Limitations */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Kemampuan AI</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Menjawab pertanyaan berdasarkan Knowledge Base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Memahami konteks percakapan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Respons dalam bahasa Indonesia</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Memberikan jawaban yang konsisten</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Mengikuti perilaku yang ditentukan (System Prompt)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Keterbatasan AI</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>Hanya mengetahui informasi dari Knowledge Base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>Tidak dapat mengakses data real-time atau eksternal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>Tidak dapat melakukan transaksi atau pemesanan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>Respons tergantung kualitas Knowledge Base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>Mungkin salah memahami pertanyaan yang ambigu</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Transparency Note */}
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" />
              Komitmen Transparansi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kami berkomitmen untuk memberikan transparansi penuh mengenai penggunaan AI dalam sistem autoreply ini. 
              AI dirancang untuk membantu bisnis Anda memberikan respons cepat kepada pelanggan, 
              namun tetap memerlukan pengawasan dan update Knowledge Base secara berkala untuk hasil optimal.
              Anda dapat mengubah perilaku AI kapan saja melalui halaman Settings.
            </p>
          </CardContent>
        </Card>
      </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
