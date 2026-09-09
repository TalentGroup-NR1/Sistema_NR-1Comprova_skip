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

  // Branding
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C8102E');
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

  // Condição estrita e padronizada:
  // 1. Aguarda sessão pronta, companyId carregado, branding carregado e fetch do progresso finalizado (sem race condition)
  const isReady =
    !authLoading &&
    !!companyId &&
    !branding.isLoading &&
    isEligible &&
    progressFetched &&
    !progressFetching;

  // 2. Se completed_at estiver preenchido OU dismissed = true -> NUNCA abrir, independente de qualquer outra flag.
  // 3. SÓ abre quando não existir registro de onboarding_progress (progress === null) OU (completed_at IS NULL AND dismissed IS FALSE).
  const isCompletedOrDismissed = Boolean(completedAt || dismissed);
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
        hasLocalFlag,
      });
    }
  }, [companyId, progress, completedAt, dismissed, hasLocalFlag, authLoading, isEligible]);

  // Se o banco indicar que já foi concluído ou dispensado, remove qualquer flag local residual
  useEffect(() => {
    if (isCompletedOrDismissed) {
      cleanLocalFlags();
    }
  }, [isCompletedOrDismissed]);

  // Sincroniza o estado de abertura garantindo que, enquanto carrega ou se já concluído, open permaneça false
  useEffect(() => {
    setOpen(shouldOpen);
  }, [shouldOpen]);

  useEffect(() => {
    if (branding.brandName) setBrandName((prev) => prev || branding.brandName);
    if (branding.primaryColor) setPrimaryColor((prev) => (prev === '#C8102E' ? branding.primaryColor : prev));
  }, [branding.brandName, branding.primaryColor]);

  if (!isEligible) return null;

  const handleDismiss = async () => {
    cleanLocalFlags();
    setOpen(false);
    try {
      if (companyId) {
        await supabase
          .from('onboarding_progress' as never)
          .upsert(
            {
              company_id: companyId,
              dismissed: true,
              current_step: 0,
              completed_steps: progress?.completed_steps ?? ['branding'],
            } as never,
            { onConflict: 'company_id' } as never
          );
        qc.invalidateQueries({ queryKey: ['onboarding-progress'] });
      }
    } catch {
      /* silencioso */
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
      if (logoFile && effectiveCompanyId) {
        logoUrl = await uploadCompanyLogo(effectiveCompanyId, logoFile);
      }

      const { data: updatedCompanyId, error } = await supabase.rpc('atualizar_branding_empresa' as never, {
        _brand_name: brandName.trim() || null,
        _brand_primary_color: primaryColor,
        _brand_logo_url: logoUrl,
      } as never);
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
            onLogoFileChange={setLogoFile}
            currentLogoUrl={branding.logoUrl !== '/images/Logo_NR1_Transparente.png' ? branding.logoUrl : null}
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
