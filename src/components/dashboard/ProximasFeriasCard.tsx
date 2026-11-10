import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plane, ArrowRight, CalendarPlus, AlertTriangle } from "lucide-react";
import { useMeuColaborador } from "@/hooks/useMinhasFerias";
import { useFeriasColaborador } from "@/hooks/useFerias";

/**
 * Card compacto do dashboard: contagem regressiva das próximas férias aprovadas.
 * Quando não há férias aprovadas, mostra saldo + data limite para gozo.
 */
export function ProximasFeriasCard() {
  const { data: colab } = useMeuColaborador();
  const { data } = useFeriasColaborador(colab?.id ?? null);

  const proxima = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const aprovadasFuturas = (data?.gozos ?? [])
      .filter((g: any) => g.status === "aprovado" && parseISO(g.data_inicio_gozo) >= hoje)
      .sort(
        (a: any, b: any) =>
          parseISO(a.data_inicio_gozo).getTime() - parseISO(b.data_inicio_gozo).getTime()
      );
    return aprovadasFuturas[0] ?? null;
  }, [data]);

  const periodoAtivo = useMemo(() => {
    if (!data?.periodos?.length) return null;
    const today = new Date();
    const ordenados = [...data.periodos].sort(
      (a: any, b: any) =>
        new Date(a.data_inicio_aquisitivo).getTime() -
        new Date(b.data_inicio_aquisitivo).getTime()
    );
    for (const p of ordenados) {
      const fim = parseISO(p.data_fim_aquisitivo);
      if (isBefore(fim, today) || fim.getTime() === today.getTime()) {
        const gozados = (data.gozos ?? [])
          .filter((g: any) => g.periodo_aquisitivo_id === p.id && g.status !== "cancelado")
          .reduce((s: number, g: any) => s + g.dias_gozados, 0);
        if (gozados < p.dias_adquiridos) return p;
      }
    }
    return ordenados[ordenados.length - 1] ?? null;
  }, [data]);

  const saldo = useMemo(() => {
    if (!periodoAtivo || !data) return null;
    const gozados = (data.gozos ?? [])
      .filter((g: any) => g.periodo_aquisitivo_id === periodoAtivo.id && g.status !== "cancelado")
      .reduce((s: number, g: any) => s + g.dias_gozados, 0);
    return {
      adquiridos: periodoAtivo.dias_adquiridos,
      restantes: periodoAtivo.dias_adquiridos - gozados,
    };
  }, [data, periodoAtivo]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!proxima) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [proxima]);

  return (
    <div className="bg-gradient-to-br from-[#ECFDF5] to-white border border-[#A7F3D0] rounded-xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
          <Plane className="h-4 w-4 text-[#DC2626] -rotate-12" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-[#047857] font-semibold">
            {proxima ? "Contagem regressiva" : "Minhas férias"}
          </p>
          <h3 className="font-display text-base font-bold text-[#0F172A] leading-tight truncate">
            {proxima ? "Próximas férias" : "Saldo disponível"}
          </h3>
        </div>
        <Link
          to="/minhas-ferias"
          className="text-xs text-[#047857] font-medium hover:underline inline-flex items-center gap-1 shrink-0"
        >
          Ver <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {proxima ? (
        <ProximaContent proxima={proxima} now={now} />
      ) : (
        <SemFeriasContent saldo={saldo} periodoAtivo={periodoAtivo} />
      )}
    </div>
  );
}

function SemFeriasContent({
  saldo,
  periodoAtivo,
}: {
  saldo: { adquiridos: number; restantes: number } | null;
  periodoAtivo: any;
}) {
  const restantes = saldo?.restantes ?? 0;
  const adquiridos = saldo?.adquiridos ?? 30;
  const limite = periodoAtivo ? parseISO(periodoAtivo.data_limite_gozo) : null;
  const diasLimite = limite ? differenceInDays(limite, new Date()) : null;
  const urgente = diasLimite !== null && diasLimite < 60 && restantes > 0;

  return (
    <div className="flex-1 flex flex-col justify-center gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-[#A7F3D0] rounded-lg py-3 text-center shadow-sm">
          <div className="text-3xl font-bold text-[#059669] leading-none tabular-nums">
            {restantes}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mt-1">
            Dias disponíveis
          </div>
        </div>
        <div className="bg-white border border-[#A7F3D0] rounded-lg py-3 text-center shadow-sm">
          <div className="text-3xl font-bold text-[#0F172A] leading-none tabular-nums">
            {adquiridos}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mt-1">
            Total adquirido
          </div>
        </div>
      </div>

      {limite && (
        <p
          className={`text-xs text-center inline-flex items-center justify-center gap-1 ${
            urgente ? "text-[#DC2626] font-medium" : "text-[#64748B]"
          }`}
        >
          {urgente && <AlertTriangle className="h-3 w-3" />}
          Data limite para gozo:{" "}
          <span className="font-semibold">
            {format(limite, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </p>
      )}

      <Link
        to="/minhas-ferias"
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] transition-colors rounded-lg py-2 px-3"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Solicitar férias
      </Link>
    </div>
  );
}



function ProximaContent({ proxima, now }: { proxima: any; now: Date }) {
  const inicio = parseISO(proxima.data_inicio_gozo);
  const fim = parseISO(proxima.data_fim_gozo);
  const totalMs = inicio.getTime() - now.getTime();
  const isHoje = totalMs <= 0;
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const blocos = [
    { label: "Dias", valor: d },
    { label: "Horas", valor: h },
    { label: "Min", valor: m },
    { label: "Seg", valor: s },
  ];

  const mensagem = isHoje
    ? "Hoje é o grande dia! ☀️"
    : d > 30
    ? "Já estão garantidas! 🌴"
    : d >= 8
    ? "Falta pouco. Prepare a mala! ✈️"
    : "Reta final! 🌅";

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {blocos.map((b) => (
          <div
            key={b.label}
            className="bg-white border border-[#A7F3D0] rounded-lg py-2 text-center shadow-sm"
          >
            <div className="text-xl sm:text-2xl font-bold text-[#059669] leading-none tabular-nums">
              {String(b.valor).padStart(2, "0")}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-[#475569] font-semibold mt-1">
              {b.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#475569] text-center">
        <span className="font-medium text-[#0F172A]">
          {format(inicio, "dd/MM", { locale: ptBR })} — {format(fim, "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="text-[#64748B]"> · {proxima.dias_gozados} dias</span>
      </p>
      <p className="text-xs italic text-[#047857] text-center mt-1">{mensagem}</p>
    </>
  );
}
