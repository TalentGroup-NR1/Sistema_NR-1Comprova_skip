import { useMemo, useState, useEffect } from "react";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Plane,
  AlertTriangle,
  Clock,
  Plus,
  Sparkles,
  CalendarCheck2,
  CheckCircle2,
  Sun,
  Luggage,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMeuColaborador, useCancelarSolicitacaoFerias, useEnsureMeusPeriodos } from "@/hooks/useMinhasFerias";
import { useFeriasColaborador, PeriodoAquisitivo } from "@/hooks/useFerias";
import { SolicitarFeriasDialog } from "@/components/ferias/SolicitarFeriasDialog";
import { isVinculoElegivelFerias } from "@/lib/feriasEngine";

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  planejado: { label: "Pendente", bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
  aprovado: { label: "Aprovada", bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  gozado: { label: "Gozada", bg: "bg-[#F1F5F9]", text: "text-[#475569]" },
  cancelado: { label: "Cancelada", bg: "bg-[#F1F5F9]", text: "text-[#475569]" },
};

export default function MinhasFerias() {
  const { data: colab, isLoading: loadingColab } = useMeuColaborador();
  const { data, isLoading, refetch } = useFeriasColaborador(colab?.id ?? null);
  const ensurePeriodos = useEnsureMeusPeriodos();
  const cancelar = useCancelarSolicitacaoFerias();
  const [openSolicitar, setOpenSolicitar] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  const vinculoElegivel = isVinculoElegivelFerias((colab as any)?.contract_type);

  useEffect(() => {
    if (colab && vinculoElegivel && !hasSynced && !ensurePeriodos.isPending) {
      ensurePeriodos.mutate(undefined, {
        onSuccess: () => { setHasSynced(true); refetch(); },
        onError: () => setHasSynced(true),
      });
    }
  }, [colab, vinculoElegivel, hasSynced]);

  const periodoAtivo = useMemo((): PeriodoAquisitivo | null => {
    if (!data?.periodos?.length) return null;
    const today = new Date();
    const ordenados = [...data.periodos].sort(
      (a, b) =>
        new Date(a.data_inicio_aquisitivo).getTime() -
        new Date(b.data_inicio_aquisitivo).getTime(),
    );
    for (const p of ordenados) {
      const fim = parseISO(p.data_fim_aquisitivo);
      if (isBefore(fim, today) || fim.getTime() === today.getTime()) {
        const gozados = data.gozos
          .filter((g) => g.periodo_aquisitivo_id === p.id && g.status !== "cancelado")
          .reduce((s, g) => s + g.dias_gozados, 0);
        if (gozados < p.dias_adquiridos) return p;
      }
    }
    return ordenados[ordenados.length - 1] ?? null;
  }, [data]);

  const saldo = useMemo(() => {
    if (!periodoAtivo || !data) return { adquiridos: 30, gozados: 0, restantes: 30, frac: 0, gozosAtivos: [] as any[] };
    const gozosAtivos = data.gozos.filter(
      (g) => g.periodo_aquisitivo_id === periodoAtivo.id && g.status !== "cancelado",
    );
    const gozados = gozosAtivos.reduce((s, g) => s + g.dias_gozados, 0);
    return {
      adquiridos: periodoAtivo.dias_adquiridos,
      gozados,
      restantes: periodoAtivo.dias_adquiridos - gozados,
      frac: gozosAtivos.length,
      gozosAtivos,
    };
  }, [data, periodoAtivo]);

  const jaTemPeriodoMaior14 = useMemo(
    () => saldo.gozosAtivos.some((g: any) => g.dias_gozados >= 14),
    [saldo.gozosAtivos],
  );

  const diasLimite = periodoAtivo ? differenceInDays(parseISO(periodoAtivo.data_limite_gozo), new Date()) : null;
  const urgente = diasLimite !== null && diasLimite < 30 && saldo.restantes > 0;
  const progressoPct = saldo.adquiridos > 0 ? Math.round((saldo.gozados / saldo.adquiridos) * 100) : 0;

  const proximaImportante = useMemo(() => {
    const futuras = (data?.gozos ?? [])
      .filter((g) => g.status !== "cancelado" && parseISO(g.data_inicio_gozo) >= new Date())
      .sort((a, b) => parseISO(a.data_inicio_gozo).getTime() - parseISO(b.data_inicio_gozo).getTime());
    if (futuras[0]) {
      return {
        data: format(parseISO(futuras[0].data_inicio_gozo), "dd/MM/yyyy", { locale: ptBR }),
        label: "Início das próximas férias",
      };
    }
    if (periodoAtivo) {
      return {
        data: format(parseISO(periodoAtivo.data_limite_gozo), "dd/MM/yyyy", { locale: ptBR }),
        label: "Limite para gozar suas férias",
      };
    }
    return null;
  }, [data, periodoAtivo]);

  const proximaFeriasAprovada = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const aprovadasFuturas = (data?.gozos ?? [])
      .filter((g) => g.status === "aprovado" && parseISO(g.data_inicio_gozo) >= hoje)
      .sort((a, b) => parseISO(a.data_inicio_gozo).getTime() - parseISO(b.data_inicio_gozo).getTime());
    return aprovadasFuturas[0] ?? null;
  }, [data]);

  if (loadingColab || isLoading || ensurePeriodos.isPending) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!colab) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Colaborador não encontrado</AlertTitle>
          <AlertDescription>
            Seu usuário não está vinculado a um cadastro de colaborador. Procure o RH.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (!vinculoElegivel) {
    return (
      <MainLayout>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Férias não aplicáveis para este tipo de vínculo</AlertTitle>
          <AlertDescription>
            Seu cadastro está como{" "}
            <strong>{(colab as any).contract_type ?? "vínculo não informado"}</strong>, que não
            possui direito legal a férias pela CLT. Em caso de dúvida, procure o RH.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const podeSolicitar = !!periodoAtivo && saldo.restantes > 0 && saldo.frac < 3;
  const primeiroNome = (colab.full_name || "").split(" ")[0];
  const ordenadosDesc = [...(data?.gozos ?? [])].sort(
    (a, b) => parseISO(b.data_inicio_gozo).getTime() - parseISO(a.data_inicio_gozo).getTime(),
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[28px] font-bold text-[#0F172A] leading-tight">
                {primeiroNome ? `Olá, ${primeiroNome}` : "Minhas Férias"}
              </h1>
              <Plane className="h-7 w-7 text-[#DC2626] -rotate-12" strokeWidth={2.25} />
            </div>
            <p className="text-sm text-[#475569] mt-1">
              Planeje seus momentos de descanso e recarregue suas energias.
            </p>
          </div>
          <Button
            onClick={() => setOpenSolicitar(true)}
            disabled={!podeSolicitar}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg px-6 py-3 h-auto font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Solicitar férias
          </Button>
        </div>

        {/* CONTAGEM REGRESSIVA - férias aprovadas e futuras */}
        {proximaFeriasAprovada && (
          <CountdownFerias
            inicio={parseISO(proximaFeriasAprovada.data_inicio_gozo)}
            fim={parseISO(proximaFeriasAprovada.data_fim_gozo)}
            dias={proximaFeriasAprovada.dias_gozados}
          />
        )}

        {/* SALDO CARD */}
        {periodoAtivo ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
              {/* esquerda */}
              <div className="space-y-5 min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#64748B] font-semibold">
                  <CalendarCheck2 className="h-4 w-4" /> Saldo de férias
                </div>

                <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[48px] leading-none font-bold ${saldo.restantes > 0 ? "text-[#059669]" : "text-[#94A3B8]"}`}>
                        {saldo.restantes}
                      </span>
                      <span className="text-base text-[#475569] font-medium">dias</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">disponíveis</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[32px] leading-none font-semibold text-[#475569]">{saldo.gozados}</span>
                      <span className="text-sm text-[#475569]">dias</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">já aproveitados</p>
                  </div>
                </div>

                {/* progress */}
                <div>
                  <div className="text-xs text-[#475569] mb-1.5">
                    Período aquisitivo:{" "}
                    <span className="font-medium text-[#0F172A]">
                      {format(parseISO(periodoAtivo.data_inicio_aquisitivo), "dd/MM/yyyy", { locale: ptBR })} a{" "}
                      {format(parseISO(periodoAtivo.data_fim_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="relative h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${urgente ? "bg-[#DC2626]" : "bg-[#059669]"}`}
                      style={{ width: `${Math.min(100, progressoPct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#64748B] mt-1.5">
                    {progressoPct}% do seu período de descanso planejado
                  </p>
                </div>

                {/* próximas datas */}
                <div className="pt-2 space-y-2">
                  <p className="text-sm font-semibold text-[#0F172A]">Próximas datas importantes</p>
                  {proximaImportante && (
                    <div className="flex items-center gap-2 text-sm text-[#475569]">
                      <CalendarIcon className="h-4 w-4 text-[#64748B]" />
                      <span>{proximaImportante.label}</span>
                      <span className="ml-auto font-medium text-[#0F172A]">{proximaImportante.data}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <CalendarIcon className="h-4 w-4 text-[#64748B]" />
                    <span>Limite para solicitar férias</span>
                    <span className="ml-auto font-medium text-[#0F172A]">
                      {format(parseISO(periodoAtivo.data_limite_gozo), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ilustração direita */}
              <div className="hidden lg:flex items-center justify-center w-[260px] h-[200px]">
                <VacationIllustration />
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Você ainda não tem direito a férias</AlertTitle>
            <AlertDescription>
              É necessário completar 12 meses desde sua admissão ({format(parseISO(colab.admission_date), "dd/MM/yyyy", { locale: ptBR })}) para adquirir o direito.
            </AlertDescription>
          </Alert>
        )}

        {/* BANNER BEM-ESTAR */}
        {periodoAtivo && saldo.restantes > 0 && (
          <div className="flex items-center gap-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-5 py-4">
            <div className="h-10 w-10 rounded-full bg-white/70 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#047857]" />
            </div>
            <p className="text-sm font-medium text-[#047857] leading-relaxed">
              <span className="font-semibold">Bem-estar também é produtividade! 🌟</span>{" "}
              Você ainda tem <span className="font-semibold">{saldo.restantes} dias</span> para descansar, viajar e aproveitar o que realmente importa.
            </p>
          </div>
        )}

        {/* SOLICITAÇÕES RECENTES */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">Solicitações recentes</h2>
            <span className="text-xs text-[#64748B]">
              {ordenadosDesc.length} {ordenadosDesc.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {!ordenadosDesc.length ? (
            <div className="text-center py-10 text-[#64748B]">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma solicitação registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[#64748B] border-b border-[#E2E8F0]">
                    <th className="py-3 pr-4 font-semibold">Período</th>
                    <th className="py-3 pr-4 font-semibold">Dias</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Solicitado em</th>
                    <th className="py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadosDesc.map((g) => {
                    const meta = statusMeta[g.status] ?? statusMeta.cancelado;
                    return (
                      <tr key={g.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-4 pr-4 text-[#0F172A]">
                          {format(parseISO(g.data_inicio_gozo), "dd/MM/yyyy", { locale: ptBR })} —{" "}
                          {format(parseISO(g.data_fim_gozo), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="py-4 pr-4 text-[#475569]">{g.dias_gozados} dias</td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.text.replace("text-", "bg-")}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-[#475569]">
                          {format(parseISO(g.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="py-4 text-right">
                          {g.status === "planejado" ? (
                            <Button variant="ghost" size="sm" onClick={() => setCancelId(g.id)} className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#B91C1C]">
                              Cancelar
                            </Button>
                          ) : (
                            <span className="text-[#94A3B8] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BANNER INFERIOR */}
        <div className="bg-[#F8F6F3] border border-[#E2E8F0] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="h-5 w-5 text-[#DC2626] -rotate-12" />
            <h3 className="font-display text-lg font-semibold text-[#0F172A]">
              Planeje suas férias com tranquilidade
            </h3>
          </div>
          <p className="text-sm text-[#475569] mb-5">
            O planejamento é a chave para aproveitar cada momento. Programe suas férias com antecedência e garanta uma experiência incrível!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              icon={<CalendarIcon className="h-5 w-5 text-[#DC2626]" />}
              title="Programe com antecedência"
              description="Escolha as melhores datas para você e para o time."
            />
            <StepCard
              icon={<CheckCircle2 className="h-5 w-5 text-[#059669]" />}
              title="Aguarde a aprovação"
              description="Seu gestor receberá a solicitação e responderá em breve."
            />
            <StepCard
              icon={<Sun className="h-5 w-5 text-[#D97706]" />}
              title="Desconecte e aproveite!"
              description="Curta cada momento — você merece esse descanso."
            />
          </div>
        </div>
      </div>

      {periodoAtivo && (
        <SolicitarFeriasDialog
          open={openSolicitar}
          onOpenChange={setOpenSolicitar}
          colaboradorId={colab.id}
          companyId={colab.company_id}
          periodoAquisitivoId={periodoAtivo.id}
          diasRestantes={saldo.restantes}
          fracionamentosAtuais={saldo.frac}
          jaTemPeriodoMaior14={jaTemPeriodoMaior14}
          podeFracionar={true}
        />
      )}

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá sua solicitação de férias. Você poderá criar uma nova depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (cancelId) {
                  await cancelar.mutateAsync(cancelId);
                  setCancelId(null);
                }
              }}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex gap-3 items-start">
      <div className="h-10 w-10 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-[#0F172A]">{title}</p>
        <p className="text-xs text-[#64748B] leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function VacationIllustration() {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* sol */}
      <circle cx="210" cy="50" r="22" fill="#FEF3C7" />
      <circle cx="210" cy="50" r="14" fill="#FCD34D" opacity="0.6" />
      {/* folha tropical */}
      <path d="M30 180 Q 40 110 110 90 Q 70 115 60 180 Z" fill="#A7F3D0" />
      <path d="M50 180 Q 60 130 105 105" stroke="#059669" strokeWidth="1.5" fill="none" />
      {/* mala */}
      <rect x="100" y="110" width="80" height="70" rx="8" fill="#DC2626" />
      <rect x="100" y="110" width="80" height="70" rx="8" stroke="#B91C1C" strokeWidth="2" fill="none" />
      <rect x="125" y="100" width="30" height="14" rx="3" stroke="#B91C1C" strokeWidth="3" fill="none" />
      <line x1="100" y1="140" x2="180" y2="140" stroke="#FCA5A5" strokeWidth="2" />
      <circle cx="115" cy="172" r="4" fill="#0F172A" />
      <circle cx="165" cy="172" r="4" fill="#0F172A" />
      {/* chapéu */}
      <ellipse cx="195" cy="135" rx="38" ry="6" fill="#F8F6F3" stroke="#E2E8F0" />
      <ellipse cx="195" cy="128" rx="18" ry="10" fill="#FDE68A" stroke="#D97706" />
      <rect x="180" y="125" width="30" height="4" fill="#DC2626" />
    </svg>
  );
}

function CountdownFerias({ inicio, fim, dias }: { inicio: Date; fim: Date; dias: number }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMs = inicio.getTime() - now.getTime();
  const isHoje = totalMs <= 0;
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const mensagem = isHoje
    ? "Hoje é o grande dia! Aproveite cada momento. ☀️"
    : d > 30
    ? "Suas férias já estão garantidas! 🌴 Aproveite a expectativa."
    : d >= 8
    ? "Falta pouco para você desacelerar. Que tal já começar a planejar a mala? ✈️"
    : "A reta final chegou! Prepare-se para desconectar. 🌅";

  const blocos: { label: string; valor: number }[] = [
    { label: "Dias", valor: d },
    { label: "Horas", valor: h },
    { label: "Min", valor: m },
    { label: "Seg", valor: s },
  ];

  return (
    <div className="bg-gradient-to-br from-[#ECFDF5] to-white border border-[#A7F3D0] rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <Plane className="h-5 w-5 text-[#DC2626] -rotate-12" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-[#047857] font-semibold">
                Contagem regressiva
              </p>
              <h3 className="font-display text-lg font-bold text-[#0F172A] leading-tight">
                Suas próximas férias estão chegando!
              </h3>
            </div>
          </div>
          <p className="text-sm text-[#475569] pl-[52px]">
            <span className="font-medium text-[#0F172A]">
              {format(inicio, "dd/MM/yyyy", { locale: ptBR })} — {format(fim, "dd/MM/yyyy", { locale: ptBR })}
            </span>{" "}
            <span className="text-[#64748B]">· {dias} dias de descanso</span>
          </p>
          <p className="text-sm italic text-[#047857] pl-[52px] pt-1">{mensagem}</p>
        </div>

        <div className="flex gap-2 sm:gap-3 justify-center lg:justify-end">
          {blocos.map((b) => (
            <div
              key={b.label}
              className="bg-white border border-[#A7F3D0] rounded-lg px-3 sm:px-4 py-3 min-w-[64px] text-center shadow-sm"
            >
              <div className="text-3xl sm:text-4xl font-bold text-[#059669] leading-none tabular-nums">
                {String(b.valor).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wide text-[#475569] font-semibold mt-1">
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
