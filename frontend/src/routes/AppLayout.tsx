import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { routes } from '@/lib/routes';

export const AppLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={routes.login} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};
