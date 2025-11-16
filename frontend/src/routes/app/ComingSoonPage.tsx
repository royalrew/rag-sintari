import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { routes } from '@/lib/routes';

export const ComingSoonPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(routes.app.help)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka till hjälp
        </Button>

        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Denna funktion är under utveckling och kommer snart att vara tillgänglig.
            </p>
            {/* TODO: Add content when feature is ready */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
