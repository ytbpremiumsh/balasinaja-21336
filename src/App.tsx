import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Autoreplies from "./pages/Autoreplies";
import AIKnowledge from "./pages/AIKnowledge";
import AIBehavior from "./pages/AIBehavior";
import Contacts from "./pages/Contacts";
import Broadcast from "./pages/Broadcast";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import PaymentVerification from "./pages/admin/PaymentVerification";
import PaymentSettings from "./pages/admin/PaymentSettings";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Subscription from "./pages/Subscription";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/autoreplies" element={<ProtectedRoute><Autoreplies /></ProtectedRoute>} />
          <Route path="/ai-knowledge" element={<ProtectedRoute><AIKnowledge /></ProtectedRoute>} />
          <Route path="/ai-behavior" element={<ProtectedRoute><AIBehavior /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/broadcast" element={<ProtectedRoute><Broadcast /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UserManagement /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/packages" element={<ProtectedRoute><AdminRoute><PackageManagement /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute><AdminRoute><PaymentVerification /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/payment-settings" element={<ProtectedRoute><AdminRoute><PaymentSettings /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute><AdminRoute><ActivityLogs /></AdminRoute></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
