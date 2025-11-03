import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import luckdb, { authStore as luckdbAuthStore } from "@/lib/luckdb";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { accessToken, user, isAuthenticated } = useAuthStore();

  // 恢复 token 到 SDK - 解决刷新页面后的问题（新版 SDK 使用 authStore.save()）
  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      console.log('🔄 恢复 token 到 SDK:', accessToken.substring(0, 20) + '...');
      // 将 User 转换为 AuthRecord 格式
      const authRecord = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        created: user.createdAt,
        updated: user.updatedAt,
      };
      luckdbAuthStore.save(accessToken, authRecord);
    }
  }, [isAuthenticated, accessToken, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
