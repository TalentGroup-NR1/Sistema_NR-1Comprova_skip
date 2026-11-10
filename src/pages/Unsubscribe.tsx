import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando sua solicitação...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link de cancelamento inválido ou expirado.');
      return;
    }

    const unsubscribe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
          body: { token },
        });

        if (error || data?.error) {
          throw new Error(error?.message || data?.error || 'Erro ao processar cancelamento');
        }

        setStatus('success');
        setMessage('Você foi removido da nossa lista de e-mails com sucesso.');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Não foi possível processar o cancelamento.');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Cancelar inscrição</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pb-8">
          {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-12 w-12 text-destructive" />}

          {status !== 'loading' && (
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => window.location.href = '/auth'}
            >
              Ir para o login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
