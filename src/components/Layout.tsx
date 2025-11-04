import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, Inbox, Bot, Users, Settings, Sparkles, LogOut, Brain, Shield, UserCog, Package, ScrollText, CreditCard, Bell, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const userNavigation = [
  { name: "Dashboard", href: "/", icon: Sparkles },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Autoreplies", href: "/autoreplies", icon: MessageSquare },
  { name: "AI Knowledge", href: "/ai-knowledge", icon: Bot },
  { name: "AI Behavior", href: "/ai-behavior", icon: Brain },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Broadcast", href: "/broadcast", icon: MessageSquare },
];

const adminNavigation = [
  { name: "Dashboard Admin", href: "/admin", icon: Shield },
  { name: "Manajemen User", href: "/admin/users", icon: UserCog },
  { name: "Manajemen Paket", href: "/admin/packages", icon: Package },
  { name: "Verifikasi Pembayaran", href: "/admin/payments", icon: Bell },
  { name: "Pengaturan Pembayaran", href: "/admin/payment-settings", icon: CreditCard },
  { name: "Log Aktivitas", href: "/admin/logs", icon: ScrollText },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [navigation, setNavigation] = useState(userNavigation);

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
          setNavigation([...adminNavigation, ...userNavigation]);
        } else {
          setNavigation(userNavigation);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
      }
    };

    checkAdminRole();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout");
    } else {
      toast.success("Berhasil logout");
      navigate("/auth");
    }
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
              to="/settings"
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                location.pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
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
