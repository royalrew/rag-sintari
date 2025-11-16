import { createContext, useContext, useState, ReactNode } from 'react';
import { mockWorkspaces, Workspace } from '@/lib/mockData';

interface AppContextType {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  workspaces: Workspace[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    mockWorkspaces[0]
  );
  const [workspaces] = useState<Workspace[]>(mockWorkspaces);

  return (
    <AppContext.Provider value={{ currentWorkspace, setCurrentWorkspace, workspaces }}>
      {children}
    </AppContext.Provider>
  );
};
