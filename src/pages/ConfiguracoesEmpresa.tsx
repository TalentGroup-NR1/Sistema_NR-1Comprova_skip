import { useEffect, useState } from 'react';
import { Settings, Building2, Palette, Save, Loader2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { useCompanies } from '@/hooks/useCompanies';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { BrandingForm, uploadCompanyLogo } from '@/components/empresa/BrandingForm';
import { formatCNPJ, isValidCNPJ } from '@/lib/validators/company';

export default function ConfiguracoesEmpresa() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const branding = useBranding();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const effectiveCompanyId = useEffectiveCompanyId();

  // Empresa correspondente
  const currentCompany = companies?.find((c) => c.id === effectiveCompanyId);

  // Estados de Identidade Visual
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C8102E');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Estados de Dados Cadastrais
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  // Estado de submissão
  const [saving, setSaving] = useState(false);

  // Preenche os dados quando a empresa for carregada
  useEffect(() => {
    if (currentCompany) {
      setBrandName(currentCompany.brand_name || currentCompany.name || '');
      setPrimaryColor(
        currentCompany.brand_primary_color ||
          currentCompany.primary_color ||
          branding.primaryColor ||
          '#C8102E'
      );
      setCnpj(currentCompany.cnpj ? formatCNPJ(currentCompany.cnpj) : '');
    }
  }, [currentCompany, branding.primaryColor]);

  // Manipulador de digitação do CNPJ com máscara
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
    if (cnpjError) setCnpjError(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCompanyId) {
      toast.error('Empresa não identificada.');
      return;
    }

    // Validação de CNPJ
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length > 0) {
      if (!isValidCNPJ(cleanCnpj)) {
        setCnpjError('CNPJ inválido. Confira os 14 dígitos informados.');
        toast.error('CNPJ inválido. Verifique os dígitos digitados.');
        return;
      }

      // Verificação rápida de duplicidade no front-end
      const { data: duplicateCompanies, error: dupErr } = await supabase
        .from('companies')
        .select('id, name, cnpj')
        .neq('id', effectiveCompanyId);

      if (!dupErr && duplicateCompanies) {
        const hasDuplicate = duplicateCompanies.some(
          (c) => c.cnpj && c.cnpj.replace(/\D/g, '') === cleanCnpj
        );
        if (hasDuplicate) {
          const msg = 'Este CNPJ já está cadastrado em outra empresa no sistema.';
          setCnpjError(msg);
          toast.error(msg);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // 1. Upload do logotipo (se houver novo arquivo)
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadCompanyLogo(effectiveCompanyId, logoFile);
      }

      // 2. Chamada à RPC centralizada que atualiza identidade e CNPJ em uma única transação
      const { error } = await supabase.rpc('atualizar_branding_empresa' as never, {
        _brand_name: brandName.trim() || null,
        _brand_primary_color: primaryColor,
        _brand_logo_url: logoUrl,
        _cnpj: cleanCnpj ? formatCNPJ(cleanCnpj) : null,
        _remove_logo: removeLogo,
      } as never);

      if (error) {
        if (
          error.message.includes('CNPJ já cadastrado') ||
          error.message.includes('unique') ||
          error.message.includes('duplicate key')
        ) {
          throw new Error('Este CNPJ já está cadastrado em outra empresa no sistema.');
        }
        throw error;
      }

      // 3. Atualiza cache de empresas e contexto do tema/branding
      await qc.invalidateQueries({ queryKey: ['companies'] });

      // Reseta flags de arquivo e remoção pendente
      setLogoFile(null);
      setRemoveLogo(false);
      setCnpjError(null);

      toast.success('Configurações da empresa atualizadas com sucesso!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      if (message.includes('CNPJ')) {
        setCnpjError(message);
      }
      toast.error('Não foi possível salvar as alterações.', {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const currentLogo =
    currentCompany?.brand_logo_url ||
    currentCompany?.logo_url ||
    (branding.logoUrl !== '/images/nr-1comprova-logo.png' ? branding.logoUrl : null);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Cabeçalho da página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
              <Settings className="h-7 w-7 text-primary" />
              Configurações da Empresa
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalize a identidade visual e mantenha os dados cadastrais da sua empresa atualizados.
            </p>
          </div>

          <Button
            onClick={handleSalvar}
            disabled={saving || loadingCompanies}
            className="gradient-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        <form onSubmit={handleSalvar} className="space-y-6">
          {/* Card: Identidade Visual */}
          <Card className="rounded-xl shadow-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Identidade Visual</CardTitle>
              </div>
              <CardDescription>
                Defina o nome de exibição, a paleta de cor primária e o logotipo exibido nos menus e relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <BrandingForm
                brandName={brandName}
                onBrandNameChange={setBrandName}
                primaryColor={primaryColor}
                onPrimaryColorChange={setPrimaryColor}
                logoFile={logoFile}
                onLogoFileChange={setLogoFile}
                currentLogoUrl={currentLogo}
                removeLogo={removeLogo}
                onRemoveLogoChange={setRemoveLogo}
                disabled={saving || loadingCompanies}
              />
            </CardContent>
          </Card>

          {/* Card: Dados Cadastrais */}
          <Card className="rounded-xl shadow-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Dados Cadastrais</CardTitle>
              </div>
              <CardDescription>
                Informações jurídicas e fiscais vinculadas aos laudos, documentos e inventários NR-1.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2 max-w-md">
                <Label htmlFor="empresa-cnpj">CNPJ</Label>
                <Input
                  id="empresa-cnpj"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  disabled={saving || loadingCompanies}
                  className={cnpjError ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Formato padrão: XX.XXX.XXX/XXXX-XX. O CNPJ deve ser único no sistema.
                </p>

                {cnpjError && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      {cnpjError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botão de rodapé */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving || loadingCompanies}
              size="lg"
              className="gradient-primary text-primary-foreground min-w-[180px] shadow-md hover:shadow-lg transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando alterações...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
