import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Crown } from 'lucide-react';

export const SettingsPage = () => {
  const [language, setLanguage] = useState('sv');
  const [tone, setTone] = useState('neutral');
  const [sourceDisplay, setSourceDisplay] = useState<'always' | 'onDemand' | 'hide'>('always');
  const [enabledFormats, setEnabledFormats] = useState({
    pdf: true,
    docx: true,
    txt: true,
    md: true,
    csv: true,
  });
  const [notifications, setNotifications] = useState({
    documentIndexed: true,
    workspaceAccuracy: true,
    testCasesReady: false,
  });
  const [aiModel, setAiModel] = useState<'fast' | 'smart'>('fast');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  
  // Mock quota data
  const currentPlan = 'start' as 'start' | 'pro' | 'enterprise';
  const workspaceQuota = { current: 2, max: 3 };
  const documentQuota = { current: 45, max: 100 };

  const handleGenerateApiKey = () => {
    toast.success('API-nyckel genererad (mock)');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
        toast.success('Företagslogotyp uppladdad');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportSettings = () => {
    const settings = {
      language,
      tone,
      sourceDisplay,
      enabledFormats,
      notifications,
      aiModel,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-settings-${Date.now()}.json`;
    a.click();
    toast.success('Inställningar exporterade');
  };

  const formats = [
    { key: 'pdf', label: 'PDF' },
    { key: 'docx', label: 'Word (DOCX)' },
    { key: 'txt', label: 'Text (TXT)' },
    { key: 'md', label: 'Markdown (MD)' },
    { key: 'csv', label: 'CSV' },
  ];

  const tones = [
    { key: 'neutral', label: 'Neutral' },
    { key: 'formal', label: 'Formell' },
    { key: 'simple', label: 'Enkel' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Inställningar</h1>
        <p className="text-muted-foreground mt-1">Anpassa din upplevelse</p>
      </div>

      {/* Language & Style */}
      <Card>
        <CardHeader>
          <CardTitle>Språk & svarsstil</CardTitle>
          <CardDescription>Välj språk och tonläge för AI-svar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Språk</Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage('sv')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === 'sv'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Svenska
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === 'en'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Engelska
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Tonläge</Label>
            <div className="flex items-center gap-3">
              {tones.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    tone === t.key
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Display */}
      <Card>
        <CardHeader>
          <CardTitle>Källvisning</CardTitle>
          <CardDescription>Hur källor ska visas i svar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'always', label: 'Visa alltid källor', description: 'Källor visas automatiskt efter varje svar' },
            { key: 'onDemand', label: 'Visa endast vid behov', description: 'AI bestämmer när källor behövs' },
            { key: 'hide', label: 'Dölj källor i chat', description: 'Syns endast i PDF-export' },
          ].map((option) => (
            <div
              key={option.key}
              onClick={() => setSourceDisplay(option.key as typeof sourceDisplay)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                sourceDisplay === option.key
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="cursor-pointer">{option.label}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
                {sourceDisplay === option.key && (
                  <div className="h-4 w-4 rounded-full bg-accent" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notiser</CardTitle>
          <CardDescription>Få meddelanden om viktiga händelser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-indexed">Dokument indexerat</Label>
              <p className="text-xs text-muted-foreground">När ett dokument slutförts indexering</p>
            </div>
            <Switch
              id="notify-indexed"
              checked={notifications.documentIndexed}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, documentIndexed: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-accuracy">Noggrannhetsgräns nådd</Label>
              <p className="text-xs text-muted-foreground">När en arbetsyta passerar viss noggrannhet</p>
            </div>
            <Switch
              id="notify-accuracy"
              checked={notifications.workspaceAccuracy}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, workspaceAccuracy: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-tests">Testfall klara</Label>
              <p className="text-xs text-muted-foreground">När nya testfall är klara</p>
            </div>
            <Switch
              id="notify-tests"
              checked={notifications.testCasesReady}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, testCasesReady: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Workspace Quotas */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Arbetsytor & kvoter</CardTitle>
            <CardDescription>Hantera dina gränser och planuppgradering</CardDescription>
          </div>
          {currentPlan !== 'enterprise' && (
            <Badge variant="outline" className="gap-1">
              <Crown className="h-3 w-3" />
              {currentPlan === 'start' ? 'Start' : 'Pro'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Arbetsytor</Label>
              <span className="text-sm text-muted-foreground">
                {workspaceQuota.current} / {workspaceQuota.max}
              </span>
            </div>
            <Progress value={(workspaceQuota.current / workspaceQuota.max) * 100} className="h-2" />
            {workspaceQuota.current >= workspaceQuota.max && (
              <p className="text-xs text-amber-600 mt-1">Du har nått din gräns – uppgradera för fler arbetsytor</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Dokument</Label>
              <span className="text-sm text-muted-foreground">
                {documentQuota.current} / {documentQuota.max}
              </span>
            </div>
            <Progress value={(documentQuota.current / documentQuota.max) * 100} className="h-2" />
          </div>

          {currentPlan === 'start' && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Uppgradera till Pro</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Få upp till 10 arbetsytor och 500 dokument per arbetsyta
                  </p>
                  <Button size="sm" className="gap-2">
                    <Crown className="h-4 w-4" />
                    Uppgradera nu
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AI-modell</CardTitle>
          <CardDescription>Välj balanspunkt mellan hastighet och kvalitet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onClick={() => setAiModel('fast')}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              aiModel === 'fast'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">Snabb (Standard)</Label>
                <p className="text-xs text-muted-foreground mt-1">Optimerad för hastighet och låg kostnad</p>
              </div>
              {aiModel === 'fast' && <div className="h-4 w-4 rounded-full bg-accent" />}
            </div>
          </div>

          <div
            onClick={() => setAiModel('smart')}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              aiModel === 'smart'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="cursor-pointer">Smart (Premium)</Label>
                <Badge variant="outline" className="text-xs">Beta</Badge>
              </div>
              {aiModel === 'smart' && <div className="h-4 w-4 rounded-full bg-accent" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Djupare analys, högre noggrannhet – 2× kostnad</p>
          </div>
        </CardContent>
      </Card>

      {/* Company Settings */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Företagsinställningar</CardTitle>
            <CardDescription>Anpassa utseende och branding</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Crown className="h-3 w-3" />
            Pro
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company-logo">Filformat som stödjs: PNG, JPEG, SVG, WEBP</Label>
            <p className="text-xs text-muted-foreground mb-2">Visas i alla rapporter och export</p>
            <div className="flex items-center gap-4">
              {companyLogo && (
                <div className="h-16 w-16 rounded border border-border flex items-center justify-center overflow-hidden bg-background">
                  <img src={companyLogo} alt="Company logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Filformat</CardTitle>
          <CardDescription>Aktivera eller inaktivera filformat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formats.map((format) => (
            <div key={format.key} className="flex items-center justify-between">
              <Label htmlFor={format.key}>{format.label}</Label>
              <Switch
                id={format.key}
                checked={enabledFormats[format.key as keyof typeof enabledFormats]}
                onCheckedChange={(checked) =>
                  setEnabledFormats({ ...enabledFormats, [format.key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API-nycklar</CardTitle>
          <CardDescription>Hantera API-åtkomst</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API-nyckel</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                value="sk-***************************"
                readOnly
              />
              <Button
                variant="outline"
                onClick={handleGenerateApiKey}
              >
                Generera ny
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={handleExportSettings}
          className="gap-2"
        >
          Exportera inställningar (JSON)
        </Button>
      </div>
    </div>
  );
};
