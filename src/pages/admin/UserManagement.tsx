import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Calendar, Trash2 } from "lucide-react";

type UserProfile = {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  status: string;
  plan: string;
  expire_at: string | null;
  created_at: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extendUserSubscription = async () => {
    try {
      const user = users.find(u => u.user_id === selectedUserId);
      if (!user) return;

      const currentExpire = user.expire_at ? new Date(user.expire_at) : new Date();
      const newExpire = new Date(currentExpire.getTime() + extendDays * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          expire_at: newExpire.toISOString(),
          status: 'active'
        })
        .eq('user_id', selectedUserId);

      if (error) throw error;

      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      await supabase
        .from('activity_logs')
        .insert({
          admin_id: session?.user.id,
          action: 'extend_subscription',
          target_user_id: selectedUserId,
          details: `Memperpanjang masa aktif selama ${extendDays} hari`
        });

      toast({
        title: "Berhasil",
        description: `Masa aktif user diperpanjang ${extendDays} hari`
      });

      fetchUsers();
      setSelectedUserId("");
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast({
        title: "Error",
        description: "Gagal memperpanjang masa aktif",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      await supabase
        .from('activity_logs')
        .insert({
          admin_id: session?.user.id,
          action: 'delete_user',
          target_user_id: userId,
          details: 'Menghapus user dari sistem'
        });

      toast({
        title: "Berhasil",
        description: "User berhasil dihapus"
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus user",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getStatusBadge = (expireAt: string | null, status: string) => {
    if (!expireAt) return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/10">Unknown</span>;
    
    const isExpired = new Date(expireAt) < new Date();
    if (isExpired) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-500">Expired</span>;
    }
    
    if (status === 'trial') {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-500">Trial</span>;
    }
    
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">Aktif</span>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manajemen User</h1>
            <p className="text-muted-foreground">
              Kelola user BalasinAja dan masa aktif mereka
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar User</CardTitle>
            <CardDescription>
              Total {users.length} user terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tgl Daftar</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.whatsapp_number || user.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(user.expire_at, user.status)}</TableCell>
                      <TableCell className="capitalize">{user.plan || 'trial'}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>{formatDate(user.expire_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedUserId(user.user_id)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Perpanjang Masa Aktif</DialogTitle>
                                <DialogDescription>
                                  Perpanjang masa aktif untuk {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Tambah Durasi (Hari)</Label>
                                  <Input
                                    type="number"
                                    value={extendDays}
                                    onChange={(e) => setExtendDays(parseInt(e.target.value))}
                                    min={1}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={extendUserSubscription}>
                                  Perpanjang
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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
