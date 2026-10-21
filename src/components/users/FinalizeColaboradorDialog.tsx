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
import { Input } from '@/components/ui/input';
import { Loader2, KeyRound, Mail, User, Building2, Briefcase, AlertTriangle } from 'lucide-react';
import { useFinalizeColaborador, type ColaboradorPendente } from '@/hooks/useColaboradoresPendentes';
import { contractTypeOptions } from '@/lib/validators/colaborador';
import { LINK_EXPIRATION_HOURS } from '@/lib/constants';
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
  const [role, setRole] = useState<string>('colaborador');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setContractType(colaborador?.contract_type || 'CLT');
  }, [colaborador]);

  const onConfirm = async () => {
    if (!colaborador) return;
    if (role === 'admin_empresa' && confirmText !== 'CONFIRMAR') return;

    try {
      const response = await finalizeColaborador.mutateAsync({
        colaborador_id: colaborador.id,
        contract_type: contractType || 'CLT',
        role,
      } as any);

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
    setRole('colaborador');
    setConfirmText('');
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

              <div className="flex items-start gap-3 pt-1 border-t border-border/40">
                <KeyRound className="h-4 w-4 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Nível de Acesso <span className="text-destructive">*</span>
                  </label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Selecione o nível de acesso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador" className="text-xs">Colaborador</SelectItem>
                      <SelectItem value="gestor_departamento" className="text-xs">Gestor de Departamento</SelectItem>
                      <SelectItem value="analista_rh" className="text-xs">Analista de RH</SelectItem>
                      <SelectItem value="admin_empresa" className="text-xs font-medium text-destructive">Administrador da Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === 'admin_empresa' && (
                <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20 mt-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-xs text-destructive font-medium">Atenção: Acesso Total</p>
                      <p className="text-xs text-muted-foreground">
                        Este nível dá acesso a <strong>todos</strong> os dados da empresa.
                        Digite <strong>CONFIRMAR</strong> abaixo para prosseguir.
                      </p>
                      <Input 
                        value={confirmText} 
                        onChange={(e) => setConfirmText(e.target.value)} 
                        placeholder="Digite CONFIRMAR"
                        className="h-8 text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>O link enviado expira em <strong className="text-foreground">{LINK_EXPIRATION_HOURS} horas</strong> e é de uso único.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={finalizeColaborador.isPending || (role === 'admin_empresa' && confirmText !== 'CONFIRMAR')}
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
