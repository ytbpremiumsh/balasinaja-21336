import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Plus, Trash2, Edit, Users, Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Contact {
  id: string;
  phone: string;
  name: string;
}

interface ContactCategory {
  id: string;
  category_id: string;
  contact_id: string;
  contacts: Contact;
}

export default function Broadcast() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  
  // Category dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  
  // Manage contacts dialog states
  const [manageContactsDialogOpen, setManageContactsDialogOpen] = useState(false);
  const [selectedCategoryForManage, setSelectedCategoryForManage] = useState<string>("");
  const [categoryContacts, setCategoryContacts] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
    loadContacts();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Error",
        description: "Nama kategori harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: categoryName,
        description: categoryDescription,
      });

      if (error) throw error;

      toast({
        title: "Sukses!",
        description: "Kategori berhasil dibuat",
      });

      setCategoryName("");
      setCategoryDescription("");
      setCategoryDialogOpen(false);
      loadCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sukses!",
        description: "Kategori berhasil dihapus",
      });

      loadCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadCategoryContacts = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("contact_categories")
        .select("contact_id")
        .eq("category_id", categoryId);

      if (error) throw error;

      setCategoryContacts(data?.map((cc) => cc.contact_id) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openManageContactsDialog = (categoryId: string) => {
    setSelectedCategoryForManage(categoryId);
    loadCategoryContacts(categoryId);
    setManageContactsDialogOpen(true);
  };

  const toggleContactInCategory = async (contactId: string, checked: boolean) => {
    try {
      if (checked) {
        const { error } = await supabase.from("contact_categories").insert({
          category_id: selectedCategoryForManage,
          contact_id: contactId,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contact_categories")
          .delete()
          .eq("category_id", selectedCategoryForManage)
          .eq("contact_id", contactId);

        if (error) throw error;
      }

      loadCategoryContacts(selectedCategoryForManage);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendBroadcast = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Pilih kategori terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Pesan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get contacts in category
      const { data: contactCategories, error: ccError } = await supabase
        .from("contact_categories")
        .select("contacts(*)")
        .eq("category_id", selectedCategory);

      if (ccError) throw ccError;

      const recipients = contactCategories?.map((cc: any) => cc.contacts.phone) || [];

      if (recipients.length === 0) {
        toast({
          title: "Error",
          description: "Tidak ada kontak di kategori ini",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call edge function to send broadcast
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: {
          recipients,
          message,
          category_id: selectedCategory,
        },
      });

      if (error) throw error;

      toast({
        title: "Broadcast Terkirim!",
        description: `Pesan berhasil dikirim ke ${recipients.length} kontak`,
      });

      setMessage("");
      setSelectedCategory("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Radio className="w-8 h-8 text-primary" />
              Broadcast
            </h1>
            <p className="text-muted-foreground mt-2">
              Kirim pesan ke banyak kontak sekaligus berdasarkan kategori
            </p>
          </div>

          {/* Categories Management */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Kategori Kontak
                </span>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Kategori
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buat Kategori Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="category-name">Nama Kategori</Label>
                        <Input
                          id="category-name"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Contoh: Pelanggan VIP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category-desc">Deskripsi (Opsional)</Label>
                        <Textarea
                          id="category-desc"
                          value={categoryDescription}
                          onChange={(e) => setCategoryDescription(e.target.value)}
                          placeholder="Deskripsi kategori..."
                        />
                      </div>
                      <Button onClick={createCategory} className="w-full">
                        Simpan Kategori
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Belum ada kategori. Buat kategori untuk memulai broadcast.
                </p>
              ) : (
                <div className="grid gap-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManageContactsDialog(category.id)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Kelola Kontak
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Broadcast Form */}
          <Card className="shadow-card gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Kirim Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-select">Pilih Kategori</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-message">Pesan Broadcast</Label>
                <Textarea
                  id="broadcast-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tulis pesan yang akan dikirim ke semua kontak dalam kategori..."
                  className="min-h-[150px]"
                />
              </div>

              <Button
                onClick={sendBroadcast}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Mengirim..." : "Kirim Broadcast"}
              </Button>
            </CardContent>
          </Card>

          {/* Manage Contacts Dialog */}
          <Dialog
            open={manageContactsDialogOpen}
            onOpenChange={setManageContactsDialogOpen}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Kelola Kontak Kategori</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Tidak ada kontak tersedia
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{contact.name || "Tanpa Nama"}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                      <Checkbox
                        checked={categoryContacts.includes(contact.id)}
                        onCheckedChange={(checked) =>
                          toggleContactInCategory(contact.id, checked as boolean)
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
