import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, Clock, TrendingUp } from "lucide-react";
import logo from "@/assets/BalasinAja.png";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    trialUsers: 0,
    expiredUsers: 0
  });

  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active users (not expired)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('expire_at.is.null,expire_at.gt.now()');

      // Trial users
      const { count: trialUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'trial');

      // Expired users
      const { count: expiredUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('expire_at', new Date().toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        trialUsers: trialUsers || 0,
        expiredUsers: expiredUsers || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      title: "Total User",
      value: stats.totalUsers,
      description: "Semua user terdaftar",
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "User Aktif",
      value: stats.activeUsers,
      description: "User dengan masa aktif",
      icon: UserCheck,
      color: "text-green-500"
    },
    {
      title: "User Trial",
      value: stats.trialUsers,
      description: "User dalam masa trial",
      icon: Clock,
      color: "text-yellow-500"
    },
    {
      title: "User Expired",
      value: stats.expiredUsers,
      description: "User masa aktif habis",
      icon: UserX,
      color: "text-red-500"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-muted-foreground">
              Kelola user dan pantau statistik sistem BalasinAja
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tingkat Pertumbuhan User
            </CardTitle>
            <CardDescription>
              Statistik pertumbuhan user BalasinAja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalUsers > 0 ? 
                `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%` : 
                '0%'
              }
            </div>
            <p className="text-sm text-muted-foreground">
              User aktif dari total {stats.totalUsers} user terdaftar
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
