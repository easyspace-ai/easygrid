import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import luckdb from "@/lib/luckdb";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { accessToken, refreshToken, isAuthenticated } = useAuthStore();

  // 恢复 token 到 SDK - 解决刷新页面后的问题
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('🔄 恢复 token 到 SDK:', accessToken.substring(0, 20) + '...');
      luckdb.setAccessToken(accessToken);
      
      if (refreshToken) {
        luckdb.setRefreshToken(refreshToken);
      }
    }
  }, [isAuthenticated, accessToken, refreshToken]);

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
