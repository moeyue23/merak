import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { client } from '@/client/client.gen';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

client.instance.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveTokens(tokens: { access_token: string; refresh_token: string }) {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    client.instance
      .get('/auth/me')
      .then(res => setUser(res.data.data as User))
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await client.instance.post('/auth/login', { identifier, password });
    const body = res.data as {
      data: { user: User; tokens: { access_token: string; refresh_token: string } };
    };
    saveTokens(body.data.tokens);
    setUser(body.data.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await client.instance.post('/auth/register', { username, email, password });
    const body = res.data as {
      data: { user: User; tokens: { access_token: string; refresh_token: string } };
    };
    saveTokens(body.data.tokens);
    setUser(body.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.instance.post('/auth/logout');
    } catch {
      // Ignore errors — clear locally regardless
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
