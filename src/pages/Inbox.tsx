import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox as InboxIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  message_id: string;
  phone: string;
  name: string | null;
  inbox_type: string | null;
  inbox_message: string | null;
  reply_type: string | null;
  reply_message: string | null;
  status: string | null;
  created_at: string;
}

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "replied_trigger":
        return <Badge className="bg-success">Trigger</Badge>;
      case "replied_ai":
        return <Badge className="bg-primary">AI</Badge>;
      case "no_reply":
        return <Badge variant="outline">No Reply</Badge>;
      default:
        return <Badge variant="secondary">Received</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <InboxIcon className="w-8 h-8 text-primary" />
              Inbox
            </h1>
            <p className="text-muted-foreground mt-2">
              Menampilkan 50 pesan terakhir yang diterima
            </p>
          </div>
          <Button onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Pesan Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Waktu</th>
                    <th className="pb-3 font-medium">Nomor</th>
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Pesan</th>
                    <th className="pb-3 font-medium">Balasan</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada pesan masuk
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 text-sm">
                          {new Date(message.created_at).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 text-sm font-mono">{message.phone}</td>
                        <td className="py-3 text-sm">{message.name || "-"}</td>
                        <td className="py-3 text-sm max-w-xs truncate">
                          {message.inbox_message || "-"}
                        </td>
                        <td className="py-3 text-sm max-w-xs truncate">
                          {message.reply_message || "-"}
                        </td>
                        <td className="py-3">{getStatusBadge(message.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
