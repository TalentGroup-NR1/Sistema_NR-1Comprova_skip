import { ShieldAlert, Lightbulb, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaleConoscoTipo } from "@/hooks/useDenuncias";

export const TIPO_LABEL: Record<FaleConoscoTipo, string> = {
  denuncia: "Denúncia",
  sugestao: "Sugestão",
  duvida: "Dúvida",
};

const TIPO_STYLES: Record<FaleConoscoTipo, { wrapper: string; icon: typeof ShieldAlert }> = {
  denuncia: {
    wrapper: "bg-destructive/15 text-destructive border-destructive/30",
    icon: ShieldAlert,
  },
  sugestao: {
    wrapper:
      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    icon: Lightbulb,
  },
  duvida: {
    wrapper: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
    icon: HelpCircle,
  },
};

interface Props {
  tipo: FaleConoscoTipo;
  className?: string;
}

export function TipoBadge({ tipo, className }: Props) {
  const cfg = TIPO_STYLES[tipo] ?? TIPO_STYLES.denuncia;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        cfg.wrapper,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {TIPO_LABEL[tipo]}
    </span>
  );
}
