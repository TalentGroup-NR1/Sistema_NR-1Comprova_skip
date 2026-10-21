import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Check, ExternalLink, Terminal, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { LINK_EXPIRATION_HOURS } from '@/lib/constants';

interface DevInviteDialogProps {
  open: boolean;
  onClose: () => void;
  colaboradorName?: string;
  email?: string;
  inviteUrl: string;
}

export function DevInviteDialog({
  open,
  onClose,
  colaboradorName,
  email,
  inviteUrl,
}: DevInviteDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const handleOpenLink = () => {
    window.open(inviteUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-amber-500/30">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Terminal className="h-5 w-5" />
            <DialogTitle>Modo de Desenvolvimento: Convite Gerado</DialogTitle>
          </div>
          <DialogDescription>
            {colaboradorName ? (
              <span>
                Acesso para <strong>{colaboradorName}</strong> ({email})
              </span>
            ) : (
              'Link de acesso gerado com sucesso.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold">
              Ambiente de dev: link de convite gerado — clique para definir a senha
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 text-amber-800/90 dark:text-amber-300/90">
              O serviço de e-mail (Resend) não está ativo ou o ambiente é local/dev. O token de convite foi gerado diretamente abaixo:
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Link de Ativação / Definição de Senha (expira em {LINK_EXPIRATION_HOURS}h):
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteUrl}
                className="font-mono text-xs select-all bg-muted/50"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
                title="Copiar link"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </Button>
          <Button type="button" onClick={handleOpenLink} className="gradient-primary gap-1.5">
            <ExternalLink className="h-4 w-4" />
            Abrir e Definir Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
