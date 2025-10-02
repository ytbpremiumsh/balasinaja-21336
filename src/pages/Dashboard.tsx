import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Inbox, Bot, Users, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    triggeredReplies: 0,
    aiReplies: 0,
    totalContacts: 0,
    totalTriggers: 0,
    totalKnowledge: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [inbox, contacts, triggers, knowledge] = await Promise.all([
      supabase.from("inbox").select("status", { count: "exact" }),
      supabase.from("contacts").select("*", { count: "exact" }),
      supabase.from("autoreplies").select("*", { count: "exact" }),
      supabase.from("ai_knowledge_base").select("*", { count: "exact" }),
    ]);

    const triggeredReplies =
      inbox.data?.filter((m) => m.status === "replied_trigger").length || 0;
    const aiReplies =
      inbox.data?.filter((m) => m.status === "replied_ai").length || 0;

    setStats({
      totalMessages: inbox.count || 0,
      triggeredReplies,
      aiReplies,
      totalContacts: contacts.count || 0,
      totalTriggers: triggers.count || 0,
      totalKnowledge: knowledge.count || 0,
    });
  };

  const statCards = [
    {
      title: "Total Pesan",
      value: stats.totalMessages,
      icon: Inbox,
      description: "Pesan masuk diterima",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Trigger Replies",
      value: stats.triggeredReplies,
      icon: MessageSquare,
      description: "Balasan via trigger",
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "AI Replies",
      value: stats.aiReplies,
      icon: Bot,
      description: "Balasan via AI",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Total Kontak",
      value: stats.totalContacts,
      icon: Users,
      description: "Kontak tersimpan",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Triggers",
      value: stats.totalTriggers,
      icon: TrendingUp,
      description: "Trigger aktif",
      gradient: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Knowledge Base",
      value: stats.totalKnowledge,
      icon: Bot,
      description: "Data AI tersimpan",
      gradient: "from-pink-500 to-pink-600",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Statistik dan overview sistem autoreply WhatsApp
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="gradient-card shadow-card hover:shadow-hover transition-all duration-300 border-0"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Webhook Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Webhook Endpoint:</p>
              <code className="text-xs bg-background rounded px-3 py-2 block overflow-x-auto">
                {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onesender-webhook`}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Daftarkan URL webhook ini di OneSender dashboard Anda untuk mulai menerima pesan.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
