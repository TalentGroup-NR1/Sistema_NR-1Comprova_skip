import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, KeyRound, Mail, User, Building2, Briefcase } from 'lucide-react';
import { useFinalizeColaborador, type ColaboradorPendente } from '@/hooks/useColaboradoresPendentes';
import { contractTypeOptions } from '@/lib/validators/colaborador';
import { DevInviteDialog } from './DevInviteDialog';

interface FinalizeColaboradorDialogProps {
  colaborador: ColaboradorPendente | null;
  open: boolean;
  onClose: () => void;
}

export function FinalizeColaboradorDialog({ colaborador, open, onClose }: FinalizeColaboradorDialogProps) {
  const finalizeColaborador = useFinalizeColaborador();
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);
  const [contractType, setContractType] = useState<string>('CLT');

  useEffect(() => {
    setContractType(colaborador?.contract_type || 'CLT');
  }, [colaborador]);

  const onConfirm = async () => {
    if (!colaborador) return;

    try {
      const response = await finalizeColaborador.mutateAsync({
        colaborador_id: colaborador.id,
        contract_type: contractType || 'CLT',
      });

      // Em ambiente dev (sem RESEND_API_KEY ou APP_ENV=dev), exibe o aviso com o link de convite gerado
      if (response?.invite_url) {
        setDevInviteUrl(response.invite_url);
      } else {
        // Em produção, o e-mail é enviado de verdade e fechamos a janela diretamente
        onClose();
      }
    } catch {
      // Erro tratado pela mutation
    }
  };

  const handleClose = () => {
    setDevInviteUrl(null);
    onClose();
  };

  if (devInviteUrl) {
    return (
      <DevInviteDialog
        open={open}
        onClose={handleClose}
        colaboradorName={colaborador?.full_name}
        email={colaborador?.email_pessoal}
        inviteUrl={devInviteUrl}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Liberar Acesso
          </DialogTitle>
          <DialogDescription>
            O colaborador receberá um e-mail de boas-vindas com um link seguro para definir sua própria senha.
          </DialogDescription>
        </DialogHeader>

        {colaborador && (
          <div className="py-4 space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Colaborador</p>
                  <p className="font-semibold">{colaborador.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">E-mail de acesso</p>
                  <p className="font-mono text-sm">{colaborador.email_pessoal}</p>
                </div>
              </div>
              {colaborador.company_name && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                    <p className="text-sm">{colaborador.company_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-1 border-t border-border/40">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Regime de Contratação <span className="text-destructive">*</span>
                  </label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypeOptions.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>O link enviado expira em <strong className="text-foreground">24 horas</strong> e é de uso único.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={finalizeColaborador.isPending}
                className="gradient-primary"
              >
                {finalizeColaborador.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Liberar Acesso
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
