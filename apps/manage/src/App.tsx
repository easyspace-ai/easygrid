import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { useAuthStore } from '@/stores/auth-store'
import luckdb from '@/lib/luckdb'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  const { accessToken, refreshToken } = useAuthStore();

  // Initialize GTM
  // 新 SDK 的 LocalAuthStore 会自动处理 token 持久化，无需手动设置
  useEffect(() => {
    initGTM();
    
    // 如果需要验证认证状态，可以使用 luckdb.auth.getCurrentUser()
    // 但 LocalAuthStore 已经自动从 localStorage 恢复了 token
  }, []);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <SidebarConfigProvider>
          <Router basename={basename}>
            <AppRouter />
          </Router>
        </SidebarConfigProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
