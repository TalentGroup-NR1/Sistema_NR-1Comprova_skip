/**
 * Regra pura de habilitação dos botões de ENTRADA / SAÍDA do RegistroPonto.
 *
 * Onda 6.11: decisão baseada APENAS no último registro do colaborador
 * (qualquer dia, incluindo marcações automáticas de midnight-split).
 * Padrão atual: somente ENTRADA e SAIDA. Intervalos são inferidos pela
 * sequência SAIDA → ENTRADA dentro do mesmo dia.
 */
export type PontoTipo = "ENTRADA" | "SAIDA";

export interface RegistroLike {
  tipo: PontoTipo;
  data_hora: string;
  is_auto?: boolean | null;
}

export interface DecisaoBotoes {
  entradaDisabled: boolean;
  saidaDisabled: boolean;
  entradaTooltip: string;
  saidaTooltip: string;
}

export function decidirBotoes(
  ultimo: RegistroLike | null | undefined,
  agora: Date = new Date(),
): DecisaoBotoes {
  if (!ultimo) {
    return {
      entradaDisabled: false,
      saidaDisabled: true,
      entradaTooltip: "",
      saidaTooltip: "Bata sua ENTRADA primeiro.",
    };
  }

  const lastIsEntrada = ultimo.tipo === "ENTRADA";

  // Data local BR (America/Sao_Paulo) do último registro e de agora.
  const localBR = (d: Date) => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const yy = parts.find((p) => p.type === "year")!.value;
    const mm = parts.find((p) => p.type === "month")!.value;
    const dd = parts.find((p) => p.type === "day")!.value;
    return `${yy}-${mm}-${dd}`;
  };
  const ultimaDataLocal = localBR(new Date(ultimo.data_hora));
  const hojeLocal = localBR(agora);
  const ultimaEEntradaDeDiaAnterior = lastIsEntrada && ultimaDataLocal < hojeLocal;

  // Bloqueio assimétrico: ENTRADA nunca é bloqueada por pendência antiga
  // (backend registra e emite aviso). SAÍDA continua exigindo ENTRADA aberta.
  const entradaDisabled = lastIsEntrada && !ultimaEEntradaDeDiaAnterior;
  const saidaDisabled = !lastIsEntrada;

  const fmt = (() => {
    try {
      const d = new Date(ultimo.data_hora);
      const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const data = d.toLocaleDateString("pt-BR");
      return { hora, data };
    } catch {
      return { hora: "", data: "" };
    }
  })();

  return {
    entradaDisabled,
    saidaDisabled,
    entradaTooltip: entradaDisabled
      ? `Você ainda não bateu a saída anterior (último: ${ultimo.tipo} às ${fmt.hora} de ${fmt.data}).`
      : ultimaEEntradaDeDiaAnterior
        ? `Você tem uma saída pendente de ${fmt.data}. Você pode registrar a entrada de hoje normalmente.`
        : "",
    saidaTooltip: saidaDisabled
      ? "Bata sua ENTRADA primeiro."
      : "",
  };
}
