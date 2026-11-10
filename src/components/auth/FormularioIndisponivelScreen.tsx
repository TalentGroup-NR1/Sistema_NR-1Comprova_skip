import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FormularioIndisponivelScreenProps {
  titulo?: string;
  mensagem?: string;
  moduloNome?: string;
}

export function FormularioIndisponivelScreen({
  titulo = 'Formulário Indisponível',
  mensagem = 'Este serviço não está disponível no momento ou foi desativado pela sua empresa.',
  moduloNome,
}: FormularioIndisponivelScreenProps) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-border">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {titulo}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mensagem}
            </p>
            {moduloNome && (
              <p className="text-xs font-mono text-muted-foreground/80 bg-muted/60 py-1 px-2 rounded-md inline-block">
                Módulo relacionado: {moduloNome}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Caso acredite que se trata de um engano, entre em contato com o departamento de Recursos Humanos (DHO/RH) da sua empresa.
          </p>

          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Ir para o Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
