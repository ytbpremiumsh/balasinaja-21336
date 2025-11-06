import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, Inbox, Bot, Users, Sparkles, Brain, Shield, UserCog, Package, ScrollText, CreditCard, Bell, Radio, BellDot, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: Sparkles },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Autoreplies", href: "/autoreplies", icon: MessageSquare },
  { name: "AI Knowledge", href: "/ai-knowledge", icon: Bot },
  { name: "AI Behavior", href: "/ai-behavior", icon: Brain },
  { name: "Contacts", href: "/contacts", icon: Users },
];

const broadcastNavigation = [
  { name: "Broadcast", href: "/broadcast", icon: Radio },
  { name: "Laporan Broadcast", href: "/broadcast-report", icon: ScrollText },
];

const adminNavigation = [
  { name: "Dashboard Admin", href: "/admin", icon: Shield, badge: 0 },
  { name: "Manajemen User", href: "/admin/users", icon: UserCog, badge: 0 },
  { name: "Manajemen Paket", href: "/admin/packages", icon: Package, badge: 0 },
  { name: "Verifikasi Pembayaran", href: "/admin/payments", icon: Bell, badge: 0 },
  { name: "Pengaturan Pembayaran", href: "/admin/payment-settings", icon: CreditCard, badge: 0 },
  { name: "Notifikasi WhatsApp", href: "/admin/whatsapp-notifications", icon: MessageSquare, badge: 0 },
  { name: "Log Aktivitas", href: "/admin/logs", icon: ScrollText, badge: 0 },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [navigation, setNavigation] = useState(userNavigation);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [newUsersCount, setNewUsersCount] = useState(0);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const hasAdminRole = !!roles;
        setIsAdmin(hasAdminRole);
        
        // Set navigation based on role
        if (hasAdminRole) {
          fetchPendingPayments();
          fetchNewUsers();
          
          // Update navigation with badges
          const updatedAdminNav = adminNavigation.map(item => {
            if (item.href === "/admin/users") {
              return { ...item, badge: newUsersCount };
            }
            if (item.href === "/admin/payments") {
              return { ...item, badge: pendingPayments };
            }
            return item;
          });
          
          setNavigation([...updatedAdminNav, ...userNavigation]);
        } else {
          setNavigation(userNavigation);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
      }
    };

    checkAdminRole();
    fetchUnreadNotifications();
  }, []);

  useEffect(() => {
    const channels = [];
    
    if (isAdmin) {
      // Setup realtime subscription for payment updates
      const paymentChannel = supabase
        .channel('payment_notifications')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'payment_proofs' },
          () => {
            fetchPendingPayments();
          }
        )
        .subscribe();
      channels.push(paymentChannel);
    }

    // Setup realtime subscription for user notifications
    const notificationChannel = supabase
      .channel('user_notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();
    channels.push(notificationChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAdmin]);

  const fetchPendingPayments = async () => {
    const { count } = await supabase
      .from('payment_proofs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    setPendingPayments(count || 0);
  };

  const fetchUnreadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    
    setUnreadNotifications(count || 0);
  };

  const fetchNewUsers = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());
    
    setNewUsersCount(count || 0);
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              BalasinAja {isAdmin && <span className="text-sm text-muted-foreground">(Admin)</span>}
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link 
              to="/subscription"
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                location.pathname === "/subscription"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Package className="w-4 h-4" />
              Langganan
            </Link>
            <Link 
              to="/api-configuration"
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                location.pathname === "/api-configuration"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings2 className="w-4 h-4" />
              Konfigurasi API
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/notifications")}
              className="flex items-center gap-2 relative"
            >
              <BellDot className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2">
            {navigation.map((item: any) => {
              const isActive = location.pathname === item.href;
              const showBadge = item.badge && item.badge > 0;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {showBadge && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
            
            {/* Broadcast Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                    (location.pathname === "/broadcast" || location.pathname === "/broadcast-report")
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Radio className="w-4 h-4" />
                  Broadcast
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {broadcastNavigation.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link
                      to={item.href}
                      className="flex items-center gap-2 w-full cursor-pointer"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          BalasinAja Dashboard © {new Date().getFullYear()} - WhatsApp AI Autoreply System
        </div>
      </footer>
    </div>
  );
};
