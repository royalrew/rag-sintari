import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import * as authApi from '@/api/auth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('dokument-ai-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await authApi.login({ email, password });
    setUser(user);
    localStorage.setItem('dokument-ai-user', JSON.stringify(user));
    navigate(routes.app.overview);
  };

  const register = async (name: string, email: string, password: string) => {
    const { user } = await authApi.register({ name, email, password });
    setUser(user);
    localStorage.setItem('dokument-ai-user', JSON.stringify(user));
    navigate(routes.app.overview);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    localStorage.removeItem('dokument-ai-user');
    navigate(routes.home);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
