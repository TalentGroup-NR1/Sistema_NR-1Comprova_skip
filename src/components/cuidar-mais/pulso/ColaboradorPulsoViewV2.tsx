import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Leaf,
  Heart,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  History,
  Star,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Trophy } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMeuStreakCuidar } from "@/hooks/useMeuStreakCuidar";
import { useMeusBadgesCuidar } from "@/hooks/useMeusBadgesCuidar";
import { useMinhasRecomendacoesCuidar } from "@/hooks/useMinhasRecomendacoesCuidar";
import {
  useActivePulseCampaign,
  useMyCampaignHistory,
  EMOJI_SCALE,
} from "@/hooks/usePulseCampaigns";
import { PulsoCampanhaModal } from "./PulsoCampanhaModal";
import { BibliotecaApoio } from "@/components/cuidar-mais/biblioteca/BibliotecaApoio";

const PULSOS_VISIVEIS = 8; // últimas 8 semanas no tracker

function StreakCard() {
  const { data, isLoading } = useMeuStreakCuidar();

  if (isLoading) return <Skeleton className="h-56 w-full rounded-xl" />;

  const streak = data?.streak_semanal ?? 0;
  const best = data?.best_streak ?? 0;
  const proximoMarco = streak < 4 ? 4 : streak < 12 ? 12 : 24;
  const progresso = Math.min(100, Math.round((streak / proximoMarco) * 100));

  // Tracker dos últimos N pulsos: marca como concluído conforme a sequência atual
  const completedCount = Math.min(streak, PULSOS_VISIVEIS);

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FEF3C7] flex items-center justify-center">
            <Flame className="h-5 w-5 text-[#D97706]" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-[18px] text-[#0F172A]">
              Sua sequência de pulsos
            </h3>
            <p className="text-[15px] font-medium text-[#059669]">
              {streak === 0
                ? "Responda o pulso desta semana e comece sua jornada"
                : `${streak} ${streak === 1 ? "pulso respondido" : "pulsos respondidos"} em sequência!`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[28px] font-bold leading-none text-[#0F172A]">{streak}</p>
          <p className="text-xs text-[#64748B] mt-1">
            {streak === 1 ? "semana" : "semanas"}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-[#64748B] mb-1.5">
          <span>Próximo marco: {proximoMarco} semanas</span>
          <span>
            {streak}/{proximoMarco}
          </span>
        </div>
        <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#DC2626] rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Tracker dos últimos pulsos (semanas) */}
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: PULSOS_VISIVEIS }).map((_, i) => {
          // index 0 = pulso mais antigo da janela, último = pulso atual
          const posicaoDesdeAtual = PULSOS_VISIVEIS - 1 - i; // 0 = atual
          const completed = posicaoDesdeAtual < completedCount;
          const isAtual = i === PULSOS_VISIVEIS - 1;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                  completed
                    ? "bg-[#059669] text-white"
                    : "bg-[#F1F5F9] text-[#94A3B8]",
                  isAtual && "ring-2 ring-[#DC2626] ring-offset-2"
                )}
                title={isAtual ? "Pulso desta semana" : `Pulso -${posicaoDesdeAtual}`}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" /> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F1F5F9]">
        <p className="text-[12px] text-[#64748B]">
          Cada círculo representa um pulso semanal (sexta-feira).
        </p>
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <Trophy className="h-3.5 w-3.5 text-[#D97706]" />
          Recorde: <span className="font-semibold text-[#0F172A]">{best}</span>
        </div>
      </div>
    </div>
  );
}

function JornadaCard() {
  const { data: badges, isLoading } = useMeusBadgesCuidar(1);
  const { data: recomendacoes } = useMinhasRecomendacoesCuidar(1);

  if (isLoading) return <Skeleton className="h-56 w-full rounded-xl" />;

  const badgeLabel = badges?.[0]?.badge_label ?? "Semana Leve";
  const rec = recomendacoes?.[0];
  const sugestao =
    rec?.recomendacao ??
    "Mantenha o que deu certo. Repita um hábito que funcionou bem para você nos últimos dias.";

  // Severidade baseada em score (0-100) e/ou tipo da recomendação
  const score = rec?.score ?? null;
  const tipoAlerta = ["alerta", "cansaco", "tendencia_negativa", "estresse", "critico"].includes(
    (rec?.tipo ?? "").toLowerCase()
  );
  let nivel: "alerta" | "atencao" | "ok" = "ok";
  if (score !== null && score < 40) nivel = "alerta";
  else if (score !== null && score < 65) nivel = "atencao";
  else if (tipoAlerta) nivel = "alerta";

  const styles = {
    alerta: {
      card: "bg-white border-2 border-[#DC2626] shadow-lg shadow-[#DC2626]/30 ring-2 ring-[#DC2626]/20 animate-pulse",
      icon: "text-[#DC2626]",
      badge: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]",
      box: "bg-[#FEF2F2] border border-[#FCA5A5]",
      iconBg: "bg-white",
      iconColor: "text-[#DC2626]",
      title: "text-[#991B1B]",
      text: "text-[#7F1D1D]",
      label: "Atenção urgente 🚨",
    },
    atencao: {
      card: "bg-white border border-[#F59E0B]",
      icon: "text-[#D97706]",
      badge: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
      box: "bg-[#FFFBEB] border border-[#FCD34D]",
      iconBg: "bg-white",
      iconColor: "text-[#D97706]",
      title: "text-[#92400E]",
      text: "text-[#78350F]",
      label: "Fique de olho ⚠️",
    },
    ok: {
      card: "bg-white border border-[#E2E8F0]",
      icon: "text-[#059669]",
      badge: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
      box: "bg-[#ECFDF5] border border-[#A7F3D0]",
      iconBg: "bg-white",
      iconColor: "text-[#059669]",
      title: "text-[#047857]",
      text: "text-[#047857]",
      label: "Sugestão da semana 💡",
    },
  }[nivel];

  return (
    <div className={cn("rounded-xl p-6 transition-all", styles.card)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Leaf className={cn("h-5 w-5", styles.icon)} />
          <h3 className="font-display font-semibold text-[18px] text-[#0F172A]">
            Sua Jornada de Bem-Estar
          </h3>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", styles.badge)}>
          {badgeLabel}
        </span>
      </div>
      <p className="text-[13px] text-[#64748B] mb-4">
        Conquistas e reflexões com base nas suas últimas respostas.
      </p>

      <div className={cn("rounded-lg p-4", styles.box)}>
        <div className="flex items-start gap-3">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", styles.iconBg)}>
            <Star className={cn("h-4 w-4", styles.iconColor)} />
          </div>
          <div>
            <p className={cn("text-[14px] font-semibold mb-1", styles.title)}>
              {styles.label}
            </p>
            <p className={cn("text-[13px] leading-relaxed", styles.text)}>{sugestao}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PesquisaAtivaCard() {
  const { data: campaign, isLoading } = useActivePulseCampaign();
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (!campaign) {
    return (
      <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 text-center">
        <Calendar className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
        <p className="text-sm text-[#64748B]">
          Nenhuma pesquisa ativa no momento.
        </p>
      </div>
    );
  }

  if (campaign.has_responded) {
    return (
      <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="h-8 w-8 text-[#059669]" />
        </div>
        <h3 className="font-display font-semibold text-[18px] text-[#047857] mb-1">
          Pesquisa respondida!
        </h3>
        <p className="text-[13px] text-[#047857] leading-relaxed">
          Obrigado por compartilhar seu sentimento com a gente. Seu bem-estar é
          nossa prioridade.
        </p>
      </div>
    );
  }

  const questionsCount = campaign.questions?.length || 0;
  const dataFim = format(parseISO(campaign.data_fim), "dd/MM/yyyy", { locale: ptBR });

  return (
    <>
      <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-[#FEE2E2] flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-[#DC2626]" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-[18px] text-[#0F172A] mb-1">
                {campaign.titulo}
              </h3>
              <p className="text-[13px] text-[#64748B] leading-relaxed">
                {campaign.descricao ||
                  "Sua opinião nos ajuda a construir um ambiente de trabalho cada vez melhor."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#64748B] mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {questionsCount} pergunta{questionsCount !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Responder até {dataFim}
            </span>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-colors animate-pulse shadow-lg shadow-[#DC2626]/40 ring-2 ring-[#DC2626]/30 ring-offset-2"
          >
            <Sparkles className="h-4 w-4" />
            Responder Agora
          </button>
        </div>
      </div>

      <PulsoCampanhaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        campaign={campaign}
      />
    </>
  );
}

function HistoricoCard() {
  const { data: history, isLoading } = useMyCampaignHistory();

  const getEmojiForScore = (score: number) =>
    EMOJI_SCALE.find((e) => e.score === score) || EMOJI_SCALE[2];

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#DC2626]" />
          <h3 className="font-display font-semibold text-[18px] text-[#0F172A]">
            Respostas Anteriores
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <p className="text-sm text-[#64748B] text-center py-6">
          Você ainda não respondeu nenhuma pesquisa.
        </p>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 5).map((item) => {
            const numericResponse = item.responses?.find(
              (r) => r.tipo === "escala_0_5"
            );
            const score = numericResponse ? parseInt(numericResponse.resposta) : null;
            const emojiData = score !== null ? getEmojiForScore(score) : null;

            return (
              <div
                key={item.campaign_id}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {emojiData && (
                    <span className="text-2xl shrink-0">{emojiData.emoji}</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#0F172A] truncate">
                      {item.titulo}
                    </p>
                    <p className="text-[12px] text-[#64748B]">
                      Respondido em{" "}
                      {format(parseISO(item.data_inicio), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-medium border border-[#A7F3D0]">
                    Concluída
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ColaboradorPulsoViewV2() {
  return (
    <div className="min-h-full bg-[#F8FAFC] -m-6 p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-bold text-[28px] text-[#0F172A] leading-none">
            Cuidar+
          </h1>
          <Heart className="h-6 w-6 text-[#DC2626] animate-pulse" fill="#DC2626" />
        </div>
        <p className="text-[14px] text-[#475569]">
          Seu espaço de bem-estar, equilíbrio e cuidado diário.
        </p>
      </div>

      {/* Grid de duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda (mais larga) */}
        <div className="lg:col-span-2 space-y-6">
          <BibliotecaApoio />
          <JornadaCard />
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          <PesquisaAtivaCard />
          <StreakCard />
          <HistoricoCard />
        </div>
      </div>
    </div>
  );
}
