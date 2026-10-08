import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { IdentificacaoTab } from './tabs/IdentificacaoTab';
import { PromocoesTab } from './tabs/PromocoesTab';
import { DocumentacaoTab } from './tabs/DocumentacaoTab';
import { ContratoTab } from './tabs/ContratoTab';
import { ContatoEnderecoTab } from './tabs/ContatoEnderecoTab';
import { FormacaoAcademicaTab } from './tabs/FormacaoAcademicaTab';
import { TransferenciasTab } from './tabs/TransferenciasTab';
import { LgpdSection } from './LgpdSection';
import { useAuth } from '@/hooks/useAuth';
import {
  colaboradorSchema,
  formatDateToDisplay,
  formatCurrency,
  identificacaoSchema,
  documentacaoSchema,
  contratoSchema,
  contatoEnderecoSchema,
  formacaoAcademicaSchema,
} from '@/lib/validators/colaborador';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';
import { type Colaborador } from '@/hooks/useColaboradores';

interface ColaboradorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador?: Colaborador | null;
  onSubmit: (data: ColaboradorFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const tabs = [
  { id: 'identificacao', label: 'Identificação', schema: identificacaoSchema },
  { id: 'documentacao', label: 'Documentação', schema: documentacaoSchema },
  { id: 'contrato', label: 'Contrato', schema: contratoSchema },
  { id: 'contato', label: 'Contato e Endereço', schema: contatoEnderecoSchema },
  { id: 'formacao', label: 'Formação Acadêmica', schema: formacaoAcademicaSchema },
  { id: 'promocoes', label: 'Promoções', schema: null },
  { id: 'transferencias', label: 'Transferências', schema: null },
  { id: 'lgpd', label: 'LGPD', schema: null },
];

export function ColaboradorForm({
  open,
  onOpenChange,
  colaborador,
  onSubmit,
  isSubmitting,
}: ColaboradorFormProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isEditing = !!colaborador;
  const { isAdminMaster, isAdminEmpresa, role } = useAuth();
  const canSeeTransferencias = isAdminMaster || isAdminEmpresa || role === 'analista_rh';


  // Filter tabs based on whether we're editing (show Promoções only in edit mode)
  const visibleTabs = tabs.filter((t) => {
    if (t.id === 'promocoes') return isEditing;
    if (t.id === 'transferencias') return isEditing && canSeeTransferencias;
    if (t.id === 'lgpd') return isEditing && canSeeTransferencias;
    return true;
  });

  // Ensure currentTab is within bounds (fixes race condition when switching modes)
  const safeCurrentTab = Math.min(currentTab, visibleTabs.length - 1);

  const emptyDefaults: ColaboradorFormData = {
    avatar_url: '',
    matricula: '',
    full_name: '',
    social_name: '',
    birth_date: '',
    naturalidade: '',
    nacionalidade: 'Brasileira',
    marital_status: undefined,
    sex: undefined,
    ethnicity: undefined,
    education_level: undefined,
    dependentes: [],
    cpf: '',
    cnpj: '',
    razao_social: '',
    data_pagamento: '',
    rg: '',
    pis: '',
    ctps_numero: '',
    ctps_serie: '',
    contract_type: 'CLT',
    cargo_id: null,
    job_title: '',
    job_level: undefined,
    department: '',
    manager_name: '',
    gestor_id: null,
    is_banco_horas: false,
    jornada_diaria_minutos: 480,
    banco_horas_perfil_id: null,
    is_substituicao: false,
    substituicao_colaborador_id: null,
    base_salary: '',
    payment_method: undefined,
    work_shift_type: undefined,
    admission_date: '',
    work_schedule: '',
    work_schedule_id: null,
    email_pessoal: '',
    corporate_email: '',
    phone: '',
    telefone_secundario: '',
    address_zip_code: '',
    address_country: 'Brasil',
    address_state: '',
    address_city: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    status: 'ATIVO',
    cursos_realizados: '',
  };

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: emptyDefaults,
  });

  // Load colaborador data for editing
  useEffect(() => {
    if (colaborador) {
      form.reset({
        avatar_url: colaborador.avatar_url || '',
        matricula: colaborador.matricula || '',
        full_name: colaborador.full_name,
        social_name: colaborador.social_name || '',
        birth_date: formatDateToDisplay(colaborador.birth_date),
        naturalidade: colaborador.naturalidade || '',
        nacionalidade: colaborador.nacionalidade || 'Brasileira',
        marital_status: colaborador.marital_status as any,
        sex: colaborador.sex as any,
        ethnicity: colaborador.ethnicity as any,
        education_level: colaborador.education_level as any,
        dependentes: colaborador.dependentes?.map((dep) => ({
          id: dep.id,
          name: dep.name,
          birth_date: formatDateToDisplay(dep.birth_date),
          relationship: dep.relationship as any,
        })) || [],
        cpf: colaborador.cpf,
        cnpj: colaborador.cnpj || '',
        razao_social: (colaborador as any).razao_social || '',
        data_pagamento: (colaborador as any).data_pagamento || '',
        rg: (colaborador as any).rg || '',
        pis: (colaborador as any).pis || '',
        ctps_numero: (colaborador as any).ctps_numero || '',
        ctps_serie: (colaborador as any).ctps_serie || '',
        contract_type: (colaborador.contract_type as any) || 'CLT',
        cargo_id: (colaborador as any).cargo_id || null,
        job_title: colaborador.job_title,
        job_level: colaborador.job_level as any,
        department: colaborador.department,
        manager_name: colaborador.manager_name || '',
        gestor_id: colaborador.gestor_id || null,
        is_banco_horas: (colaborador as any).is_banco_horas ?? false,
        jornada_diaria_minutos: (colaborador as any).jornada_diaria_minutos ?? 480,
        banco_horas_perfil_id: (colaborador as any).banco_horas_perfil_id || null,
        is_substituicao: (colaborador as any).is_substituicao || false,
        substituicao_colaborador_id: (colaborador as any).substituicao_colaborador_id || null,
        base_salary: formatCurrency(colaborador.base_salary),
        payment_method: colaborador.payment_method as any,
        work_shift_type: colaborador.work_shift_type as any,
        admission_date: formatDateToDisplay(colaborador.admission_date),
        work_schedule: colaborador.work_schedule || '',
        work_schedule_id: (colaborador as any).work_schedule_id || null,
        email_pessoal: colaborador.email_pessoal || '',
        corporate_email: colaborador.corporate_email || '',
        phone: colaborador.phone || '',
        telefone_secundario: colaborador.telefone_secundario || '',
        address_zip_code: colaborador.address_zip_code || '',
        address_country: colaborador.address_country || 'Brasil',
        address_state: colaborador.address_state || '',
        address_city: colaborador.address_city || '',
        address_street: colaborador.address_street || '',
        address_number: colaborador.address_number || '',
        address_complement: colaborador.address_complement || '',
        address_neighborhood: colaborador.address_neighborhood || '',
        status: colaborador.status as any,
        cursos_realizados: (colaborador as any).cursos_realizados || '',
      });
    } else {
      form.reset(emptyDefaults);
    }
    setCurrentTab(0);
  }, [colaborador, form, open]);

  // Matrícula não é mais preenchida automaticamente — usa-se a matrícula do e-Social

  const validateCurrentTab = async (): Promise<boolean> => {
    const currentSchema = visibleTabs[safeCurrentTab].schema;
    if (!currentSchema) return true; // Promoções tab has no schema validation
    
    const values = form.getValues();
    
    try {
      await currentSchema.parseAsync(values);
      return true;
    } catch (error) {
      // Trigger validation to show errors
      const fieldNames = Object.keys(currentSchema.shape) as (keyof ColaboradorFormData)[];
      await form.trigger(fieldNames);
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentTab();
    if (isValid && safeCurrentTab < visibleTabs.length - 1) {
      setCurrentTab(safeCurrentTab + 1);
    }
  };

  const handleBack = () => {
    if (safeCurrentTab > 0) {
      setCurrentTab(safeCurrentTab - 1);
    }
  };

  const handleSubmit = async (data: ColaboradorFormData) => {
    await onSubmit({
      ...data,
      contract_type: data.contract_type || 'CLT',
    });
  };

  const handleRequestClose = useCallback(() => {
    if (form.formState.isDirty) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [form.formState.isDirty, onOpenChange]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if (!val) handleRequestClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(e) => { e.preventDefault(); handleRequestClose(); }}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Editar Colaborador: ${colaborador.full_name}` : 'Novo Colaborador'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs value={visibleTabs[safeCurrentTab].id} className="w-full">
                <div className="overflow-x-auto -mx-1 px-1">
                  <TabsList className="inline-flex w-auto min-w-full h-auto flex-wrap gap-1 p-1">
                    {visibleTabs.map((tab, index) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        onClick={() => setCurrentTab(index)}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-2.5 py-1.5"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="mt-6 min-h-[400px]">
                  <TabsContent value="identificacao" className="mt-0">
                    <IdentificacaoTab form={form} />
                  </TabsContent>

                  <TabsContent value="documentacao" className="mt-0">
                    <DocumentacaoTab form={form} />
                  </TabsContent>

                  <TabsContent value="contrato" className="mt-0">
                    <ContratoTab form={form} colaboradorId={colaborador?.id} />
                  </TabsContent>

                  <TabsContent value="contato" className="mt-0">
                    <ContatoEnderecoTab form={form} />
                  </TabsContent>

                  <TabsContent value="formacao" className="mt-0">
                    <FormacaoAcademicaTab form={form} />
                  </TabsContent>

                  {isEditing && colaborador && (
                    <TabsContent value="promocoes" className="mt-0">
                      <PromocoesTab
                        colaborador={{
                          id: colaborador.id,
                          company_id: colaborador.company_id,
                          full_name: colaborador.full_name,
                          job_title: colaborador.job_title,
                          base_salary: colaborador.base_salary,
                          job_level: colaborador.job_level,
                          department: colaborador.department,
                        }}
                      />
                    </TabsContent>
                  )}

                  {isEditing && colaborador && canSeeTransferencias && (
                    <TabsContent value="transferencias" className="mt-0">
                      <TransferenciasTab colaboradorId={colaborador.id} />
                    </TabsContent>
                  )}

                  {isEditing && colaborador && canSeeTransferencias && (
                    <TabsContent value="lgpd" className="mt-0">
                      <LgpdSection
                        colaboradorId={colaborador.id}
                        colaboradorNome={colaborador.full_name}
                        onDeleted={() => onOpenChange(false)}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              {/* Navigation Buttons - Hidden on read-only tabs */}
              {!['promocoes', 'transferencias', 'lgpd'].includes(visibleTabs[safeCurrentTab].id) && (
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={safeCurrentTab === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>

              <div className="flex items-center gap-2">
                    {safeCurrentTab < visibleTabs.length - 1 && !['promocoes', 'transferencias', 'lgpd'].includes(visibleTabs[safeCurrentTab + 1]?.id ?? '') && (
                      <Button type="button" onClick={handleNext}>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    {isEditing && (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Colaborador
                          </>
                        )}
                      </Button>
                    )}
                    {!isEditing && (safeCurrentTab >= visibleTabs.length - 1 || visibleTabs[safeCurrentTab + 1]?.id === 'promocoes') && (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Colaborador
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem informações não salvas. Se sair agora, todas as alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
