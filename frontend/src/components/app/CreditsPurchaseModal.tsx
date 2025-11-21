import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CREDIT_PACKAGES, purchaseCredits, CreditPackage } from '@/api/credits';
import { toast } from 'sonner';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface CreditsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditsPurchaseModal = ({ open, onOpenChange }: CreditsPurchaseModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (pkg.price === 0) {
      toast.info('Kontakta oss för offert på större paket');
      return;
    }

    setLoading(pkg.id);
    try {
      const { checkout_url } = await purchaseCredits(pkg.id);
      window.location.href = checkout_url;
    } catch (error: any) {
      toast.error(error?.message || 'Kunde inte skapa checkout-session');
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Köp credits</DialogTitle>
          <DialogDescription>
            Välj ett paket för att köpa credits. Credits gäller i 12 månader.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`cursor-pointer transition-all hover:border-accent hover:shadow-md ${
                pkg.bonus ? 'border-accent border-2' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold">{pkg.credits.toLocaleString()} credits</h3>
                    {pkg.bonus && (
                      <div className="flex items-center gap-1 text-xs text-accent mt-1">
                        <Sparkles className="h-3 w-3" />
                        <span>+{pkg.bonus}% bonus</span>
                      </div>
                    )}
                  </div>
                  {pkg.price > 0 ? (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{pkg.price} kr</p>
                      <p className="text-xs text-muted-foreground">
                        {(pkg.price / pkg.credits).toFixed(2)} kr/credit
                      </p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Offert</p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => handlePurchase(pkg)}
                  disabled={loading === pkg.id || pkg.price === 0}
                  variant={pkg.bonus ? 'default' : 'outline'}
                >
                  {loading === pkg.id ? 'Laddar...' : pkg.price === 0 ? 'Kontakta oss' : 'Köp'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

