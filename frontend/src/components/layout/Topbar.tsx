import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { TextLink } from '@/components/ui/TextLink';
import { ChevronDown, Check, Search, Menu, User as UserIcon, X, FileText, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText as FileTextIcon,
  MessageSquare,
  FolderOpen,
  History,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const mainLinks = [
  { to: routes.app.overview, label: 'Översikt', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: routes.app.documents, label: 'Dokument', icon: <FileTextIcon className="h-5 w-5" /> },
  { to: routes.app.chat, label: 'Chat & Svar', icon: <MessageSquare className="h-5 w-5" /> },
  { to: routes.app.workspaces, label: 'Arbetsytor', icon: <FolderOpen className="h-5 w-5" /> },
  { to: routes.app.history, label: 'Historik', icon: <History className="h-5 w-5" /> },
  { to: routes.app.evaluation, label: 'Utvärdering', icon: <BarChart3 className="h-5 w-5" /> },
  { to: routes.app.settings, label: 'Inställningar', icon: <Settings className="h-5 w-5" /> },
  { to: routes.app.billing, label: 'Fakturering', icon: <CreditCard className="h-5 w-5" /> },
];

const STORAGE_KEY_SHOW_ACTIVE_ONLY = 'dokument-ai-show-active-workspaces-only';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(() => {
    // Ladda från localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_ACTIVE_ONLY);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const isMobile = useIsMobile();

  // Spara toggle-läge i localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOW_ACTIVE_ONLY, showActiveOnly.toString());
    } catch (error) {
      console.error('Failed to save toggle state:', error);
    }
  }, [showActiveOnly]);

  // Filtrera workspaces baserat på sökning och toggle
  const workspacesToShow = workspaces.filter((workspace) => {
    // Sökfilter
    const matchesSearch = workspace.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    // Toggle-filter: visa endast aktiva (≥1 dokument) om toggle är på
    if (showActiveOnly) {
      return (workspace.documentCount || 0) > 0;
    }
    return true;
  });

  // Räkna aktiva arbetsytor
  const activeWorkspacesCount = workspaces.filter(ws => (ws.documentCount || 0) > 0).length;
  
  // Auto-stänga toggle om inga aktiva arbetsytor finns
  useEffect(() => {
    if (showActiveOnly && activeWorkspacesCount === 0) {
      setShowActiveOnly(false);
    }
  }, [showActiveOnly, activeWorkspacesCount]);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Öppna meny">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {/* Close button for mobile sheet */}
            <SheetClose asChild>
              <button aria-label="Stäng meny" className="absolute right-3 top-3 rounded p-2 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
            <div className="bg-gradient-to-br from-sidebar to-sidebar-accent text-sidebar-foreground h-full flex flex-col">
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
                    onClick={() => setMobileMenuOpen(false)}
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
                {/* Auth actions for mobile */}
                {!user ? (
                  <>
                    <NavLink
                      to={routes.login}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm transition-colors rounded-lg',
                        'text-primary hover:text-primary hover:bg-sidebar-accent'
                      )}
                      activeClassName="bg-sidebar-accent text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <UserIcon className="h-4 w-4" />
                        Logga in
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </NavLink>
                    <NavLink
                      to={routes.register}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm transition-colors rounded-lg',
                        'text-primary hover:text-primary hover:bg-sidebar-accent'
                      )}
                      activeClassName="bg-sidebar-accent text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <UserIcon className="h-4 w-4" />
                        Skapa konto
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </NavLink>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <UserIcon className="h-4 w-4" /> Logga ut
                  </button>
                )}

                <NavLink
                  to={routes.app.help}
                  onClick={() => setMobileMenuOpen(false)}
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
                  onClick={() => setMobileMenuOpen(false)}
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
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Workspace Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Arbetsyta:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-2">
                {currentWorkspace?.icon && (
                  <span className="text-base">{currentWorkspace.icon}</span>
                )}
                <span className="font-medium">{currentWorkspace?.name || 'Välj arbetsyta'}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover">
            <div className="p-2 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök arbetsytor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label htmlFor="show-active-only" className="text-xs text-muted-foreground cursor-pointer">
                  Visa endast aktiva
                </Label>
                <Switch
                  id="show-active-only"
                  checked={showActiveOnly}
                  onCheckedChange={setShowActiveOnly}
                  disabled={activeWorkspacesCount === 0}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {workspacesToShow.length > 0 ? (
                workspacesToShow.map((workspace) => {
                  const isSelected = currentWorkspace?.id === workspace.id;
                  
                  return (
                    <DropdownMenuItem
                      key={workspace.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        console.log('[Topbar] Selecting workspace:', workspace.name, workspace.id);
                        setCurrentWorkspace(workspace);
                        setSearchQuery('');
                        toast.success(`Växlade till ${workspace.name}`);
                      }}
                      className={`flex items-center justify-between cursor-pointer ${
                        isSelected ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {workspace.icon && (
                          <span className="text-base flex-shrink-0">{workspace.icon}</span>
                        )}
                        <span className={isSelected ? 'font-medium' : ''}>{workspace.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {showActiveOnly && activeWorkspacesCount === 0 ? (
                    <div className="space-y-1">
                      <p>Inga aktiva arbetsytor ännu</p>
                      <p className="text-xs">Ladda upp dokument för att aktivera en arbetsyta</p>
                    </div>
                  ) : (
                    'Inga arbetsytor hittades'
                  )}
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* User Menu */}
      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-sm hidden md:block text-left">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuItem asChild>
              <TextLink to={routes.app.account} className="w-full cursor-pointer flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Mitt konto
              </TextLink>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
