import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Upload, Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  categories?: string[];
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [bulkText, setBulkText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
    fetchCategories();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select(`
        *,
        contact_categories(
          categories(name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contacts:", error);
    } else {
      const contactsWithCategories = data?.map((contact: any) => ({
        ...contact,
        categories: contact.contact_categories?.map((cc: any) => cc.categories.name) || []
      })) || [];
      setContacts(contactsWithCategories);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(data || []);
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim() || !selectedCategory) {
      toast({
        title: "Error",
        description: "Pastikan data dan kategori sudah diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const lines = bulkText.trim().split("\n");
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length < 2) continue;

        const [phone, name] = parts;
        
        try {
          // Insert contact
          const { data: contact, error: contactError } = await supabase
            .from("contacts")
            .upsert({ phone, name, user_id: session.user.id }, { onConflict: "phone,user_id" })
            .select("id")
            .single();

          if (contactError) throw contactError;

          // Add to category
          await supabase
            .from("contact_categories")
            .insert({ contact_id: contact.id, category_id: selectedCategory })
            .select()
            .maybeSingle();

          successCount++;
        } catch (error) {
          console.error("Error importing contact:", error);
          errorCount++;
        }
      }

      toast({
        title: "Import Selesai",
        description: `Berhasil: ${successCount}, Gagal: ${errorCount}`,
      });

      setBulkText("");
      setSelectedCategory("");
      setIsDialogOpen(false);
      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddToCategory = async (contactId: string, categoryId: string) => {
    try {
      const { error } = await supabase
        .from("contact_categories")
        .insert({ contact_id: contactId, category_id: categoryId });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Info",
            description: "Kontak sudah ada di kategori ini",
            variant: "default",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Berhasil",
        description: "Kontak berhasil ditambahkan ke kategori",
      });

      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Kontak berhasil dihapus",
      });

      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Contacts
            </h1>
            <p className="text-muted-foreground mt-2">
              Kelola kontak dan kategorikan untuk broadcast
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Import Massal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Kontak Massal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Format: Nomor WA, Nama (satu baris per kontak)</Label>
                  <Textarea
                    placeholder="62812345678, John Doe&#10;62898765432, Jane Smith"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="mt-2 min-h-[200px] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Pilih Kategori</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleBulkImport} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Import Kontak
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Daftar Kontak ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Nomor Telepon</th>
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Kategori</th>
                    <th className="pb-3 font-medium">Ditambahkan</th>
                    <th className="pb-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Belum ada kontak tersimpan
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 font-mono text-sm">{contact.phone}</td>
                        <td className="py-3 text-sm">{contact.name || "-"}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {contact.categories && contact.categories.length > 0 ? (
                              contact.categories.map((cat, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {cat}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(contact.created_at).toLocaleDateString("id-ID")}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(value) => handleAddToCategory(contact.id, value)}>
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue placeholder="+ Kategori" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-3 h-3" />
                                      {cat.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
