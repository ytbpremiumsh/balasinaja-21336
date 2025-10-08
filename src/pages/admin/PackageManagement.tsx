import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";

type PackageType = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export default function PackageManagement() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_days: 30,
    price: 0,
    description: '',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('duration_days', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data paket",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingPackage) {
        const { error } = await supabase
          .from('packages')
          .update(formData)
          .eq('id', editingPackage.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Paket berhasil diupdate"
        });
      } else {
        const { error } = await supabase
          .from('packages')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Paket berhasil ditambahkan"
        });
      }

      fetchPackages();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan paket",
        variant: "destructive"
      });
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus paket ini?')) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Paket berhasil dihapus"
      });

      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus paket",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      duration_days: pkg.duration_days,
      price: pkg.price,
      description: pkg.description || '',
      is_active: pkg.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      duration_days: 30,
      price: 0,
      description: '',
      is_active: true
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Paket</h1>
            <p className="text-muted-foreground">
              Kelola paket berlangganan BalasinAja
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Paket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? 'Edit Paket' : 'Tambah Paket Baru'}
                </DialogTitle>
                <DialogDescription>
                  Isi detail paket berlangganan
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Nama Paket</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Bulanan, Tahunan"
                  />
                </div>
                <div>
                  <Label>Durasi (Hari)</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div>
                  <Label>Harga (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min={0}
                  />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi paket"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit}>
                  {editingPackage ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Daftar Paket
            </CardTitle>
            <CardDescription>
              Total {packages.length} paket tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Paket</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.duration_days} hari</TableCell>
                      <TableCell>{formatPrice(pkg.price)}</TableCell>
                      <TableCell>{pkg.description || '-'}</TableCell>
                      <TableCell>
                        {pkg.is_active ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">Aktif</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-500/10">Nonaktif</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(pkg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePackage(pkg.id)}
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
