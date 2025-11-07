import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, CheckCircle, XCircle, Clock, Eye, Calendar, Image, Video, FileText, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const [sendingNow, setSendingNow] = useState<string | null>(null);
  const { toast } = useToast();

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

  const sendNow = async (logId: string) => {
    setSendingNow(logId);
    try {
      // Update broadcast log to processing and remove scheduled_at
      const { error: updateError } = await supabase
        .from("broadcast_logs")
        .update({ 
          status: "processing",
          scheduled_at: null 
        })
        .eq("id", logId);

      if (updateError) throw updateError;

      // Update all queue items to pending and remove scheduled_at
      const { error: queueError } = await supabase
        .from("broadcast_queue")
        .update({ 
          status: "pending",
          scheduled_at: null 
        })
        .eq("broadcast_log_id", logId)
        .eq("status", "scheduled");

      if (queueError) throw queueError;

      toast({
        title: "Memproses",
        description: "Sedang mengirim broadcast...",
      });

      // Call edge function to process immediately
      const { data, error: invokeError } = await supabase.functions.invoke(
        "process-scheduled-broadcasts",
        {
          body: { logId }
        }
      );

      if (invokeError) {
        console.error("Error invoking edge function:", invokeError);
      }

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh the logs to show updated status
      await fetchLogs();

      toast({
        title: "Berhasil",
        description: "Broadcast sedang diproses dan dikirim",
      });
    } catch (error) {
      console.error("Error sending now:", error);
      toast({
        title: "Error",
        description: "Gagal mengirim broadcast",
        variant: "destructive",
      });
    } finally {
      setSendingNow(null);
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
        <div className="space-y-4 sm:space-y-6 animate-fade-in px-4 sm:px-0">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <ScrollText className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              Laporan Broadcast
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
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
                      className="p-3 sm:p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm sm:text-base font-semibold truncate">
                              {log.categories?.name || "Kategori Dihapus"}
                            </span>
                            {getStatusBadge(log.status)}
                            {log.media_type !== "text" && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                {getMediaIcon(log.media_type)}
                                <span className="hidden sm:inline">{log.media_type}</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            {log.scheduled_at ? (
                              <>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Dijadwalkan: {new Date(log.scheduled_at).toLocaleString("id-ID", { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                              </>
                            ) : (
                              <>Dibuat: {new Date(log.created_at).toLocaleString("id-ID", { 
                                dateStyle: 'short', 
                                timeStyle: 'short' 
                              })}</>
                            )}
                          </p>
                          <p className="text-xs sm:text-sm bg-muted/50 p-2 rounded break-words">
                            {log.message}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          {log.status === "scheduled" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => sendNow(log.id)}
                              disabled={sendingNow === log.id}
                              className="flex-1 sm:flex-none text-xs sm:text-sm"
                            >
                              {sendingNow === log.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                                  <span className="hidden sm:inline">Mengirim...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Kirim Sekarang</span>
                                  <span className="sm:hidden">Kirim</span>
                                </>
                              )}
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedLog(log.id);
                                  fetchQueueItems(log.id);
                                }}
                                className="flex-1 sm:flex-none text-xs sm:text-sm"
                              >
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                Detail
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-base sm:text-lg">Detail Broadcast</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                  <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                                    <p className="text-lg sm:text-2xl font-bold">{log.total_recipients}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                                  </div>
                                  <div className="text-center p-2 sm:p-3 bg-green-500/10 rounded-lg">
                                    <p className="text-lg sm:text-2xl font-bold text-green-500">{log.total_sent}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Terkirim</p>
                                  </div>
                                  <div className="text-center p-2 sm:p-3 bg-red-500/10 rounded-lg">
                                    <p className="text-lg sm:text-2xl font-bold text-red-500">{log.total_failed}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Gagal</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <h4 className="text-sm sm:text-base font-semibold">Detail Per Penerima:</h4>
                                  <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                                    {queueItems.length === 0 ? (
                                      <p className="text-center text-muted-foreground py-4 text-sm">
                                        Loading...
                                      </p>
                                    ) : (
                                      queueItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="p-2 sm:p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm font-medium break-words">
                                              {item.name || "Tanpa Nama"} - {item.phone}
                                            </p>
                                            {item.error_message && (
                                              <p className="text-[10px] sm:text-xs text-red-500 mt-1 break-words">
                                                Error: {item.error_message}
                                              </p>
                                            )}
                                            {item.sent_at && (
                                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                                Terkirim: {new Date(item.sent_at).toLocaleString("id-ID", {
                                                  dateStyle: 'short',
                                                  timeStyle: 'short'
                                                })}
                                              </p>
                                            )}
                                            {item.retry_count > 0 && (
                                              <p className="text-[10px] sm:text-xs text-orange-500 mt-1">
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
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-lg sm:text-2xl font-bold">{log.total_recipients}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Penerima</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg sm:text-2xl font-bold text-green-500">
                            {log.total_sent}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Terkirim</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg sm:text-2xl font-bold text-red-500">
                            {log.total_failed}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Gagal</p>
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
