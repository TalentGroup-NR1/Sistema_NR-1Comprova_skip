import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DenunciaAdmin, DenunciaStatus } from "@/hooks/useDenuncias";

export interface PrazoInfo {
  isVencido: boolean;
  diasRestantes: number;
  dataAlvo: Date | null;
  tipo: "primeira_resposta" | "conclusao" | "concluido";
  label: string;
}

export function calcularPrazoDenuncia(
  denuncia: Pick<
    DenunciaAdmin,
    "status" | "prazo_primeira_resposta" | "prazo_conclusao" | "primeira_resposta_em" | "criado_em"
  >
): PrazoInfo {
  if (denuncia.status === "concluido") {
    return {
      isVencido: false,
      diasRestantes: 0,
      dataAlvo: denuncia.prazo_conclusao ? new Date(denuncia.prazo_conclusao) : null,
      tipo: "concluido",
      label: "Concluído",
    };
  }

  // Se o status for "novo", o prazo crítico é a primeira resposta (30 dias)
  const isNovo = denuncia.status === "novo";
  const dataString = isNovo ? denuncia.prazo_primeira_resposta : denuncia.prazo_conclusao;

  let dataAlvo: Date;
  if (dataString) {
    dataAlvo = new Date(dataString);
  } else {
    // Fallback: se não estiver preenchido, calcula a partir do criado_em
    const criadoEm = new Date(denuncia.criado_em);
    dataAlvo = new Date(criadoEm.getTime() + (isNovo ? 30 : 90) * 24 * 60 * 60 * 1000);
  }

  const hoje = new Date();
  const diasRestantes = differenceInCalendarDays(dataAlvo, hoje);
  const isVencido = diasRestantes < 0;

  let label = "";
  if (isVencido) {
    const dias = Math.abs(diasRestantes);
    label = `Vencido há ${dias}d`;
  } else if (diasRestantes === 0) {
    label = "Vence hoje";
  } else if (diasRestantes <= 7) {
    label = `Vence em ${diasRestantes}d`;
  } else {
    label = `Prazo: ${format(dataAlvo, "dd/MM", { locale: ptBR })}`;
  }

  return {
    isVencido,
    diasRestantes,
    dataAlvo,
    tipo: isNovo ? "primeira_resposta" : "conclusao",
    label,
  };
}

interface PrazoBadgeProps {
  denuncia: Pick<
    DenunciaAdmin,
    "status" | "prazo_primeira_resposta" | "prazo_conclusao" | "primeira_resposta_em" | "criado_em"
  >;
  showIcon?: boolean;
  className?: string;
}

export function PrazoBadge({ denuncia, showIcon = true, className = "" }: PrazoBadgeProps) {
  const info = calcularPrazoDenuncia(denuncia);

  if (info.tipo === "concluido") {
    return (
      <Badge
        variant="outline"
        className={`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-xs gap-1 font-medium ${className}`}
      >
        {showIcon && <CheckCircle2 className="h-3 w-3" />}
        Concluído
      </Badge>
    );
  }

  if (info.isVencido) {
    return (
      <Badge
        variant="destructive"
        className={`gap-1 font-semibold text-xs ${className}`}
        title={`Prazo legal expirado em ${info.dataAlvo ? format(info.dataAlvo, "dd/MM/yyyy") : ""}`}
      >
        {showIcon && <AlertTriangle className="h-3 w-3" />}
        {info.label}
      </Badge>
    );
  }

  if (info.diasRestantes <= 7) {
    return (
      <Badge
        variant="outline"
        className={`bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 gap-1 font-medium text-xs ${className}`}
        title={`Atenção ao prazo: vence em ${info.dataAlvo ? format(info.dataAlvo, "dd/MM/yyyy") : ""}`}
      >
        {showIcon && <Clock className="h-3 w-3" />}
        {info.label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 gap-1 font-medium text-xs ${className}`}
      title={`Prazo legal limite: ${info.dataAlvo ? format(info.dataAlvo, "dd/MM/yyyy") : ""}`}
    >
      {showIcon && <Clock className="h-3 w-3" />}
      {info.label}
    </Badge>
  );
}

