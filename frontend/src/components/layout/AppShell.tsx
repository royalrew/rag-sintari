import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <Topbar />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
