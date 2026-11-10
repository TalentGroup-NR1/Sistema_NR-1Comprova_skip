import { useEffect, useState } from 'react';
import { Settings, Building2, Palette, Save, Loader2, AlertCircle, Phone, MapPin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { useCompanies } from '@/hooks/useCompanies';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { BrandingForm, uploadCompanyLogo } from '@/components/empresa/BrandingForm';
import { formatCNPJ, isValidCNPJ, SEGMENTOS, formatPhone } from '@/lib/validators/company';
import { formatCEP, isCepComplete, fetchAddressByCep } from '@/lib/cep';

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

  // Estados de Contato Institucional
  const [telefone, setTelefone] = useState('');
  const [segmento, setSegmento] = useState('');

  // Estados de Endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

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
      setTelefone(currentCompany.telefone ? formatPhone(currentCompany.telefone) : '');
      setSegmento(currentCompany.segmento || '');
      setCep(currentCompany.cep ? formatCEP(currentCompany.cep) : '');
      setLogradouro(currentCompany.logradouro || '');
      setNumero(currentCompany.numero || '');
      setComplemento(currentCompany.complemento || '');
      setBairro(currentCompany.bairro || '');
      setCidade(currentCompany.cidade || '');
      setEstado(currentCompany.estado || '');
    }
  }, [currentCompany, branding.primaryColor]);

  // Manipulador de digitação do CNPJ com máscara
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
    if (cnpjError) setCnpjError(null);
  };

  // Manipulador de digitação do telefone com máscara
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
  };

  // Manipulador de busca automática por CEP via ViaCEP
  const handleBuscarCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setBuscandoCep(true);
    try {
      const endereco = await fetchAddressByCep(cleanCep);
      if (endereco) {
        if (endereco.logradouro) setLogradouro(endereco.logradouro);
        if (endereco.bairro) setBairro(endereco.bairro);
        if (endereco.cidade) setCidade(endereco.cidade);
        if (endereco.estado) setEstado(endereco.estado);
        toast.info('Endereço preenchido automaticamente via ViaCEP.');
      } else {
        toast.warning('CEP não localizado no ViaCEP. Preencha o endereço manualmente.');
      }
    } catch {
      toast.error('Erro ao consultar ViaCEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCep(formatted);
    if (isCepComplete(formatted)) {
      await handleBuscarCep(formatted);
    }
  };

  const handleCepBlur = async () => {
    if (cep && isCepComplete(cep)) {
      await handleBuscarCep(cep);
    }
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

      // 2. Chamada à RPC centralizada que atualiza identidade, CNPJ, contato e endereço
      const { error } = await supabase.rpc('atualizar_branding_empresa' as never, {
        _brand_name: brandName.trim() || null,
        _brand_primary_color: primaryColor,
        _brand_logo_url: logoUrl,
        _cnpj: cleanCnpj ? formatCNPJ(cleanCnpj) : null,
        _remove_logo: removeLogo,
        _target_company_id: effectiveCompanyId,
        _telefone: telefone.trim(),
        _segmento: segmento || null,
        _cep: cep.trim(),
        _logradouro: logradouro.trim(),
        _numero: numero.trim(),
        _complemento: complemento.trim(),
        _bairro: bairro.trim(),
        _cidade: cidade.trim(),
        _estado: estado.trim().toUpperCase(),
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
              Personalize a identidade visual e mantenha os dados cadastrais, de contato e endereço atualizados.
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

          {/* Card: Contato Institucional */}
          <Card className="rounded-xl shadow-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Contato Institucional</CardTitle>
              </div>
              <CardDescription>
                Telefone institucional de contato e segmento econômico de atuação da empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa-telefone">Telefone institucional</Label>
                  <Input
                    id="empresa-telefone"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    disabled={saving || loadingCompanies}
                  />
                  <p className="text-xs text-muted-foreground">
                    Telefone comercial ou WhatsApp institucional da empresa.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa-segmento">Segmento de atuação</Label>
                  <Select
                    value={segmento}
                    onValueChange={setSegmento}
                    disabled={saving || loadingCompanies}
                  >
                    <SelectTrigger id="empresa-segmento">
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENTOS.map((seg) => (
                        <SelectItem key={seg} value={seg}>
                          {seg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ramo de atividade econômica principal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Endereço */}
          <Card className="rounded-xl shadow-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Endereço da Sede</CardTitle>
              </div>
              <CardDescription>
                Localização física da matriz ou filial vinculada a este cadastro.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Linha do CEP com indicador de busca */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="empresa-cep" className="flex items-center gap-2">
                  CEP
                  {buscandoCep && (
                    <span className="flex items-center gap-1 text-xs text-primary font-normal">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Consultando ViaCEP...
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="empresa-cep"
                    value={cep}
                    onChange={handleCepChange}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    disabled={saving || loadingCompanies || buscandoCep}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite o CEP para preenchimento automático do endereço via ViaCEP.
                </p>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="empresa-logradouro">Logradouro</Label>
                  <Input
                    id="empresa-logradouro"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua, Avenida, Praça..."
                    disabled={saving || loadingCompanies}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa-numero">Número</Label>
                  <Input
                    id="empresa-numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    disabled={saving || loadingCompanies}
                  />
                </div>
              </div>

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa-complemento">Complemento (opcional)</Label>
                  <Input
                    id="empresa-complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Sala 101, Bloco A, Galpão 2"
                    disabled={saving || loadingCompanies}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa-bairro">Bairro</Label>
                  <Input
                    id="empresa-bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Centro, Jardim América..."
                    disabled={saving || loadingCompanies}
                  />
                </div>
              </div>

              {/* Cidade e UF */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="empresa-cidade">Cidade</Label>
                  <Input
                    id="empresa-cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo, Campinas..."
                    disabled={saving || loadingCompanies}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa-estado">UF / Estado</Label>
                  <Input
                    id="empresa-estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    maxLength={2}
                    disabled={saving || loadingCompanies}
                  />
                </div>
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
