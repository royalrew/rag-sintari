import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockWorkspaces, Workspace } from '@/lib/mockData';
import { listWorkspaces } from '@/api/workspaces';
import { getStats, getWorkspaceActivity, getRecentQueries } from '@/api/stats';

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
    
    // Hämta aktivitet för alla workspaces
    const activityMap = await getWorkspaceActivity().catch(() => ({}));
    
    // Uppdatera dokumentantal, accuracy, senaste fråga och senaste aktivitet från backend för alla workspaces
    // Ta bort mock data (accuracy, documentCount, lastQuestion) och ersätt med backend-data
    const workspacesWithStats = await Promise.all(
      loaded.map(async (ws) => {
        try {
          const wsId = ws.id || ws.name;
          const [stats, recentQueries] = await Promise.all([
            getStats(wsId),
            getRecentQueries(1, wsId).catch(() => []), // Hämta senaste frågan
          ]);
          const activity = activityMap[wsId];
          
          console.log(`[AppContext] Loading stats for workspace ${wsId}:`, {
            accuracy: stats.accuracy,
            total_documents: stats.total_documents,
            total_queries: stats.total_queries,
          });
          
          // Ta bort mock data och använd endast backend-data
          // BEVARAR: icon, name, description, id (dessa är inte mock data)
          const { accuracy: mockAccuracy, documentCount: mockDocCount, lastQuestion: mockLastQuestion, ...wsWithoutMock } = ws;
          
          // Backend returnerar alltid accuracy (även om den är 0.0)
          // Spara accuracy om den finns från backend (inklusive 0)
          // Om backend inte returnerar accuracy, sätt till 0 (ingen data ännu)
          const accuracyValue = typeof stats.accuracy === 'number' ? stats.accuracy : 0;
          
          return {
            ...wsWithoutMock,
            icon: ws.icon || '📁', // Säkerställ att icon alltid finns
            documentCount: stats.total_documents, // Använd backend-data
            accuracy: accuracyValue, // Använd backend-data för accuracy (inklusive 0), default 0 om saknas
            lastQuestion: recentQueries[0]?.query || undefined, // Använd senaste frågan från backend
            lastActive: activity?.last_active
              ? new Date(activity.last_active).toLocaleDateString('sv-SE')
              : ws.lastActive,
          };
        } catch (error) {
          console.error(`Failed to load stats for workspace ${ws.id}:`, error);
          // Om backend-anrop misslyckas, ta bort mock data (accuracy, documentCount, lastQuestion)
          // BEVARAR: icon, name, description, id (dessa är inte mock data)
          const { accuracy: mockAccuracy, documentCount: mockDocCount, lastQuestion: mockLastQuestion, ...wsWithoutMock } = ws;
          return {
            ...wsWithoutMock,
            icon: ws.icon || '📁', // Säkerställ att icon alltid finns
            documentCount: 0, // Sätt till 0 om backend misslyckas
            accuracy: undefined, // Ta bort accuracy om backend-anrop misslyckas
            lastQuestion: undefined, // Ta bort lastQuestion om backend-anrop misslyckas
          };
        }
      })
    );
    
    setWorkspaces(workspacesWithStats);
    return workspacesWithStats;
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
