import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Image, Video, File as FileIcon } from "lucide-react";

interface Template {
  id: string;
  name: string;
  message: string;
  media_type: string;
  media_url?: string;
  created_at: string;
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [mediaUrl, setMediaUrl] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("broadcast_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) {
      toast({
        title: "Error",
        description: "Nama dan pesan template harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("broadcast_templates").insert({
        user_id: user.id,
        name: templateName,
        message: templateMessage,
        media_type: mediaType,
        media_url: mediaUrl || null,
      });

      if (error) throw error;

      toast({
        title: "Sukses!",
        description: "Template berhasil disimpan",
      });

      setTemplateName("");
      setTemplateMessage("");
      setMediaType("text");
      setMediaUrl("");
      setDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Yakin ingin menghapus template ini?")) return;

    try {
      const { error } = await supabase
        .from("broadcast_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sukses!",
        description: "Template berhasil dihapus",
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "document":
        return <FileIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Template Library
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Buat Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Template Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Template</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Contoh: Promo Ramadan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipe Media</Label>
                  <Select value={mediaType} onValueChange={setMediaType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {mediaType !== "text" && (
                  <div className="space-y-2">
                    <Label>URL Media</Label>
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Pesan Template</Label>
                  <Textarea
                    value={templateMessage}
                    onChange={(e) => setTemplateMessage(e.target.value)}
                    placeholder="Gunakan {{nama}}, {{tanggal}}, {{phone}} untuk personalisasi"
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variabel: {'{{nama}}'}, {'{{tanggal}}'}, {'{{phone}}'}
                  </p>
                </div>
                <Button onClick={saveTemplate} className="w-full">
                  Simpan Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Belum ada template. Buat template untuk mempercepat broadcast.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getMediaIcon(template.media_type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {template.message}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Gunakan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTemplate(template.id)}
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
  );
}