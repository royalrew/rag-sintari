import { NavLink } from '@/components/NavLink';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  FolderOpen,
  History,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const mainLinks: SidebarLink[] = [
  { to: routes.app.overview, label: 'Översikt', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: routes.app.documents, label: 'Dokument', icon: <FileText className="h-5 w-5" /> },
  { to: routes.app.chat, label: 'Chat & Svar', icon: <MessageSquare className="h-5 w-5" /> },
  { to: routes.app.workspaces, label: 'Arbetsytor', icon: <FolderOpen className="h-5 w-5" /> },
  { to: routes.app.history, label: 'Historik', icon: <History className="h-5 w-5" /> },
  { to: routes.app.evaluation, label: 'Utvärdering', icon: <BarChart3 className="h-5 w-5" /> },
  { to: routes.app.settings, label: 'Inställningar', icon: <Settings className="h-5 w-5" /> },
  { to: routes.app.billing, label: 'Fakturering', icon: <CreditCard className="h-5 w-5" /> },
];

export const Sidebar = () => {
  const isMobile = useIsMobile();
  
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border z-40",
      isMobile && "hidden"
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sidebar-foreground to-sidebar-primary bg-clip-text text-transparent">
              Dokument-AI
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Beta</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              'hover:bg-sidebar-accent text-sidebar-foreground'
            )}
            activeClassName="bg-sidebar-accent font-semibold border-l-2 border-sidebar-primary"
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <NavLink
          to={routes.app.help}
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg',
            'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
          )}
          activeClassName="bg-sidebar-accent text-sidebar-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Hjälp & dokumentation
        </NavLink>
        <NavLink
          to={routes.app.feedback}
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg',
            'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
          )}
          activeClassName="bg-sidebar-accent text-sidebar-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          Feedback
        </NavLink>
      </div>
    </aside>
  );
};
