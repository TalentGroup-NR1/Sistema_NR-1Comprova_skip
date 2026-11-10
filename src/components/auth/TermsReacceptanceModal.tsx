import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShieldCheck, Loader2, CheckCircle2, LogOut, ExternalLink, FileText } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TERMS_VERSION, PRIVACY_VERSION, LEGAL_LAST_UPDATED, getClientIp } from '@/lib/legal';
import { toast } from 'sonner';

/**
 * Guard pós-login de re-aceite para administradores legados ou quando houver atualização de termos.
 * 
 * Escopo:
 * - Aplica-se a usuários com papel admin_empresa e admin_master de empresas cliente.
 * - Super admins da plataforma são dispensados (atuam como operadores do SaaS, não representantes do tenant).
 * - Usuários colaboradores/analistas/gestores não contratam nem respondem pela empresa perante a plataforma.
 * 
 * Bloqueio:
 * - O modal é estritamente obrigatório e não pode ser fechado via ESC ou clique no overlay.
 * - Exige consentimento granular (2 checkboxes: Termos de Uso + Política de Privacidade LGPD).
 * - Grava a certidão probatória oficial via RPC accept_company_terms (SECURITY DEFINER) com IP real do cliente.
 */
export function TermsReacceptanceModal() {
  const { user, role, isAdmin, isSuperAdmin, loading: authLoading, profileLoaded, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Escopo estrito: somente admin da empresa cliente (admin_empresa ou admin_master) e NUNCA super admin
  const isEligible =
    !authLoading &&
    profileLoaded &&
    !!user?.id &&
    (role === 'admin_empresa' || role === 'admin_master' || isAdmin) &&
    !isSuperAdmin;

  const { data: hasAccepted, isLoading: isChecking } = useQuery({
    queryKey: ['terms-acceptance', user?.id, TERMS_VERSION, PRIVACY_VERSION],
    enabled: isEligible,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('id')
        .eq('user_id', user!.id)
        .eq('terms_version', TERMS_VERSION)
        .eq('privacy_version', PRIVACY_VERSION)
        .maybeSingle();

      if (error) {
        console.error('[TermsReacceptanceModal] Erro ao verificar aceite em terms_acceptance:', error);
        // Fallback defensivo em instabilidade transitória de rede para não travar a aplicação indevidamente
        return true;
      }
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!isEligible || isChecking || hasAccepted !== false) {
    return null;
  }

  const canSubmit = acceptedTerms && acceptedPrivacy && !submitting;

  const handleAccept = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const clientIp = await getClientIp();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      const { data, error } = await supabase.rpc('accept_company_terms', {
        p_terms_version: TERMS_VERSION,
        p_privacy_version: PRIVACY_VERSION,
        p_ip_address: clientIp,
        p_user_agent: userAgent,
      });

      if (error) {
        console.error('[TermsReacceptanceModal] Erro ao chamar accept_company_terms:', error);
        toast.error('Não foi possível registrar o aceite dos termos. Tente novamente.');
        return;
      }

      toast.success('Termos de Uso e Política de Privacidade aceitos com sucesso.');
      // Atualiza o cache imediatamente para fechar o modal
      queryClient.setQueryData(['terms-acceptance', user?.id, TERMS_VERSION, PRIVACY_VERSION], true);
      queryClient.invalidateQueries({ queryKey: ['terms-acceptance'] });
    } catch (err) {
      console.error('[TermsReacceptanceModal] Erro inesperado:', err);
      toast.error('Ocorreu um erro ao processar seu aceite. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DialogPrimitive.Root open modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-testid="terms-modal-overlay"
          className="fixed inset-0 z-[100] bg-foreground/75 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          data-testid="terms-modal-content"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 border-2 border-primary/30 bg-card p-6 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-start gap-3 pb-3 border-b border-border">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Ação Obrigatória — Conformidade Legal
              </p>
              <DialogPrimitive.Title className="text-lg font-bold text-foreground leading-tight">
                Termos de Uso e Política de Privacidade
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground leading-relaxed">
                Como administrador da sua organização, você deve revisar e confirmar o aceite das versões vigentes
                dos documentos contratuais para liberar o painel de gestão.
              </DialogPrimitive.Description>
            </div>
          </div>

          {/* Card informativo de versões */}
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Documentos Vigentes
              </span>
              <span>Atualizado em: {LEGAL_LAST_UPDATED}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              O aceite registra uma certidão probatória digital vinculando seu usuário, a empresa contratante,
              seu endereço IP e data/hora oficial, em estrito cumprimento à LGPD e às diretrizes da NR-1.
            </p>
          </div>

          {/* Checkboxes de aceite granular */}
          <div className="space-y-3.5 py-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="reaccept-terms"
                data-testid="reaccept-terms-checkbox"
                checked={acceptedTerms}
                onCheckedChange={(c) => setAcceptedTerms(!!c)}
                className="mt-0.5"
              />
              <Label
                htmlFor="reaccept-terms"
                className="text-xs font-normal leading-relaxed text-foreground cursor-pointer"
              >
                Li e aceito os{' '}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2 inline-flex items-center gap-0.5 hover:opacity-80"
                >
                  Termos de Uso (versão {TERMS_VERSION})
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
                .
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="reaccept-privacy"
                data-testid="reaccept-privacy-checkbox"
                checked={acceptedPrivacy}
                onCheckedChange={(c) => setAcceptedPrivacy(!!c)}
                className="mt-0.5"
              />
              <Label
                htmlFor="reaccept-privacy"
                className="text-xs font-normal leading-relaxed text-foreground cursor-pointer"
              >
                Li e aceito a{' '}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2 inline-flex items-center gap-0.5 hover:opacity-80"
                >
                  Política de Privacidade — LGPD (versão {PRIVACY_VERSION})
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
                .
              </Label>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={submitting}
              className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </Button>

            <Button
              type="button"
              onClick={handleAccept}
              disabled={!canSubmit}
              data-testid="reaccept-submit-btn"
              className="w-full sm:w-auto min-h-[40px] text-xs font-medium gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando aceite...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar e Continuar
                </>
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
