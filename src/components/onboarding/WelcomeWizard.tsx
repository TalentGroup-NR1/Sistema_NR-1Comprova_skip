import { useEffect, useState } from 'react';
import { Loader2, Palette } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import {
  useOnboardingProgress,
  useSaveOnboardingProgress,
} from '@/hooks/useOnboardingProgress';
import { BrandingForm, uploadCompanyLogo } from '@/components/empresa/BrandingForm';

// Helper para limpar eventuais flags residuais de cadastro de empresa
function cleanLocalFlags() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('setupPending');
      localStorage.removeItem('newCompany');
      sessionStorage.removeItem('setupPending');
      const url = new URL(window.location.href);
      if (url.searchParams.has('setup')) {
        url.searchParams.delete('setup');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  } catch (e) {
    console.warn('[WelcomeWizard] Falha ao limpar flags locais:', e);
  }
}

// Helper para obter chave de descarte por sessão
export function getWizardSessionDismissedKey(companyId?: string | null): string {
  return companyId ? `tgmais_wizard_dismissed_session_${companyId}` : 'tgmais_wizard_dismissed_session';
}

export function WelcomeWizard() {
  const { companyId, role, loading: authLoading } = useAuth();
  const branding = useBranding();
  const qc = useQueryClient();

  const isEligible = role === 'admin_empresa' && !branding.isInternal;

  // Invalida e refaz a query de progresso logo que o company_id estiver carregado pós-login
  useEffect(() => {
    if (companyId) {
      qc.invalidateQueries({ queryKey: ['onboarding-progress', companyId] });
    }
  }, [companyId, qc]);

  const {
    data: progress,
    isFetching: progressFetching,
    isFetched: progressFetched,
  } = useOnboardingProgress(isEligible && !!companyId && !authLoading, companyId);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const key = getWizardSessionDismissedKey(companyId);
      return (
        sessionStorage.getItem(key) === 'true' ||
        sessionStorage.getItem('tgmais_wizard_dismissed_session') === 'true'
      );
    } catch {
      return false;
    }
  });

  // Se a empresa mudar ou carregar, verifica se já foi descartada nesta sessão
  useEffect(() => {
    if (typeof window !== 'undefined' && companyId) {
      try {
        if (sessionStorage.getItem(getWizardSessionDismissedKey(companyId)) === 'true') {
          setSessionDismissed(true);
        }
      } catch {
        // Ignora restrições de sandbox/armazenamento
      }
    }
  }, [companyId]);

  // Branding
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C8102E');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Extrai campos reais do progresso do banco
  const completedAt = progress?.completed_at ?? null;
  const dismissed = progress?.dismissed ?? false;

  // Checagem de flags locais paralelas (ex.: setupPending, newCompany, ?setup=1)
  const hasLocalFlag = Boolean(
    typeof window !== 'undefined' && (
      localStorage.getItem('setupPending') ||
      localStorage.getItem('newCompany') ||
      sessionStorage.getItem('setupPending') ||
      new URLSearchParams(window.location.search).get('setup')
    )
  );

  // Flag de descarte nesta sessão (prevalece sobre condições de re-render até reload)
  const isSessionDismissed = sessionDismissed || Boolean(
    typeof window !== 'undefined' && (
      (companyId && sessionStorage.getItem(getWizardSessionDismissedKey(companyId)) === 'true') ||
      sessionStorage.getItem('tgmais_wizard_dismissed_session') === 'true'
    )
  );

  // Condição estrita e padronizada:
  // 1. Aguarda sessão pronta, companyId carregado, branding carregado e fetch do progresso finalizado (sem race condition)
  const isReady =
    !authLoading &&
    !!companyId &&
    !branding.isLoading &&
    isEligible &&
    progressFetched &&
    !progressFetching;

  // 2. Se completed_at estiver preenchido, dismissed = true OU descartado na sessão atual -> NUNCA abrir.
  // 3. SÓ abre quando não existir registro de onboarding_progress (progress === null) OU (completed_at IS NULL AND dismissed IS FALSE).
  const isCompletedOrDismissed = Boolean(completedAt || dismissed || isSessionDismissed);
  const shouldOpen =
    isReady &&
    !isCompletedOrDismissed &&
    (progress === null || (!completedAt && !dismissed));

  // Log temporário solicitado no ponto de decisão para validação no Console
  useEffect(() => {
    if (!authLoading && (companyId || !isEligible)) {
      console.log('wizard-open-check', {
        companyId,
        progress,
        completedAt,
        dismissed,
        isSessionDismissed,
        hasLocalFlag,
      });
    }
  }, [companyId, progress, completedAt, dismissed, isSessionDismissed, hasLocalFlag, authLoading, isEligible]);

  // Se o banco indicar que já foi concluído ou dispensado, remove qualquer flag local residual
  useEffect(() => {
    if (isCompletedOrDismissed) {
      cleanLocalFlags();
    }
  }, [isCompletedOrDismissed]);

  // Sincroniza o estado de abertura garantindo que, enquanto carrega, se já concluído ou descartado na sessão, open permaneça false
  useEffect(() => {
    if (isSessionDismissed) {
      setOpen(false);
      return;
    }
    setOpen(shouldOpen);
  }, [shouldOpen, isSessionDismissed]);

  useEffect(() => {
    if (branding.brandName) setBrandName((prev) => prev || branding.brandName);
    if (branding.primaryColor) setPrimaryColor((prev) => (prev === '#C8102E' ? branding.primaryColor : prev));
  }, [branding.brandName, branding.primaryColor]);

  if (!isEligible) return null;

  const handleDismiss = () => {
    // 1. Fechar o modal PRIMEIRO (imediato/síncrono) e registrar descarte na sessão
    setOpen(false);
    setSessionDismissed(true);
    cleanLocalFlags();

    try {
      if (typeof window !== 'undefined') {
        if (companyId) {
          sessionStorage.setItem(getWizardSessionDismissedKey(companyId), 'true');
        }
        sessionStorage.setItem('tgmais_wizard_dismissed_session', 'true');
      }
    } catch {
      // Ignora restrições de sandbox/armazenamento
    }

    // 2. Disparar a persistência no banco de forma assíncrona — sem bloquear o fechamento
    if (companyId) {
      supabase
        .from('onboarding_progress' as never)
        .upsert(
          {
            company_id: companyId,
            dismissed: true,
            current_step: 0,
            completed_steps: progress?.completed_steps ?? ['branding'],
          } as never,
          { onConflict: 'company_id' } as never
        )
        .then(({ error }) => {
          if (error) {
            // Modal permanece fechado nesta sessão (isSessionDismissed=true).
            // Registra erro seguro (sem PII). O modal poderá reaparecer no próximo login se o banco não gravou.
            console.error('[WelcomeWizard] Falha ao persistir descarte no banco:', error.message);
          } else {
            qc.invalidateQueries({ queryKey: ['onboarding-progress'] });
          }
        })
        .catch((err) => {
          console.error('[WelcomeWizard] Falha de comunicação ao descartar onboarding:', (err as Error)?.message || 'Erro de rede');
        });
    }
  };

  const salvarIdentidade = async () => {
    setSaving(true);
    cleanLocalFlags();
    try {
      let effectiveCompanyId = companyId;
      if (!effectiveCompanyId) {
        const { data: cid } = await supabase.rpc('get_my_company_id' as never);
        if (cid) effectiveCompanyId = cid as unknown as string;
      }

      let logoUrl: string | null = null;
      if (!removeLogo && logoFile && effectiveCompanyId) {
        logoUrl = await uploadCompanyLogo(effectiveCompanyId, logoFile);
      }

      const rpcPayload: Record<string, unknown> = {
        _brand_name: brandName.trim() || null,
        _brand_primary_color: primaryColor,
      };

      if (removeLogo) {
        rpcPayload._brand_logo_url = null;
        rpcPayload._remove_logo = true;
      } else if (logoUrl) {
        rpcPayload._brand_logo_url = logoUrl;
        rpcPayload._remove_logo = false;
      }

      const { data: updatedCompanyId, error } = await supabase.rpc(
        'atualizar_branding_empresa' as never,
        rpcPayload as never
      );
      if (error) throw error;

      const finalCompanyId = (updatedCompanyId as unknown as string) || effectiveCompanyId;
      if (finalCompanyId) {
        // Upsert garantido em onboarding_progress: company_id, completed_at = now(), dismissed = true
        await supabase
          .from('onboarding_progress' as never)
          .upsert(
            {
              company_id: finalCompanyId,
              current_step: 0,
              completed_steps: ['branding'],
              completed_at: new Date().toISOString(),
              dismissed: true,
            } as never,
            { onConflict: 'company_id' } as never
          );
      }

      // Atualiza o cache de empresas, onboarding e branding
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['companies'] }),
        qc.invalidateQueries({ queryKey: ['onboarding-progress'] }),
        qc.invalidateQueries({ queryKey: ['branding'] }),
      ]);

      setSessionDismissed(true);
      setOpen(false);
      toast.success('Identidade visual configurada com sucesso!');
    } catch (e) {
      console.error('Falha ao salvar branding no onboarding:', e);
      toast.error('Não foi possível salvar. Tente novamente ou contate o suporte.', {
        description: (e as Error)?.message || 'Erro inesperado na comunicação com o servidor.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <DialogTitle>Identidade Visual da Empresa</DialogTitle>
          </div>
          <DialogDescription>
            Personalize como sua marca aparece no sistema: nome de exibição, cor principal e logotipo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <BrandingForm
            brandName={brandName}
            onBrandNameChange={setBrandName}
            primaryColor={primaryColor}
            onPrimaryColorChange={setPrimaryColor}
            logoFile={logoFile}
            onLogoFileChange={(file) => {
              setLogoFile(file);
              if (file) setRemoveLogo(false);
            }}
            currentLogoUrl={branding.logoUrl !== '/images/nr-1comprova-logo.png' ? branding.logoUrl : null}
            removeLogo={removeLogo}
            onRemoveLogoChange={setRemoveLogo}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={saving}>
            Continuar depois
          </Button>
          <Button onClick={salvarIdentidade} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
