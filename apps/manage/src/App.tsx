import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { useAuthStore } from '@/stores/auth-store'
import luckdb, { authStore as luckdbAuthStore } from '@/lib/luckdb'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  const { accessToken, user } = useAuthStore();

  // Initialize GTM and restore SDK tokens on app load
  useEffect(() => {
    initGTM();
    
    // 恢复 token 到 SDK（新版使用 authStore）
    if (accessToken && user) {
      luckdbAuthStore.save(accessToken, user);
    }
  }, [accessToken, user]);

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
