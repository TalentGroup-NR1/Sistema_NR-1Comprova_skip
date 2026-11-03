import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { mapPostgresError } from "./usePgrImportacao";
import { toast } from "sonner";
import { gerarRelatorioPgrPDF } from "@/lib/relatorioPgrPDF";
import { getShareBaseUrl } from "@/lib/appUrl";

export interface PgrPlanoAcao {
  id: string;
  company_id: string;
  pgr_importacao_id: string;
  risco_id?: string | null;
  acao: string;
  por_que: string | null;
  onde: string | null;
  como: string | null;
  custo_estimado: number;
  custo_real: number;
  responsavel_id: string | null;
  cargo_responsavel: string | null;
  prazo: string | null;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "em_andamento" | "concluida" | "validada";
  evidencia_url: string | null;
  historico: any[];
  created_at: string;
  updated_at: string;
  // JOIN data — responsavel_id FK → colaboradores.id
  colaboradores?: {
    full_name: string | null;
  } | null;
  // JOIN data — risco_id FK → pgr_riscos.id
  pgr_riscos?: {
    id: string;
    nome: string;
    categoria: string;
  } | null;
}

export interface CreateAcaoInput {
  pgr_importacao_id: string;
  company_id: string;
  acao: string;
  prioridade?: "alta" | "media" | "baixa";
  prazo?: string | null;
  responsavel_id?: string | null;
  cargo_responsavel?: string | null;
  risco_id?: string | null;
  por_que?: string | null;
  onde?: string | null;
  como?: string | null;
  custo_estimado?: number;
}

export interface DeleteAcaoInput {
  id: string;
  pgr_importacao_id: string;
}

export interface PgrAcaoExecucao {
  id: string;
  acao_id: string;
  company_id: string;
  data: string;
  o_que_foi_feito: string;
  como: string | null;
  custo: number;
  quem_executou: string | null;
  onde: string | null;
  evidencia_url: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  colaboradores?: {
    full_name: string | null;
  } | null;
}

export function appendHistorico(historicoAtual: any[] | null, mudanca: string, autorId: string): any[] {
  return [
    ...(historicoAtual || []),
    {
      data: new Date().toISOString(),
      autor_id: autorId,
      mudanca
    }
  ];
}

export function calcularProgresso5W2H(acao: Partial<PgrPlanoAcao>): { preenchidos: number; total: number; completo: boolean } {
  const total = 6;
  let preenchidos = 0;
  
  if (acao.por_que && acao.por_que.trim().length > 0) preenchidos++;
  if (acao.onde && acao.onde.trim().length > 0) preenchidos++;
  if (acao.como && acao.como.trim().length > 0) preenchidos++;
  if (acao.prazo) preenchidos++;
  if (acao.responsavel_id) preenchidos++;
  // custo_estimado só conta se for estritamente maior que 0, pois 0 é o default para itens não orçados.
  if (typeof acao.custo_estimado === 'number' && acao.custo_estimado > 0) preenchidos++;

  return { preenchidos, total, completo: preenchidos === total };
}

export function validarMudancaStatus(acao: Partial<PgrPlanoAcao>, novoStatus: string): { permitido: boolean; mostrarAviso: boolean } {
  if (novoStatus === "concluida" || novoStatus === "validada") {
    const progresso = calcularProgresso5W2H(acao);
    if (!progresso.completo) {
      // Modo Warning decidido: permite a mudança mas avisa
      return { permitido: true, mostrarAviso: true };
    }
  }
  return { permitido: true, mostrarAviso: false };
}

export function useAcoesPgr(pgrImportacaoId: string) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["pgr-acoes", pgrImportacaoId],
    enabled: !!companyId && !!pgrImportacaoId,
    queryFn: async (): Promise<PgrPlanoAcao[]> => {
      const { data, error } = await (supabase as any)
        .from("pgr_plano_acao")
        .select(`
          *,
          colaboradores:responsavel_id (full_name),
          pgr_riscos:risco_id (id, nome, categoria),
          execucoes:pgr_acao_execucoes(
            *,
            colaboradores:quem_executou(full_name)
          )
        `)
        .eq("company_id", companyId)
        .eq("pgr_importacao_id", pgrImportacaoId)
        .order("created_at", { ascending: true });
        
      if (error) {
        console.error("[usePgrAcoes] Erro ao buscar ações (Supabase raw):", error.code, error.message, error.details);
        throw new Error(mapPostgresError(error));
      }
      return data || [];
    },
  });
}

// ──────────────────────────────────────────────────────────────
// useCreateAcao: Inserir nova ação no plano de ação do PGR
// ──────────────────────────────────────────────────────────────
export function useCreateAcao() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAcaoInput) => {
      const email = user?.email || (await supabase.auth.getUser()).data.user?.email || "desconhecido";

      const payload = {
        pgr_importacao_id: input.pgr_importacao_id,
        company_id: input.company_id,
        acao: input.acao,
        prioridade: input.prioridade || "media",
        prazo: input.prazo ?? null,
        responsavel_id: input.responsavel_id ?? null,
        cargo_responsavel: input.cargo_responsavel ?? null,
        risco_id: input.risco_id ?? null,
        por_que: input.por_que ?? null,
        onde: input.onde ?? null,
        como: input.como ?? null,
        custo_estimado: input.custo_estimado ?? 0,
        custo_real: 0,
        status: "pendente",
        historico: [
          {
            acao: "criado",
            por: email,
            em: new Date().toISOString(),
          },
        ],
      };

      const { data, error } = await (supabase as any)
        .from("pgr_plano_acao")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(mapPostgresError(error));
      return data as PgrPlanoAcao;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["pgr-acoes", variables.pgr_importacao_id] });
      qc.invalidateQueries({ queryKey: ["pgr-importacoes"] });
      qc.invalidateQueries({ queryKey: ["pgr-riscos", variables.pgr_importacao_id] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// useUpdateAcao: Atualizar ação existente com sanitização e histórico
// ──────────────────────────────────────────────────────────────
export function useUpdateAcao() {
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      pgrImportacaoId,
      updates,
      mensagemLog
    }: {
      id: string;
      pgrImportacaoId: string;
      updates: Partial<PgrPlanoAcao>;
      mensagemLog?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      
      // Sanitização: não permitir alterar chaves de integridade/relacionamento estrito
      const {
        company_id: _c,
        pgr_importacao_id: _p,
        id: _i,
        created_at: _ca,
        updated_at: _ua,
        colaboradores: _colab,
        pgr_riscos: _pr,
        execucoes: _ex,
        ...cleanUpdates
      } = updates as any;

      // Busca o histórico atual
      const { data: currentData, error: fetchErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .select("historico")
        .eq("id", id)
        .single();
        
      if (fetchErr) throw new Error(mapPostgresError(fetchErr));
      
      const historicoAtual = currentData?.historico || [];
      const novoHistorico = mensagemLog 
        ? appendHistorico(historicoAtual, mensagemLog, user.id)
        : [...historicoAtual];

      const { data, error: updateErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .update({ ...cleanUpdates, historico: novoHistorico })
        .eq("id", id)
        .eq("company_id", companyId)
        .select();
        
      if (updateErr) throw new Error(mapPostgresError(updateErr));
      if (!data || data.length === 0) {
        throw new Error("Nenhuma linha atualizada — verifique o status enviado e a permissão");
      }
      return { id, pgrImportacaoId };
    },
    onMutate: async ({ pgrImportacaoId, id, updates }) => {
      await qc.cancelQueries({ queryKey: ["pgr-acoes", pgrImportacaoId] });
      const previousAcoes = qc.getQueryData<PgrPlanoAcao[]>(["pgr-acoes", pgrImportacaoId]);
      
      if (previousAcoes) {
        qc.setQueryData<PgrPlanoAcao[]>(["pgr-acoes", pgrImportacaoId], old => 
          old?.map(acao => acao.id === id ? { ...acao, ...updates } : acao)
        );
      }
      return { previousAcoes, pgrImportacaoId };
    },
    onError: (err, newAcao, context) => {
      console.error("[useUpdateAcao] Erro na mutação:", err);
      toast.error(`Erro ao atualizar ação: ${err.message}`);
      if (context?.previousAcoes) {
        qc.setQueryData(["pgr-acoes", context.pgrImportacaoId], context.previousAcoes);
      }
    },
    onSettled: (data) => {
      if (data?.pgrImportacaoId) {
        qc.invalidateQueries({ queryKey: ["pgr-acoes", data.pgrImportacaoId] });
      }
    },
  });
}

// ──────────────────────────────────────────────────────────────
// useDeleteAcao: Excluir ação com salvaguarda de execuções
// ──────────────────────────────────────────────────────────────
export function useDeleteAcao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pgr_importacao_id }: DeleteAcaoInput) => {
      // 1. Verificar se há execuções vinculadas
      const { count, error: countErr } = await (supabase as any)
        .from("pgr_acao_execucoes")
        .select("*", { count: "exact", head: true })
        .eq("acao_id", id);

      if (countErr) throw new Error(mapPostgresError(countErr));

      if (typeof count === "number" && count > 0) {
        throw new Error(
          `Esta ação tem ${count} execução(ões) registrada(s). Remova as execuções antes de excluir.`
        );
      }

      // 2. Deletar a ação
      const { error: deleteErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .delete()
        .eq("id", id);

      if (deleteErr) throw new Error(mapPostgresError(deleteErr));
      return { success: true, id, pgr_importacao_id };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["pgr-acoes", variables.pgr_importacao_id] });
      qc.invalidateQueries({ queryKey: ["pgr-riscos", variables.pgr_importacao_id] });
    },
  });
}

export function useUploadEvidenciaAcao() {
  const companyId = useEffectiveCompanyId();
  return useMutation({
    mutationFn: async ({ file }: { file: File }): Promise<string> => {
      if (!companyId) throw new Error("Empresa não identificada");
      
      const storagePath = `${companyId}/evidencias/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos_analise")
        .upload(storagePath, file, { upsert: false });
        
      if (uploadError) throw new Error(`Falha no upload: ${mapPostgresError(uploadError)}`);
      return storagePath;
    }
  });
}

export function useSincronizarAcoes() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (p_importacao_id: string) => {
      if (!user) throw new Error("Não autenticado");
      
      const { error } = await supabase.rpc('sincronizar_pgr_acoes', { p_importacao_id });
      
      if (error) {
        console.error("[usePgrAcoes] Erro na RPC de sincronização:", error.code, error.message, error.details);
        throw new Error(`Falha ao sincronizar: ${mapPostgresError(error)}`);
      }
      
      return p_importacao_id;
    },
    onSuccess: (p_importacao_id) => {
      qc.invalidateQueries({ queryKey: ["pgr-acoes", p_importacao_id] });
    }
  });
}

export function useExecucoesAcao(acaoId: string) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["pgr-execucoes", acaoId],
    enabled: !!companyId && !!acaoId,
    queryFn: async (): Promise<PgrAcaoExecucao[]> => {
      const { data, error } = await (supabase as any)
        .from("pgr_acao_execucoes")
        .select(`
          *,
          colaboradores:quem_executou (full_name)
        `)
        .eq("company_id", companyId)
        .eq("acao_id", acaoId)
        .order("data", { ascending: false });
        
      if (error) throw new Error(mapPostgresError(error));
      return data || [];
    },
  });
}

export function useCreateExecucao() {
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (execucao: Omit<PgrAcaoExecucao, "id" | "company_id" | "criado_por" | "created_at" | "updated_at" | "colaboradores">) => {
      if (!user || !companyId) throw new Error("Não autenticado ou sem empresa");

      const insertData = {
        ...execucao,
        company_id: companyId,
        criado_por: user.id
      };

      const { data, error } = await (supabase as any)
        .from("pgr_acao_execucoes")
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(mapPostgresError(error));
      
      const { data: currentAcao, error: fetchAcaoErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .select("custo_real, historico")
        .eq("id", execucao.acao_id)
        .single();
        
      if (!fetchAcaoErr && currentAcao) {
         const novoCusto = Number(currentAcao.custo_real || 0) + Number(execucao.custo);
         const novoHistorico = appendHistorico(
           currentAcao.historico,
           `Custo real atualizado via execução automática`,
           user.id
         );

         await (supabase as any)
           .from("pgr_plano_acao")
           .update({ 
             custo_real: novoCusto,
             historico: novoHistorico 
           })
           .eq("id", execucao.acao_id);
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pgr-execucoes", data.acao_id] });
      qc.invalidateQueries({ queryKey: ["pgr-acoes"] });
    },
    onError: (err) => {
      toast.error(`Erro ao salvar execução: ${err.message}`);
    }
  });
}

export function useGerarRelatorioEvidenciaPgr() {
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pgrImportacaoId, acoes }: { pgrImportacaoId: string, acoes: any[] }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: imp, error: errImp } = await supabase
        .from("pgr_importacoes")
        .select("id, status, dados_empresa, riscos, plano_acao")
        .eq("id", pgrImportacaoId)
        .maybeSingle();
      if (errImp) throw new Error("Falha no Supabase: " + errImp.message);
      if (!imp) throw new Error("PGR não encontrado (foi excluído ou o ID é inválido)");

      const { data: emp, error: errEmp } = await supabase
        .from("companies")
        .select("name, cnpj, logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (errEmp) throw new Error("Falha no Supabase ao buscar empresa: " + errEmp.message);
      if (!emp) throw new Error("Empresa não encontrada");

      const { data: pgrDoc } = await supabase
        .from("pgr_documentos")
        .select("created_at, vigencia_inicio, responsavel_tecnico")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: prof, error: errProf } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (errProf) throw new Error("Falha no Supabase ao buscar perfil: " + errProf.message);

      const emitente = {
        nome: prof?.full_name || user.email || "Usuário",
        email: user.email || "",
        cargo: "",
      };

      const pgrInfo = {
        id: imp.id,
        data_elaboracao: imp.dados_empresa?.data_elaboracao || (pgrDoc as any)?.data_elaboracao || pgrDoc?.vigencia_inicio || pgrDoc?.created_at || imp.data_elaboracao,
        validade: imp.dados_empresa?.validade || imp.validade,
        responsavel_tecnico: imp.dados_empresa?.responsavel_tecnico || (pgrDoc?.responsavel_tecnico as any)?.nome || imp.responsavel_tecnico,
        cargo_responsavel: imp.dados_empresa?.cargo_responsavel || (pgrDoc?.responsavel_tecnico as any)?.titulo || imp.cargo_responsavel,
        registro_profissional: imp.dados_empresa?.registro_profissional || (pgrDoc?.responsavel_tecnico as any)?.registro,
        status: imp.status
      };

      const { blob: pdfBlob, docId } = await gerarRelatorioPgrPDF({
        pgrInfo,
        acoes,
        riscos: imp.riscos || [],
        planoAcao: imp.plano_acao || [],
        empresa: emp,
        emitente,
        verificacaoUrlBase: getShareBaseUrl(),
      });

      const buf = await pdfBlob.arrayBuffer();
      const enc = new Uint8Array(buf);
      const digest = await crypto.subtle.digest("SHA-256", enc);
      const hashBlob = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");

      await supabase
        .from("pgr_relatorio_evidencias")
        .insert({
          company_id: companyId,
          pgr_importacao_id: pgrImportacaoId,
          doc_id: docId,
          hash: hashBlob,
          emitido_por: user.id
        });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PGR_EVIDENCIA_${pgrImportacaoId.slice(0,8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    },
    onSuccess: () => {
      toast.success("Relatório de execução gerado");
    },
    onError: (err: any) => {
      toast.error("Falha ao gerar o relatório: " + err.message);
    }
  });
}
