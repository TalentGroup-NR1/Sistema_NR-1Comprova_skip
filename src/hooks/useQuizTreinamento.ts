import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuizPerguntaPublica {
  id: string;
  treinamento_id: string;
  enunciado: string;
  alternativas: (string | { id?: string; letra?: string; texto?: string; label?: string })[];
  ordem: number;
}

export interface QuizGabaritoItem {
  pergunta_id: string;
  enunciado: string;
  resposta_usuario: string | null;
  resposta_correta: string;
  correta: boolean;
  explicacao: string | null;
}

export interface QuizResultadoCorrecao {
  tentativa_id: string;
  nota: number;
  nota_minima: number;
  aprovado: boolean;
  acertos: number;
  total_perguntas: number;
  tentativas_restantes: number;
  gabarito: QuizGabaritoItem[];
}

export interface QuizTentativa {
  id: string;
  user_id: string;
  treinamento_id: string;
  company_id: string;
  nota: number;
  aprovado: boolean;
  respostas: Record<string, string>;
  iniciada_em: string;
  finalizada_em: string | null;
}

const db = supabase as any;

/**
 * Busca perguntas do quiz via RPC segura (sem resposta_correta)
 */
export function useQuizPerguntas(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-perguntas-rpc", treinamentoId],
    queryFn: async (): Promise<QuizPerguntaPublica[]> => {
      if (!treinamentoId) return [];

      if (typeof db.rpc !== "function") return [];

      const { data, error } = await db.rpc("get_quiz_perguntas", {
        _treinamento_id: treinamentoId,
      });

      if (error) {
        console.error("Erro ao carregar perguntas do quiz:", error);
        return [];
      }

      return (data || []) as QuizPerguntaPublica[];
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Busca tentativas do colaborador logado para o treinamento
 */
export function useTentativasQuiz(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-tentativas", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) {
        return {
          tentativas: [] as QuizTentativa[],
          totalTentativas: 0,
          melhorNota: null as number | null,
          jaAprovado: false,
          ultimaTentativa: null as QuizTentativa | null,
        };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          tentativas: [] as QuizTentativa[],
          totalTentativas: 0,
          melhorNota: null,
          jaAprovado: false,
          ultimaTentativa: null,
        };
      }

      const { data, error } = await db
        .from("quiz_tentativas")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("user_id", user.id)
        .order("iniciada_em", { ascending: false });

      if (error) {
        console.error("Erro ao carregar tentativas de quiz:", error);
        return {
          tentativas: [] as QuizTentativa[],
          totalTentativas: 0,
          melhorNota: null,
          jaAprovado: false,
          ultimaTentativa: null,
        };
      }

      const list = (data || []) as QuizTentativa[];
      const total = list.length;
      const jaAprovado = list.some((t) => t.aprovado);
      const melhorNota = total > 0 ? Math.max(...list.map((t) => Number(t.nota || 0))) : null;

      return {
        tentativas: list,
        totalTentativas: total,
        melhorNota,
        jaAprovado,
        ultimaTentativa: list[0] || null,
      };
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Mutation para enviar respostas do quiz e receber correção server-side com gabarito
 */
export function useEnviarQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      treinamentoId,
      respostas,
    }: {
      treinamentoId: string;
      respostas: Record<string, string>;
    }): Promise<QuizResultadoCorrecao> => {
      if (typeof db.rpc !== "function") {
        throw new Error("RPC não disponível.");
      }

      const { data, error } = await db.rpc("corrigir_quiz_tentativa", {
        _treinamento_id: treinamentoId,
        _respostas: respostas,
      });

      if (error) {
        // Tratar mensagens de limite e validações da RPC
        const msg = error.message || "Erro ao corrigir quiz.";
        throw new Error(msg);
      }

      return data as QuizResultadoCorrecao;
    },
    onSuccess: (resultado, vars) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-tentativas", vars.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["progresso-global", vars.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", vars.treinamentoId] });

      if (resultado.aprovado) {
        toast.success(`Parabéns! Você foi aprovado com nota ${resultado.nota}%!`);
      } else {
        toast.error(`Nota ${resultado.nota}% (mínimo ${resultado.nota_minima}%).`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
