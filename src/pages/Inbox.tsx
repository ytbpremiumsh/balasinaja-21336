import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ExpiredUserGuard } from "@/components/ExpiredUserGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox as InboxIcon, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

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
  category_id: string | null;
  categories: Category | null;
}

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchMessages();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    let query = supabase
      .from("inbox")
      .select("*, categories(id, name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    const { data, error } = await query;

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
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Trigger</Badge>;
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
      <ExpiredUserGuard>
        <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <InboxIcon className="w-8 h-8 text-primary" />
              Inbox
            </h1>
            <p className="text-muted-foreground mt-2">
              Menampilkan 50 pesan terakhir yang diterima
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchMessages} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {messages.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                Belum ada pesan masuk
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="shadow-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {new Date(message.created_at).toLocaleString("id-ID", {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {message.categories && (
                          <Badge variant="outline" className="bg-primary/10">
                            {message.categories.name}
                          </Badge>
                        )}
                        {getStatusBadge(message.status)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Nomor</p>
                      <p className="font-mono font-medium">{message.phone}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Nama</p>
                      <p className="font-medium">{message.name || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Pesan Masuk</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-md">
                        {message.inbox_message || "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Balasan</p>
                      <p className="text-sm bg-primary/5 p-3 rounded-md">
                        {message.reply_message || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        </div>
      </ExpiredUserGuard>
    </Layout>
  );
}
