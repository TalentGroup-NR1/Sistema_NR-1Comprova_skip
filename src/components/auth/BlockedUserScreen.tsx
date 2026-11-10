import { ShieldX, Phone, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BlockedUserScreenProps {
  reason?: string;
  onRetry?: () => void;
}

export function BlockedUserScreen({ reason, onRetry }: BlockedUserScreenProps) {
  const getMessage = () => {
    switch (reason) {
      case 'colaborador_desligado':
        return 'Seu acesso foi desativado pois você foi desligado da empresa.';
      case 'conta_inativa':
        return 'Sua conta está temporariamente inativa.';
      default:
        return 'Seu acesso ao sistema foi bloqueado.';
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Acesso Bloqueado</CardTitle>
          <CardDescription className="text-base mt-2">
            {getMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Precisa de ajuda?</p>
            <p>Entre em contato com o departamento de Recursos Humanos para mais informações sobre sua situação.</p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>rh@suaempresa.com.br</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4" />
              <span>(11) 1234-5678</span>
            </div>
          </div>

          <Button variant="outline" onClick={handleRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
