import { Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { routes } from '@/lib/routes';
import { TextLink } from '@/components/ui/TextLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export const PublicLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to={routes.home} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg shadow-accent/20 transition-transform duration-300 group-hover:scale-110">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent">
              Dokument-AI
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <TextLink to={routes.home} variant="subtle" icon="none">
              Hem
            </TextLink>
            <TextLink to={routes.useCases} variant="subtle" icon="none">
              Användningsfall
            </TextLink>
            <TextLink to={routes.pricing} variant="subtle" icon="none">
              Priser
            </TextLink>
            <TextLink to={routes.about} variant="subtle" icon="none">
              Om oss
            </TextLink>
            <TextLink to={routes.contact} variant="subtle" icon="none">
              Kontakt
            </TextLink>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <TextLink to={routes.login} variant="accent" icon="arrow">
              Logga in
            </TextLink>
            <TextLink to={routes.register} variant="accent" icon="arrow">
              Skapa konto
            </TextLink>
          </div>

          {/* Mobile Menu */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  <TextLink to={routes.home} variant="subtle" icon="none" onClick={() => setMobileMenuOpen(false)} className="block">
                    Hem
                  </TextLink>
                  <TextLink to={routes.useCases} variant="subtle" icon="none" onClick={() => setMobileMenuOpen(false)} className="block">
                    Användningsfall
                  </TextLink>
                  <TextLink to={routes.pricing} variant="subtle" icon="none" onClick={() => setMobileMenuOpen(false)} className="block">
                    Priser
                  </TextLink>
                  <TextLink to={routes.about} variant="subtle" icon="none" onClick={() => setMobileMenuOpen(false)} className="block">
                    Om oss
                  </TextLink>
                  <TextLink to={routes.contact} variant="subtle" icon="none" onClick={() => setMobileMenuOpen(false)} className="block">
                    Kontakt
                  </TextLink>
                  <div className="border-top border-border pt-4 mt-4 space-y-3">
                    <TextLink to={routes.login} variant="accent" icon="arrow" onClick={() => setMobileMenuOpen(false)} className="block">
                      Logga in
                    </TextLink>
                    <TextLink to={routes.register} variant="accent" icon="arrow" onClick={() => setMobileMenuOpen(false)} className="block">
                      Skapa konto
                    </TextLink>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 bg-card">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <h3 className="font-bold text-lg mb-3">Dokument-AI</h3>
              <p className="text-sm text-muted-foreground">
                Sveriges smartaste AI för PDF:er, avtal och dokument.
              </p>
            </div>

            {/* Produkt */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Produkt</h4>
              <div className="space-y-2">
                <div>
                  <TextLink to={routes.useCases} variant="subtle" icon="none" className="text-sm">
                    Användningsfall
                  </TextLink>
                </div>
                <div>
                  <TextLink to={routes.pricing} variant="subtle" icon="none" className="text-sm">
                    Priser
                  </TextLink>
                </div>
              </div>
            </div>

            {/* Företag */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Företag</h4>
              <div className="space-y-2">
                <div>
                  <TextLink to={routes.about} variant="subtle" icon="none" className="text-sm">
                    Om oss
                  </TextLink>
                </div>
                <div>
                  <TextLink to={routes.contact} variant="subtle" icon="none" className="text-sm">
                    Kontakt
                  </TextLink>
                </div>
              </div>
            </div>

            {/* Juridiskt */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Juridiskt</h4>
              <div className="space-y-2">
                <div>
                  <TextLink to={routes.legal} variant="subtle" icon="none" className="text-sm">
                    Användarvillkor
                  </TextLink>
                </div>
                <div>
                  <TextLink to={routes.privacy} variant="subtle" icon="none" className="text-sm">
                    Integritetspolicy
                  </TextLink>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            © 2024 Dokument-AI. Alla rättigheter förbehållna.
          </div>
        </div>
      </footer>
    </div>
  );
};
