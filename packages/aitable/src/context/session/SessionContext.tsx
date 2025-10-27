import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { ApiClient } from '../../api/client';

interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ICredentials {
  email: string;
  password: string;
}

interface ISessionContext {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (credentials: ICredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<IUser>) => void;
}

const SessionContext = createContext<ISessionContext | null>(null);

export function SessionProvider({ 
  children,
  apiClient 
}: { 
  children: ReactNode;
  apiClient?: ApiClient;
}) {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    // 从 localStorage 恢复 token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  });

  const signIn = useCallback(async (credentials: ICredentials) => {
    try {
      // 调用 API 登录
      if (apiClient) {
        // TODO: 实现实际的登录 API 调用
        // const response = await apiClient.auth.login(credentials);
        // setUser(response.user);
        // setToken(response.token);
        // localStorage.setItem('auth_token', response.token);
      }
      
      // Mock implementation
      const mockUser: IUser = {
        id: '1',
        name: 'Test User',
        email: credentials.email,
      };
      const mockToken = 'mock-token-' + Date.now();
      
      setUser(mockUser);
      setToken(mockToken);
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, [apiClient]);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  const updateUser = useCallback((userData: Partial<IUser>) => {
    setUser(prev => {
      if (!prev) {return null;}
      const updated = { ...prev, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 恢复用户信息
  useEffect(() => {
    if (token && !user && typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
  }, [token, user]);

  return (
    <SessionContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      signIn,
      signOut,
      updateUser,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}


