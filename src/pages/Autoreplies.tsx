import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Autoreply {
  id: string;
  trigger: string;
  message_type: string;
  content: string;
  url_image: string | null;
  created_at: string;
}

export default function Autoreplies() {
  const [autoreplies, setAutoreplies] = useState<Autoreply[]>([]);
  const [trigger, setTrigger] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [content, setContent] = useState("");
  const [urlImage, setUrlImage] = useState("");

  useEffect(() => {
    fetchAutoreplies();
  }, []);

  const fetchAutoreplies = async () => {
    const { data, error } = await supabase
      .from("autoreplies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching autoreplies:", error);
    } else {
      setAutoreplies(data || []);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("autoreplies").insert({
      trigger: trigger.trim(),
      message_type: messageType,
      content: content.trim(),
      url_image: urlImage.trim() || null,
    });

    if (error) {
      toast.error("Gagal menambah trigger: " + error.message);
    } else {
      toast.success("Trigger berhasil ditambahkan!");
      setTrigger("");
      setContent("");
      setUrlImage("");
      setMessageType("text");
      fetchAutoreplies();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus trigger ini?")) return;

    const { error } = await supabase.from("autoreplies").delete().eq("id", id);

    if (error) {
      toast.error("Gagal menghapus trigger");
    } else {
      toast.success("Trigger berhasil dihapus");
      fetchAutoreplies();
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Autoreplies
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola trigger kata kunci untuk balasan otomatis
          </p>
        </div>

        {/* Add Form */}
        <Card className="shadow-card gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Tambah Trigger Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="trigger">Trigger (Kata Kunci)</Label>
                  <Input
                    id="trigger"
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    placeholder="contoh: info, halo, promo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="messageType">Tipe Pesan</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="content">Isi Pesan</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Balasan otomatis. Gunakan {NAME} dan {PHONE} untuk personalisasi"
                  rows={3}
                  required
                />
              </div>
              {(messageType === "image" || messageType === "document") && (
                <div>
                  <Label htmlFor="urlImage">URL Media</Label>
                  <Input
                    id="urlImage"
                    type="url"
                    value={urlImage}
                    onChange={(e) => setUrlImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
              <Button type="submit" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Simpan Trigger
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Daftar Triggers ({autoreplies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {autoreplies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada trigger. Tambahkan trigger pertama Anda di atas!
                </div>
              ) : (
                autoreplies.map((ar) => (
                  <div
                    key={ar.id}
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold">
                          {ar.trigger}
                        </code>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {ar.message_type}
                        </span>
                      </div>
                      <p className="text-sm">{ar.content}</p>
                      {ar.url_image && (
                        <a
                          href={ar.url_image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          🔗 Media URL
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ar.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
