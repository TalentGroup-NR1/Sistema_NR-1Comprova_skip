import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CompanyLifecycleTargetStatus = 'ativa' | 'suspensa' | 'encerrada';

interface CompanyLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    id: string;
    name: string;
    brand_name?: string | null;
    status: 'ativa' | 'suspensa' | 'encerrada';
  } | null;
  targetStatus: CompanyLifecycleTargetStatus;
  onSuccess: () => void;
}

export function CompanyLifecycleModal({
  isOpen,
  onClose,
  company,
  targetStatus,
  onSuccess,
}: CompanyLifecycleModalProps) {
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  if (!company) return null;

  const isEncerrar = targetStatus === 'encerrada';
  const isSuspender = targetStatus === 'suspensa';
  const isReativar = targetStatus === 'ativa';

  const title = isSuspender
    ? 'Suspender Empresa'
    : isReativar
    ? 'Reativar Empresa'
    : 'Encerrar Empresa';

  const actionVerb = isSuspender
    ? 'suspensão'
    : isReativar
    ? 'reativação'
    : 'encerramento';

  const actionPast = isSuspender
    ? 'suspensa'
    : isReativar
    ? 'reativada'
    : 'encerrada';

  const isValidReason = reason.trim().length >= 3;

  const handleConfirm = async () => {
    if (!isValidReason || isPending) return;

    setIsPending(true);
    try {
      const { error } = await supabase.rpc('transition_company_lifecycle' as any, {
        _company_id: company.id,
        _target_status: targetStatus,
        _reason: reason.trim(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Empresa ${actionPast} com sucesso.`);
      setReason('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao processar transição de estado');
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEncerrar && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {isEncerrar ? (
              <span className="text-destructive font-medium block mt-1">
                Atenção: o encerramento é um estado terminal e definitivo. A empresa não poderá ser reativada posteriormente.
              </span>
            ) : isSuspender ? (
              <span>
                A suspensão exibirá um banner fixo de cobrança para todos os usuários vinculados à empresa.
              </span>
            ) : (
              <span>
                A reativação restabelece o status de operação normal da empresa e remove o banner de cobrança.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm border space-y-1">
            <div>
              <span className="text-muted-foreground">Empresa: </span>
              <span className="font-semibold text-foreground">{company.brand_name || company.name}</span>
            </div>
            {company.brand_name && (
              <div className="text-xs text-muted-foreground truncate">
                Razão Social: {company.name}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Status Atual:{' '}
              <span className="capitalize font-medium text-foreground">{company.status}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lifecycle-reason" className="text-sm font-medium">
              Motivo da {actionVerb} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="lifecycle-reason"
              placeholder={`Descreva o motivo da ${actionVerb} (ex: inadimplência da fatura, rescisão contratual)...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isPending}
              className="resize-none"
            />
            {reason.length > 0 && !isValidReason && (
              <p className="text-xs text-destructive">O motivo deve conter no mínimo 3 caracteres.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant={isEncerrar ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!isValidReason || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar {actionVerb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

