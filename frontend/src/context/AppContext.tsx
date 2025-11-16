import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockWorkspaces, Workspace } from '@/lib/mockData';
import { listWorkspaces } from '@/api/workspaces';

interface AppContextType {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  workspaces: Workspace[];
  refreshWorkspaces: () => Promise<void>;
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
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const loadWorkspaces = async (): Promise<Workspace[]> => {
    const loaded = await listWorkspaces();
    // Ensure "default" workspace exists
    const hasDefault = loaded.some(w => w.id === 'default' || w.name.toLowerCase() === 'default');
    if (!hasDefault && loaded.length === 0) {
      // Create default workspace if none exist
      const defaultWs: Workspace = {
        id: 'default',
        name: 'default',
        description: 'Standard arbetsyta',
        icon: '📁',
        documentCount: 0,
        lastActive: new Date().toISOString().split('T')[0],
      };
      loaded.push(defaultWs);
      // Save to localStorage
      try {
        const key = 'dokument-ai-workspaces';
        localStorage.setItem(key, JSON.stringify(loaded));
      } catch {}
    }
    setWorkspaces(loaded);
    return loaded;
  };

  useEffect(() => {
    // Load saved workspace selection
    const savedId = localStorage.getItem('dokument-ai-current-workspace');
    loadWorkspaces().then((loaded) => {
      if (savedId) {
        const saved = loaded.find(w => w.id === savedId);
        if (saved) {
          setCurrentWorkspace(saved);
        } else if (loaded.length > 0) {
          // Fallback to default or first workspace
          const defaultWs = loaded.find(w => w.id === 'default' || w.name.toLowerCase() === 'default') || loaded[0];
          setCurrentWorkspace(defaultWs);
        }
      } else if (loaded.length > 0) {
        // No saved selection, use default
        const defaultWs = loaded.find(w => w.id === 'default' || w.name.toLowerCase() === 'default') || loaded[0];
        setCurrentWorkspace(defaultWs);
      }
    });
  }, []);

  // Update current workspace in localStorage when it changes
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('dokument-ai-current-workspace', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  // Sync current workspace when workspaces list changes
  useEffect(() => {
    if (currentWorkspace && workspaces.length > 0) {
      const updated = workspaces.find(w => w.id === currentWorkspace.id);
      if (updated) {
        setCurrentWorkspace(updated);
      }
    }
  }, [workspaces]);

  const refreshWorkspaces = async () => {
    await loadWorkspaces();
  };

  return (
    <AppContext.Provider value={{ 
      currentWorkspace, 
      setCurrentWorkspace, 
      workspaces,
      refreshWorkspaces,
    }}>
      {children}
    </AppContext.Provider>
  );
};
