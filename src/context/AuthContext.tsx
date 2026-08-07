import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  userRole: number;
  roleName?: string;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: Omit<User, 'token'>, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

const AUTH_KEY = '@jwellery_auth';
const GUEST_CART_KEY = '@jwellery_guest_cart';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw) as { user: User; token: string };
          setUser(parsed.user);
          setToken(parsed.token);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (u: Omit<User, 'token'>, t: string) => {
    setUser({ ...u, token: t });
    setToken(t);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user: { ...u, token: t }, token: t }));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(GUEST_CART_KEY);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token,
      login,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
