import { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Shield,
  Info,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  parseColaboradoresCSV,
  validateColaboradoresRows,
  applyCargoMatching,
  chunkArray,
  exportRejectedRowsToCSV,
  downloadTemplateColaboradores,
  type ValidatedColaboradorRow,
  type RejectedColaboradorRow,
  type ExistingContext,
} from '@/lib/importacaoColaboradores';
import {
  useCargos,
  useDepartamentos,
  useNiveisMaturidade,
} from '@/hooks/useEstruturaConfig';
import {
  useWorkSchedules,
  formatScheduleLabel,
} from '@/hooks/useWorkSchedules';

interface ImportarColaboradoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'completed';

const ROWS_PER_PAGE = 50;

export function ImportarColaboradoresDialog({
  open,
  onOpenChange,
}: ImportarColaboradoresDialogProps) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries de apoio para matching
  const { data: cargosData = [] } = useCargos(effectiveCompanyId);
  const { data: departamentosData = [] } = useDepartamentos(effectiveCompanyId);
  const { data: niveisData = [] } = useNiveisMaturidade(effectiveCompanyId);
  const { data: workSchedulesData = [] } = useWorkSchedules();

  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validRows, setValidRows] = useState<ValidatedColaboradorRow[]>([]);
  const [rejectedRows, setRejectedRows] = useState<RejectedColaboradorRow[]>([]);
  const [activeTab, setActiveTab] = useState<'valid' | 'rejected'>('valid');

  // Modal de criação assistida de cargos faltantes
  const [missingCargosModalOpen, setMissingCargosModalOpen] = useState(false);
  const [isCreatingCargos, setIsCreatingCargos] = useState(false);

  // Pagination
  const [validPage, setValidPage] = useState<number>(1);
  const [rejectedPage, setRejectedPage] = useState<number>(1);

  // Progress tracking
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setIsValidating(false);
    setValidRows([]);
    setRejectedRows([]);
    setActiveTab('valid');
    setValidPage(1);
    setRejectedPage(1);
    setProgressPercent(0);
    setProgressText('');
    setErrorReport(null);
    setImportedCount(0);
    setMissingCargosModalOpen(false);
    setIsCreatingCargos(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (step === 'importing') {
      return;
    }
    handleReset();
    onOpenChange(false);
  };

  const handleFileSelect = async (file: File) => {
    if (!effectiveCompanyId) {
      toast({
        title: 'Selecione uma empresa',
        description: 'É necessário ter uma empresa ativa selecionada para importar colaboradores.',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    setIsValidating(true);
    setErrorReport(null);

    try {
      const text = await file.text();
      const parsed = parseColaboradoresCSV(text);

      if (parsed.error) {
        toast({
          title: 'Erro no arquivo',
          description: parsed.error,
          variant: 'destructive',
        });
        setIsValidating(false);
        return;
      }

      if (parsed.rows.length === 0) {
        toast({
          title: 'Nenhuma linha encontrada',
          description: 'O arquivo não contém linhas de colaboradores válidas para leitura.',
          variant: 'destructive',
        });
        setIsValidating(false);
        return;
      }

      // 1. Fetch existing company records (CPFs, matrículas, e-mails)
      const { data: companyColabs, error: colabsError } = await supabase
        .from('colaboradores')
        .select('cpf, matricula, email_pessoal, corporate_email')
        .eq('company_id', effectiveCompanyId);

      if (colabsError) {
        console.error('Error fetching existing company colaboradores:', colabsError);
        throw new Error('Falha ao consultar colaboradores existentes na empresa');
      }

      const existingCompanyCpfs = new Set<string>();
      const existingCompanyMatriculas = new Set<string>();
      const existingCompanyEmails = new Set<string>();

      (companyColabs || []).forEach((c) => {
        if (c.cpf) existingCompanyCpfs.add(c.cpf.replace(/\D/g, ''));
        if (c.matricula) existingCompanyMatriculas.add(c.matricula.trim().toLowerCase());
        if (c.email_pessoal) existingCompanyEmails.add(c.email_pessoal.trim().toLowerCase());
        if (c.corporate_email) existingCompanyEmails.add(c.corporate_email.trim().toLowerCase());
      });

      // 2. Extract unique personal emails from file to call check_emails_exist_batch
      const candidateEmails = Array.from(
        new Set(
          parsed.rows
            .map((r) => (r.email_pessoal || '').trim().toLowerCase())
            .filter(Boolean)
        )
      );

      const platformOccupiedEmails = new Set<string>();

      if (candidateEmails.length > 0) {
        const { data: batchResult, error: rpcError } = await supabase.rpc(
          'check_emails_exist_batch',
          {
            p_emails: candidateEmails,
            p_company_id: effectiveCompanyId,
          }
        );

        if (rpcError) {
          console.error('Error calling check_emails_exist_batch RPC:', rpcError);
        } else if (batchResult) {
          (batchResult as Array<{ email: string; exists: boolean }>).forEach((item) => {
            if (item.exists) {
              platformOccupiedEmails.add(item.email.toLowerCase());
            }
          });
        }
      }

      // 3. Estrutura Organizacional para Matching
      const cargosAtivos = cargosData
        .filter((c) => c.ativo !== false)
        .map((c) => ({ id: c.id, nome: c.nome }));

      const departamentosAtivos = departamentosData
        .filter((d) => d.ativo !== false)
        .map((d) => ({ id: d.id, nome: d.nome }));

      const niveisAtivos = niveisData
        .filter((n) => n.ativo !== false)
        .map((n) => ({ id: n.id, nome: n.nome }));

      const workSchedulesAtivos = workSchedulesData
        .filter((ws) => ws.ativo !== false)
        .map((ws) => ({
          id: ws.id,
          nome: ws.nome,
          label: formatScheduleLabel(ws),
        }));

      // 4. Validação completa com matching e sanitização
      const context: ExistingContext = {
        existingCompanyCpfs,
        existingCompanyMatriculas,
        existingCompanyEmails,
        platformOccupiedEmails,
        cargosAtivos,
        departamentosAtivos,
        niveisAtivos,
        workSchedulesAtivos,
      };

      const { valid, rejected } = validateColaboradoresRows(parsed.rows, context);

      setValidRows(valid);
      setRejectedRows(rejected);
      setActiveTab(valid.length > 0 ? 'valid' : 'rejected');
      setStep('preview');
    } catch (err: any) {
      toast({
        title: 'Falha no processamento',
        description: err.message || 'Erro inesperado ao validar a planilha.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Cargos faltantes detectados nas linhas válidas
  const missingCargos = Array.from(
    new Set(
      validRows
        .filter((r) => !r.cargo_matched && r.raw.cargo?.trim())
        .map((r) => r.raw.cargo.trim())
    )
  );

  const handleCreateMissingCargos = async () => {
    if (!effectiveCompanyId || missingCargos.length === 0) return;
    setIsCreatingCargos(true);

    try {
      const payload = missingCargos.map((nome) => ({
        company_id: effectiveCompanyId,
        nome,
        ativo: true,
      }));

      const { data: created, error: insertErr } = await supabase
        .from('cargos')
        .insert(payload)
        .select('id, nome');

      if (insertErr) throw insertErr;

      // Invalida cache de cargos
      await queryClient.invalidateQueries({ queryKey: ['cargos', effectiveCompanyId] });

      // Busca lista atualizada de cargos
      const { data: freshCargos, error: fetchErr } = await supabase
        .from('cargos')
        .select('id, nome')
        .eq('company_id', effectiveCompanyId)
        .eq('ativo', true);

      if (fetchErr) throw fetchErr;

      const updatedCargosList = freshCargos || [];
      const updatedRows = applyCargoMatching(validRows, updatedCargosList);
      setValidRows(updatedRows);

      toast({
        title: 'Cargos cadastrados com sucesso',
        description: `${created?.length || missingCargos.length} cargo(s) cadastrado(s) na Estrutura Organizacional e vinculados às linhas.`,
      });

      setMissingCargosModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar cargos',
        description: err.message || 'Não foi possível cadastrar os cargos faltantes.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCargos(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!effectiveCompanyId) {
      toast({
        title: 'Empresa não selecionada',
        variant: 'destructive',
      });
      return;
    }

    if (validRows.length === 0) {
      toast({
        title: 'Nenhum registro válido',
        description: 'Não há colaboradores válidos para importar.',
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setProgressPercent(0);
    setProgressText('Preparando lotes...');
    setErrorReport(null);

    const CHUNK_SIZE = 50;
    const chunks = chunkArray(validRows, CHUNK_SIZE);
    let successfullyImported = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentChunk = chunks[i];
        const chunkIndex = i + 1;
        const totalChunks = chunks.length;

        setProgressText(
          `Gravando lote ${chunkIndex} de ${totalChunks} (${successfullyImported + currentChunk.length} de ${validRows.length})...`
        );
        setProgressPercent(Math.round((i / totalChunks) * 100));

        // Format payload adhering strictly to specifications:
        // user_id = null (pendente), status = 'ATIVO', sanitizações de CPF, matrícula null, etc.
        const payload = currentChunk.map((r) => ({
          company_id: effectiveCompanyId,
          user_id: null,
          status: 'ATIVO' as const,
          address_country: 'Brasil',
          full_name: r.full_name,
          cpf: r.cpf, // Formato estrito com máscara formatCPF
          birth_date: r.birth_date_iso,
          admission_date: r.admission_date_iso,
          contract_type: r.contract_type as any,
          cargo_id: r.cargo_id || null, // FK para tabela cargos (dispara trg_sync_colaborador_cargo)
          job_title: r.job_title,
          department: r.department,
          base_salary: r.base_salary,
          payment_method: r.payment_method as any,
          email_pessoal: r.email_pessoal,
          corporate_email: r.email_corporativo || null,
          matricula: r.matricula || null, // explicitamente null se vazio para respeitar constraint
          // Opcionais expandidos v2
          phone: r.phone || null,
          telefone_secundario: r.telefone_secundario || null,
          address_zip_code: r.address_zip_code || null,
          address_street: r.address_street || null,
          address_number: r.address_number || null,
          address_complement: r.address_complement || null,
          address_neighborhood: r.address_neighborhood || null,
          address_city: r.address_city || null,
          address_state: r.address_state || null,
          social_name: r.social_name || null,
          naturalidade: r.naturalidade || null,
          nacionalidade: r.nacionalidade || 'Brasileira',
          marital_status: r.marital_status as any,
          sex: r.sex as any,
          ethnicity: r.ethnicity as any,
          education_level: r.education_level as any,
          work_shift_type: r.work_shift_type as any,
          job_level: r.job_level || null,
          work_schedule_id: r.work_schedule_id || null,
          work_schedule: r.work_schedule || null,
          cnpj: r.cnpj || null,
          razao_social: r.razao_social || null,
          data_pagamento: r.data_pagamento || null,
          is_banco_horas: r.is_banco_horas || false,
          rg: r.rg || null,
          pis: r.pis || null,
          ctps_numero: r.ctps_numero || null,
          ctps_serie: r.ctps_serie || null,
        }));

        const { error: insertError } = await supabase
          .from('colaboradores')
          .insert(payload);

        if (insertError) {
          console.error(`Error inserting chunk ${chunkIndex}:`, insertError);
          const remainingRows = validRows.length - successfullyImported;
          throw new Error(
            `Falha na gravação do lote ${chunkIndex}/${totalChunks}: ${insertError.message}. Foram salvos ${successfullyImported} colaboradores; ${remainingRows} ficaram pendentes de reenvio.`
          );
        }

        successfullyImported += currentChunk.length;
      }

      setProgressPercent(100);
      setProgressText('Concluído!');
      setImportedCount(successfullyImported);
      setStep('completed');

      // Invalidate relevant react-query caches
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-pendentes'] });

      toast({
        title: 'Importação concluída',
        description: `${successfullyImported} colaboradores cadastrados como pendentes.`,
      });
    } catch (err: any) {
      setErrorReport(err.message || 'Erro durante a importação em lote.');
      setImportedCount(successfullyImported);
      setStep('preview');
      toast({
        title: 'Erro parcial na importação',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Pagination slices
  const validTotalPages = Math.ceil(validRows.length / ROWS_PER_PAGE) || 1;
  const pagedValidRows = validRows.slice(
    (validPage - 1) * ROWS_PER_PAGE,
    validPage * ROWS_PER_PAGE
  );

  const rejectedTotalPages = Math.ceil(rejectedRows.length / ROWS_PER_PAGE) || 1;
  const pagedRejectedRows = rejectedRows.slice(
    (rejectedPage - 1) * ROWS_PER_PAGE,
    rejectedPage * ROWS_PER_PAGE
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <DialogTitle className="text-xl">Importação em Massa de Colaboradores</DialogTitle>
              </div>
              {step === 'preview' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Trocar Planilha
                </Button>
              )}
            </div>
            <DialogDescription>
              {step === 'upload' &&
                'Envie uma planilha CSV para cadastrar múltiplos colaboradores como pendentes.'}
              {step === 'preview' &&
                `Revise a análise de ${validRows.length + rejectedRows.length} linhas do arquivo "${fileName}".`}
              {step === 'importing' && 'Processando e gravando colaboradores no banco de dados...'}
              {step === 'completed' && 'Resultado final da operação de importação em massa.'}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="py-6 space-y-4 overflow-y-auto">
              {/* Banner 1: Dica PGR / NR-1 */}
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-sm font-semibold">
                  Dica: Vinculação com PGR / NR-1
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 leading-relaxed">
                  Para vincular automaticamente os colaboradores ao PGR/NR-1, cadastre antes cargos e departamentos no módulo{' '}
                  <a
                    href="/estrutura-organizacional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5"
                  >
                    Estrutura Organizacional
                    <ExternalLink className="h-3 w-3 inline ml-0.5" />
                  </a>{' '}
                  (com seus respectivos GHEs), usando exatamente os mesmos nomes na planilha.
                </AlertDescription>
              </Alert>

              {/* Banner 2: Confidencialidade LGPD */}
              <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-sm font-semibold">
                  Aviso de Confidencialidade (LGPD)
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 leading-relaxed">
                  Esta planilha pode conter dados pessoais (CPF, RG, PIS). Envie por canal seguro e exclua o arquivo após a importação. O arquivo NÃO é armazenado pelo sistema.
                </AlertDescription>
              </Alert>

              {/* Card de Estratégia de Cadastro Pendente */}
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm font-semibold">
                  Estratégia de Cadastro Pendente
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  Os colaboradores serão cadastrados diretamente com status{' '}
                  <strong className="text-foreground">ATIVO</strong> e sem conta de login (
                  <code>user_id = null</code>). Nenhuma senha é criada e nenhum e-mail é disparado
                  neste momento. O acesso ao sistema poderá ser liberado individualmente a qualquer
                  momento através da aba{' '}
                  <strong className="text-foreground">Gerenciamento de Acessos &gt; Pendentes</strong>.
                </AlertDescription>
              </Alert>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isValidating
                    ? 'border-primary/50 bg-primary/5 cursor-wait'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => !isValidating && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isValidating) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {isValidating ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium">Validando estrutura, duplicidades e cargos...</p>
                    <p className="text-xs text-muted-foreground">
                      Verificando CPFs, e-mails na plataforma e casamento com a Estrutura Organizacional.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">
                        Arraste seu arquivo CSV aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Suporta arquivos .CSV delimitados por ponto e vírgula (;) ou vírgula (,)
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 pointer-events-none">
                      Selecionar arquivo do computador
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Ainda não possui o modelo padrão v2?</p>
                  <p className="text-xs text-muted-foreground">
                    Baixe a planilha completa com todas as colunas de contato, endereço e exemplos preenchidos.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplateColaboradores}
                  className="text-xs shrink-0"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Baixar Modelo v2 (.csv)
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && (
            <div className="flex-1 flex flex-col min-h-0 py-3 space-y-3 overflow-hidden">
              {errorReport && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{errorReport}</AlertDescription>
                </Alert>
              )}

              {/* Alerta de Cargos Faltantes com Botão de Criação Assistida */}
              {missingCargos.length > 0 && (
                <Alert className="bg-amber-500/10 border-amber-500/30 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <AlertTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {missingCargos.length} cargo(s) não cadastrado(s) na Estrutura Organizacional
                      </AlertTitle>
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Colaboradores com cargo não cadastrado ficarão desconectados do PGR/GHE até que o cargo seja criado.
                      </AlertDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-500/50 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 text-xs shrink-0"
                      onClick={() => setMissingCargosModalOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Cadastrar {missingCargos.length} cargo(s) faltante(s)
                    </Button>
                  </div>
                </Alert>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={validRows.length > 0 ? 'default' : 'secondary'} className="text-xs font-normal">
                    {validRows.length} {validRows.length === 1 ? 'linha válida' : 'linhas válidas'}
                  </Badge>
                  {rejectedRows.length > 0 && (
                    <Badge variant="destructive" className="text-xs font-normal">
                      {rejectedRows.length} {rejectedRows.length === 1 ? 'rejeitada' : 'rejeitadas'}
                    </Badge>
                  )}
                </div>

                {rejectedRows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportRejectedRowsToCSV(rejectedRows)}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Baixar Rejeitadas (.csv)
                  </Button>
                )}
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'valid' | 'rejected')}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="valid" className="text-xs">
                    Aprovadas ({validRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs">
                    Rejeitadas com Motivo ({rejectedRows.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA: VÁLIDAS */}
                <TabsContent value="valid" className="flex-1 flex flex-col min-h-0 mt-2">
                  {validRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                      <AlertTriangle className="h-10 w-10 mb-2 opacity-50 text-warning" />
                      <p className="text-sm font-medium">Nenhuma linha válida encontrada</p>
                      <p className="text-xs">Revise a aba de rejeitadas para corrigir a planilha.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden">
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                            <TableRow>
                              <TableHead className="w-[50px] text-xs">Linha</TableHead>
                              <TableHead className="text-xs">Nome Completo</TableHead>
                              <TableHead className="text-xs">CPF</TableHead>
                              <TableHead className="text-xs">Cargo (Casamento)</TableHead>
                              <TableHead className="text-xs">Departamento</TableHead>
                              <TableHead className="text-xs">Regime</TableHead>
                              <TableHead className="text-xs">Salário</TableHead>
                              <TableHead className="text-xs">E-mail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pagedValidRows.map((row) => (
                              <TableRow key={row.linha}>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  #{row.linha}
                                </TableCell>
                                <TableCell className="font-medium text-xs">
                                  {row.full_name}
                                </TableCell>
                                <TableCell className="font-mono text-xs">{row.cpf}</TableCell>
                                <TableCell className="text-xs">
                                  {row.cargo_matched ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                    >
                                      ✓ {row.cargo_nome_oficial}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                    >
                                      ⚠️ {row.job_title}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {row.departamento_matched ? (
                                    <span className="text-foreground">{row.departamento_nome_oficial}</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      ⚠️ {row.department}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {row.contract_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {row.base_salary.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {row.email_pessoal}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination for Valid Rows */}
                      {validTotalPages > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
                          <span>
                            Mostrando {(validPage - 1) * ROWS_PER_PAGE + 1} a{' '}
                            {Math.min(validPage * ROWS_PER_PAGE, validRows.length)} de{' '}
                            {validRows.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={validPage === 1}
                              onClick={() => setValidPage((p) => p - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2">
                              Pág. {validPage} de {validTotalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={validPage === validTotalPages}
                              onClick={() => setValidPage((p) => p + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ABA: REJEITADAS */}
                <TabsContent value="rejected" className="flex-1 flex flex-col min-h-0 mt-2">
                  {rejectedRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                      <CheckCircle2 className="h-10 w-10 mb-2 opacity-50 text-success" />
                      <p className="text-sm font-medium">Nenhuma linha rejeitada!</p>
                      <p className="text-xs">Todas as linhas da planilha foram validadas com sucesso.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden">
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                            <TableRow>
                              <TableHead className="w-[60px] text-xs">Linha</TableHead>
                              <TableHead className="text-xs">Nome / CPF Informado</TableHead>
                              <TableHead className="text-xs">E-mail</TableHead>
                              <TableHead className="text-xs">Motivos da Rejeição</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pagedRejectedRows.map((r) => (
                              <TableRow key={r.linha} className="hover:bg-destructive/5">
                                <TableCell className="font-mono text-xs font-semibold text-destructive">
                                  #{r.linha}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <span className="font-medium">
                                    {r.raw.nome_completo || '(Sem nome)'}
                                  </span>
                                  <span className="font-mono text-muted-foreground block text-[11px]">
                                    {r.raw.cpf || '(Sem CPF)'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {r.raw.email_pessoal || '(Sem e-mail)'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {r.motivos.map((m, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="destructive"
                                        className="text-[11px] font-normal"
                                      >
                                        {m}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination for Rejected Rows */}
                      {rejectedTotalPages > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
                          <span>
                            Mostrando {(rejectedPage - 1) * ROWS_PER_PAGE + 1} a{' '}
                            {Math.min(rejectedPage * ROWS_PER_PAGE, rejectedRows.length)} de{' '}
                            {rejectedRows.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={rejectedPage === 1}
                              onClick={() => setRejectedPage((p) => p - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2">
                              Pág. {rejectedPage} de {rejectedTotalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={rejectedPage === rejectedTotalPages}
                              onClick={() => setRejectedPage((p) => p + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* STEP 3: IMPORTING */}
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="w-full max-w-md space-y-2 text-center">
                <p className="text-sm font-semibold">{progressText}</p>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Gravando colaboradores em lotes atômicos. Por favor, não feche esta janela.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETED */}
          {step === 'completed' && (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">Importação Finalizada com Sucesso!</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  <strong className="text-foreground">{importedCount} colaboradores</strong> foram
                  cadastrados com status <strong>ATIVO</strong> como pendentes (sem login e sem senha).
                  {rejectedRows.length > 0 && (
                    <>
                      {' '}
                      <strong className="text-destructive">{rejectedRows.length} linhas</strong> com
                      pendências foram ignoradas.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <span>O que fazer agora?</span>
                </div>
                <p>
                  Os colaboradores já aparecem na listagem do módulo Colaboradores com seus cargos,
                  endereços e contatos vinculados. Quando desejar liberar o acesso ao sistema para cada um,
                  acesse a aba <strong>Gerenciamento de Acessos &gt; Pendentes</strong> e utilize o botão{' '}
                  <strong>Liberar Acesso</strong> para disparar o link seguro de primeira senha.
                </p>
              </div>

              {rejectedRows.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div className="text-xs">
                    <p className="font-semibold text-destructive">Linhas com rejeição</p>
                    <p className="text-muted-foreground">
                      Baixe a lista das {rejectedRows.length} linhas com os motivos para correção.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportRejectedRowsToCSV(rejectedRows)}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Baixar Rejeitadas (.csv)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <DialogFooter className="border-t pt-4 flex flex-row items-center justify-between">
            {step === 'upload' && (
              <>
                <Button variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <div />
              </>
            )}

            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={validRows.length === 0}
                  className="gradient-primary text-primary-foreground shadow"
                >
                  Confirmar importação ({validRows.length}{' '}
                  {validRows.length === 1 ? 'colaborador' : 'colaboradores'})
                </Button>
              </>
            )}

            {step === 'completed' && (
              <div className="flex items-center justify-between w-full">
                <Button variant="ghost" onClick={handleClose}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    handleClose();
                    navigate('/gerenciamento-acessos');
                  }}
                  className="gradient-primary text-primary-foreground"
                >
                  Ir para Pendentes (Acessos)
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Criação Assistida de Cargos Faltantes */}
      <AlertDialog open={missingCargosModalOpen} onOpenChange={setMissingCargosModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cadastrar Cargos Faltantes</AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes {missingCargos.length} cargo(s) serão criados na Estrutura Organizacional com status ativo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-lg bg-muted/40 border text-xs">
            {missingCargos.map((cargoNome) => (
              <div key={cargoNome} className="font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {cargoNome}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Após a criação, as linhas correspondentes da planilha serão vinculadas automaticamente.
            Você poderá configurar CBO e GHE de cada cargo posteriormente no módulo Estrutura Organizacional.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingCargos}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCreatingCargos}
              onClick={handleCreateMissingCargos}
              className="gradient-primary text-primary-foreground"
            >
              {isCreatingCargos ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando cargos...
                </>
              ) : (
                `Confirmar e Criar (${missingCargos.length})`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
