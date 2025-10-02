import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Webhook, Bot, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
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

        {/* Webhook Info */}
        <Card className="shadow-card gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhook Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Webhook Endpoint:</p>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-xs block overflow-x-auto">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onesender-webhook`}
                </code>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm">
                <strong>Cara menggunakan:</strong> Daftarkan URL webhook di atas ke OneSender dashboard Anda. 
                Setiap pesan WhatsApp yang masuk akan dikirim ke endpoint ini untuk diproses.
              </p>
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI Provider</p>
                <p className="text-sm text-muted-foreground">Lovable AI Gateway</p>
              </div>
              <Badge className="bg-success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI Model</p>
                <p className="text-sm text-muted-foreground">google/gemini-2.5-flash</p>
              </div>
              <Badge variant="outline">Free</Badge>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Fitur AI:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Balasan otomatis cerdas ketika tidak ada trigger match</li>
                <li>✓ Menggunakan Knowledge Base sebagai konteks</li>
                <li>✓ Respons dalam bahasa Indonesia</li>
                <li>✓ Gratis menggunakan Lovable AI (Gemini models)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* OneSender API */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              OneSender API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">API Configuration</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API URL:</span>
                  <code className="text-xs">api.onesender.id</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <Badge variant="outline">Configured</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <span>10 (Default)</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-muted p-4">
              <p className="text-sm text-muted-foreground">
                API key OneSender telah dikonfigurasi melalui Lovable Cloud secrets. 
                Semua balasan otomatis akan dikirim melalui OneSender API.
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
