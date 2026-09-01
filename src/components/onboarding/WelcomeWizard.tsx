import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Palette, ShieldCheck, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import {
  ONBOARDING_STEPS,
  useOnboardingProgress,
  useSaveOnboardingProgress,
} from '@/hooks/useOnboardingProgress';

const STEP_META = [
  { key: 'branding', title: 'Identidade visual', icon: Palette },
  { key: 'estrutura', title: 'Estrutura', icon: Building2 },
  { key: 'equipe', title: 'Equipe', icon: Users },
  { key: 'nr1', title: 'Mapa de Riscos NR-1', icon: ShieldCheck },
] as const;

export function WelcomeWizard() {
  const navigate = useNavigate();
  const { companyId, role } = useAuth();
  const branding = useBranding();
  const isEligible = role === 'admin_empresa' && !branding.isLoading && !branding.isInternal;

  const { data: progress, isLoading } = useOnboardingProgress(isEligible);
  const save = useSaveOnboardingProgress();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Branding
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C8102E');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Estrutura
  const [departamentos, setDepartamentos] = useState('');
  const [cargos, setCargos] = useState('');

  const completed = useMemo(() => progress?.completed_steps ?? [], [progress]);

  useEffect(() => {
    if (!isEligible || isLoading) return;
    if (progress?.dismissed || progress?.completed_at) return;
    setStep(progress?.current_step ?? 0);
    setOpen(true);
  }, [isEligible, isLoading, progress]);

  useEffect(() => {
    if (branding.brandName) setBrandName((prev) => prev || branding.brandName);
    if (branding.primaryColor) setPrimaryColor((prev) => (prev === '#C8102E' ? branding.primaryColor : prev));
  }, [branding.brandName, branding.primaryColor]);

  if (!isEligible) return null;

  const markStep = async (index: number, done: boolean) => {
    const key = ONBOARDING_STEPS[index];
    const nextCompleted = done
      ? Array.from(new Set([...completed, key]))
      : completed.filter((s) => s !== key);
    const isLast = index === ONBOARDING_STEPS.length - 1;
    await save.mutateAsync({
      current_step: isLast ? index : index + 1,
      completed_steps: nextCompleted,
      ...(isLast ? { completed_at: new Date().toISOString() } : {}),
    });
    if (isLast) {
      setOpen(false);
      toast.success('Configuração inicial concluída!');
    } else {
      setStep(index + 1);
    }
  };

  const handleDismiss = async () => {
    setOpen(false);
    try {
      await save.mutateAsync({ dismissed: true, current_step: step, completed_steps: completed });
    } catch {
      /* silencioso */
    }
  };

  const salvarBranding = async () => {
    setSaving(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile && companyId) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${companyId}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (upErr) throw upErr;
        logoUrl = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.rpc('atualizar_branding_empresa' as never, {
        _brand_name: brandName.trim() || null,
        _brand_primary_color: primaryColor,
        _brand_logo_url: logoUrl,
      } as never);
      if (error) throw error;

      toast.success('Identidade visual salva.');
      await markStep(0, true);
    } catch (e) {
      toast.error('Não foi possível salvar a identidade visual.', {
        description: (e as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const salvarEstrutura = async () => {
    if (!companyId) return;
    const deps = departamentos.split(',').map((d) => d.trim()).filter(Boolean);
    const cgs = cargos.split(',').map((c) => c.trim()).filter(Boolean);
    if (deps.length === 0 && cgs.length === 0) {
      await markStep(1, false);
      return;
    }
    setSaving(true);
    try {
      if (deps.length) {
        const { error } = await supabase
          .from('departamentos')
          .insert(deps.map((nome) => ({ nome, company_id: companyId })));
        if (error) throw error;
      }
      if (cgs.length) {
        const { error } = await supabase
          .from('cargos')
          .insert(cgs.map((nome) => ({ nome, company_id: companyId })));
        if (error) throw error;
      }
      toast.success('Estrutura cadastrada.');
      await markStep(1, true);
    } catch (e) {
      toast.error('Não foi possível cadastrar a estrutura.', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const irPara = async (index: number, rota: string) => {
    await markStep(index, true);
    setOpen(false);
    navigate(rota);
  };

  const Icon = STEP_META[step].icon;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <DialogTitle>Vamos configurar sua conta</DialogTitle>
          </div>
          <DialogDescription>
            Passo {step + 1} de {STEP_META.length} — {STEP_META[step].title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {STEP_META.map((s, i) => (
            <Badge
              key={s.key}
              variant={i === step ? 'default' : completed.includes(s.key) ? 'secondary' : 'outline'}
            >
              {s.title}
            </Badge>
          ))}
        </div>

        <div className="space-y-4 py-2">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wz-brand">Nome de exibição</Label>
                <Input
                  id="wz-brand"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Como sua marca aparece no sistema"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wz-color">Cor principal</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="wz-color"
                    type="color"
                    className="h-10 w-16 p-1"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">{primaryColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wz-logo">Logo (opcional)</Label>
                <Input
                  id="wz-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wz-deps">Departamentos</Label>
                <Input
                  id="wz-deps"
                  value={departamentos}
                  onChange={(e) => setDepartamentos(e.target.value)}
                  placeholder="Ex.: Operações, Administrativo, Segurança do Trabalho"
                />
                <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wz-cargos">Cargos</Label>
                <Input
                  id="wz-cargos"
                  value={cargos}
                  onChange={(e) => setCargos(e.target.value)}
                  placeholder="Ex.: Analista, Supervisor, Técnico de Segurança"
                />
                <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
              </div>
            </>
          )}

          {step === 2 && (
            <p className="text-sm text-muted-foreground">
              Cadastre os primeiros colaboradores e libere o acesso deles. Cada colaborador recebe um
              e-mail com um link seguro para definir a própria senha.
            </p>
          )}

          {step === 3 && (
            <p className="text-sm text-muted-foreground">
              Tudo pronto! O Mapa de Riscos NR-1 é o próximo passo recomendado: monte o inventário de
              riscos psicossociais e o plano de ação da sua empresa.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Continuar depois
          </Button>
          <div className="flex gap-2">
            {step < STEP_META.length - 1 && (
              <Button variant="outline" onClick={() => markStep(step, false)} disabled={saving}>
                Pular
              </Button>
            )}
            {step === 0 && (
              <Button onClick={salvarBranding} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e continuar
              </Button>
            )}
            {step === 1 && (
              <Button onClick={salvarEstrutura} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e continuar
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => irPara(2, '/colaboradores')}>Cadastrar colaboradores</Button>
            )}
            {step === 3 && (
              <Button onClick={() => irPara(3, '/mapa-riscos-nr1')}>Ir para o NR-1</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
