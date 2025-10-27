import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type Language = 'zh-CN' | 'en-US';

interface IAppContext {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<IAppContext | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_theme') as Theme) || 'light';
    }
    return 'light';
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_language') as Language) || 'zh-CN';
    }
    return 'zh-CN';
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('app_language', newLanguage);
  };

  // 应用主题到 document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const effectiveTheme = theme === 'auto' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{
      theme,
      language,
      setTheme,
      setLanguage,
      isLoading,
      setIsLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}


