import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockWorkspaces, Workspace } from '@/lib/mockData';
import { listWorkspaces } from '@/api/workspaces';
import { getStats, getWorkspaceActivity, getRecentQueries } from '@/api/stats';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth(); // Hämta user_id från AuthContext

  const loadWorkspaces = async (): Promise<Workspace[]> => {
    const loaded = await listWorkspaces();
    
    // Om användaren är inloggad, använd user_id som workspace-id
    // Skapa eller uppdatera workspace med id = str(user_id)
    const userWorkspaceId = user?.id ? String(user.id) : null;
    
    if (userWorkspaceId) {
      // Hitta eller skapa workspace med id = user_id
      let userWorkspace = loaded.find(w => w.id === userWorkspaceId);
      
      if (!userWorkspace) {
        // Skapa ny workspace med id = user_id om den inte finns
        userWorkspace = {
          id: userWorkspaceId,
          name: user.email?.split('@')[0] || `Arbetsyta ${userWorkspaceId}`,
          description: 'Din personliga arbetsyta',
          icon: '📁',
          documentCount: 0,
          lastActive: new Date().toISOString().split('T')[0],
        };
        loaded.push(userWorkspace);
        // Save to localStorage
        try {
          const key = 'dokument-ai-workspaces';
          localStorage.setItem(key, JSON.stringify(loaded));
        } catch {}
      }
      
      // Prioritera user-workspace som första workspace
      const otherWorkspaces = loaded.filter(w => w.id !== userWorkspaceId);
      loaded = [userWorkspace, ...otherWorkspaces];
    } else {
      // Om användaren inte är inloggad, behåll befintliga workspaces
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
    }
    
    // Hämta aktivitet för alla workspaces
    const activityMap = await getWorkspaceActivity().catch(() => ({}));
    
    // Uppdatera dokumentantal, accuracy, senaste fråga och senaste aktivitet från backend för alla workspaces
    // Ta bort mock data (accuracy, documentCount, lastQuestion) och ersätt med backend-data
    const workspacesWithStats = await Promise.all(
      loaded.map(async (ws) => {
        try {
          // Använd alltid user_id som workspace-id för den inloggade användarens workspace
          // För andra workspaces, använd deras id men backend kommer returnera 0 dokument
          const wsId = (user?.id && ws.id === String(user.id)) ? String(user.id) : (ws.id || ws.name);
          
          const [stats, recentQueries] = await Promise.all([
            getStats(wsId),
            getRecentQueries(1, wsId).catch(() => []), // Hämta senaste frågan
          ]);
          const activity = activityMap[wsId];
          
          console.log(`[AppContext] Loading stats for workspace ${wsId} (user.id: ${user?.id}):`, {
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
          return;
        }
      }
      
      // Ingen sparad workspace eller sparad workspace finns inte
      // Använd default eller första workspace
      if (loaded.length > 0) {
        const defaultWs = loaded.find(w => w.id === 'default' || w.name.toLowerCase() === 'default') || loaded[0];
        if (defaultWs) {
          setCurrentWorkspace(defaultWs);
        }
      }
    });
  }, []);

  // Update current workspace in localStorage when it changes
  useEffect(() => {
    if (currentWorkspace) {
      console.log('[AppContext] Saving current workspace to localStorage:', currentWorkspace.name, currentWorkspace.id);
      localStorage.setItem('dokument-ai-current-workspace', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  // Sync current workspace when workspaces list changes
  // Uppdatera endast om workspace finns i listan med samma ID
  useEffect(() => {
    if (currentWorkspace && workspaces.length > 0) {
      // Hitta workspace med exakt samma ID
      const updated = workspaces.find(w => w.id === currentWorkspace.id);
      if (updated) {
        // Uppdatera för att få senaste data (documentCount, accuracy, etc.)
        // Men bara om det faktiskt är en annan referens (för att undvika oändliga loops)
        // Jämför viktiga fält för att se om något har ändrats
        const hasChanged = 
          updated.documentCount !== currentWorkspace.documentCount ||
          updated.accuracy !== currentWorkspace.accuracy ||
          updated.lastQuestion !== currentWorkspace.lastQuestion ||
          updated.lastActive !== currentWorkspace.lastActive;
        
        if (hasChanged) {
          console.log('[AppContext] Updating current workspace with fresh data:', updated.name);
          setCurrentWorkspace(updated);
        }
      } else {
        // Workspace finns inte i listan - behåll valet ändå
        console.log('[AppContext] Current workspace not found in list, keeping selection:', currentWorkspace.name, currentWorkspace.id);
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
