import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText } from "lucide-react";

type ActivityLog = {
  id: string;
  admin_id: string | null;
  action: string;
  target_user_id: string | null;
  details: string | null;
  created_at: string;
  admin_email?: string;
  target_email?: string;
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch related user emails
      const enrichedLogs = await Promise.all(
        (logsData || []).map(async (log) => {
          let admin_email = '';
          let target_email = '';

          if (log.admin_id) {
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', log.admin_id)
              .single();
            admin_email = adminProfile?.email || '';
          }

          if (log.target_user_id) {
            const { data: targetProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', log.target_user_id)
              .single();
            target_email = targetProfile?.email || '';
          }

          return { ...log, admin_email, target_email };
        })
      );

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      extend_subscription: 'Perpanjang Masa Aktif',
      delete_user: 'Hapus User',
      create_user: 'Buat User Baru',
      update_package: 'Update Paket',
      create_package: 'Buat Paket Baru'
    };
    return labels[action] || action;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Log Aktivitas</h1>
          <p className="text-muted-foreground">
            Riwayat aktivitas admin BalasinAja
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Riwayat Aktivitas
            </CardTitle>
            <CardDescription>
              100 aktivitas terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada aktivitas yang tercatat
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>{log.admin_email || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-500">
                          {getActionLabel(log.action)}
                        </span>
                      </TableCell>
                      <TableCell>{log.target_email || '-'}</TableCell>
                      <TableCell>{log.details || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
