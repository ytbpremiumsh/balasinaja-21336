import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, CheckCircle, XCircle, Clock, Eye, Calendar, Image, Video, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BroadcastLog {
  id: string;
  created_at: string;
  message: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  status: string;
  scheduled_at?: string;
  media_type: string;
  media_url?: string;
  categories: {
    name: string;
  };
}

interface QueueItem {
  id: string;
  phone: string;
  name?: string;
  message: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  retry_count: number;
}

export default function BroadcastReport() {
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    fetchLogs();

    // Setup realtime subscription
    const channel = supabase
      .channel('broadcast_logs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'broadcast_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("broadcast_logs")
        .select(`
          *,
          categories(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching broadcast logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueItems = async (logId: string) => {
    try {
      const { data, error } = await supabase
        .from("broadcast_queue")
        .select("*")
        .eq("broadcast_log_id", logId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQueueItems(data || []);
    } catch (error) {
      console.error("Error fetching queue items:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "sent":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {status === "sent" ? "Terkirim" : "Selesai"}
          </Badge>
        );
      case "processing":
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {status === "pending" ? "Antrian" : "Memproses"}
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Dijadwalkan
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Gagal
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <ExpiredUserGuard>
          <div className="flex items-center justify-center min-h-[400px]">
            <p>Loading...</p>
          </div>
        </ExpiredUserGuard>
      </Layout>
    );
  }

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <ScrollText className="w-8 h-8 text-primary" />
              Laporan Broadcast
            </h1>
            <p className="text-muted-foreground mt-2">
              Riwayat dan status pengiriman broadcast
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Riwayat Broadcast (50 Terakhir)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada riwayat broadcast
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold">
                              {log.categories?.name || "Kategori Dihapus"}
                            </span>
                            {getStatusBadge(log.status)}
                            {log.media_type !== "text" && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getMediaIcon(log.media_type)}
                                {log.media_type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {log.scheduled_at ? (
                              <>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Dijadwalkan: {new Date(log.scheduled_at).toLocaleString("id-ID")}
                              </>
                            ) : (
                              <>Dibuat: {new Date(log.created_at).toLocaleString("id-ID")}</>
                            )}
                          </p>
                          <p className="text-sm bg-muted/50 p-2 rounded">
                            {log.message}
                          </p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log.id);
                                fetchQueueItems(log.id);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Detail
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detail Broadcast</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-muted rounded-lg">
                                  <p className="text-2xl font-bold">{log.total_recipients}</p>
                                  <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                  <p className="text-2xl font-bold text-green-500">{log.total_sent}</p>
                                  <p className="text-xs text-muted-foreground">Terkirim</p>
                                </div>
                                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                  <p className="text-2xl font-bold text-red-500">{log.total_failed}</p>
                                  <p className="text-xs text-muted-foreground">Gagal</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold">Detail Per Penerima:</h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                  {queueItems.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                      Loading...
                                    </p>
                                  ) : (
                                    queueItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="p-3 border rounded-lg flex items-center justify-between"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            {item.name || "Tanpa Nama"} - {item.phone}
                                          </p>
                                          {item.error_message && (
                                            <p className="text-xs text-red-500 mt-1">
                                              Error: {item.error_message}
                                            </p>
                                          )}
                                          {item.sent_at && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Terkirim: {new Date(item.sent_at).toLocaleString("id-ID")}
                                            </p>
                                          )}
                                          {item.retry_count > 0 && (
                                            <p className="text-xs text-orange-500 mt-1">
                                              Retry: {item.retry_count}x
                                            </p>
                                          )}
                                        </div>
                                        {getStatusBadge(item.status)}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{log.total_recipients}</p>
                          <p className="text-xs text-muted-foreground">Total Penerima</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-500">
                            {log.total_sent}
                          </p>
                          <p className="text-xs text-muted-foreground">Terkirim</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500">
                            {log.total_failed}
                          </p>
                          <p className="text-xs text-muted-foreground">Gagal</p>
                        </div>
                      </div>

                      {log.total_recipients > 0 && (
                        <div className="pt-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${(log.total_sent / log.total_recipients) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-center mt-1 text-muted-foreground">
                            Tingkat keberhasilan:{" "}
                            {Math.round((log.total_sent / log.total_recipients) * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
