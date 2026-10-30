import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { calcularLimiteGozo } from "@/lib/feriasEngine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseDateBR, formatDateToISO, parseISODate } from "@/lib/validators/colaborador";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  cpf?: string;
  nome?: string;
  periodo_aquisitivo_inicio: string; // ISO
  periodo_aquisitivo_fim: string;    // ISO
  data_inicio_gozo: string;          // ISO
  data_fim_gozo: string;             // ISO
  dias_descanso: number;
  dias_abono: number;
  data_pagamento: string | null;     // ISO or null
  rawInicioPer: string;
  rawFimPer: string;
  rawIniGozo: string;
  rawFimGozo: string;
  error?: string;
}

interface ImportResult {
  gozos_criados: number;
  gozos_atualizados: number;
  periodos_criados: number;
  nao_encontrados: string[];
  erros: { linha: number; motivo: string }[];
}

export {
  normalizeHeader,
  parseCSV,
  parseDias,
  isDiasValido,
  isFormatoData,
  isDescansoFallbackMatch,
  findColumnIndexWithFallback,
  diagnosticarCSV,
  ALIASES_CPF,
  ALIASES_NOME,
  ALIASES_PER_INI,
  ALIASES_PER_FIM,
  ALIASES_INI_GOZO,
  ALIASES_FIM_GOZO,
  ALIASES_PAGAMENTO,
  ALIASES_ABONO,
  ALIASES_DESCANSO,
} from "@/lib/feriasCsvParser";

import {
  parseCSV,
  parseDias,
  isDiasValido,
  isFormatoData,
  diagnosticarCSV,
} from "@/lib/feriasCsvParser";

function toISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = parseDateBR(dateStr);
  if (d) return formatDateToISO(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function diasEntre(iniISO: string, fimISO: string): number {
  const ini = parseISODate(iniISO);
  const fim = parseISODate(fimISO);
  return Math.floor((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

const CSV_TEMPLATE = `cpf;nome;periodo_aquisitivo_inicio;periodo_aquisitivo_fim;data_inicio_gozo;data_fim_gozo;dias_descanso;dias_abono;data_pagamento
000.000.000-00;Exemplo 30 Dias Gozados;01/01/2023;31/12/2023;05/02/2024;05/03/2024;30;0;01/02/2024
000.000.000-00;Exemplo 20 Dias Descanso + 10 Abono;01/01/2023;31/12/2023;05/02/2024;24/02/2024;20;10;01/02/2024
`;

export function ImportarUltimasFeriasDialog({ open, onOpenChange }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const effectiveCompanyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-ferias-passadas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    setWarnings([]);

    let text = "";
    try {
      const buffer = await file.arrayBuffer();
      text = new TextDecoder("utf-8").decode(buffer);

      if (text.includes("\uFFFD")) {
        try {
          const text1252 = new TextDecoder("windows-1252").decode(buffer);
          if (!text1252.includes("\uFFFD")) {
            text = text1252;
          } else {
            toast({
              title: "Codificação do arquivo",
              description: "Arquivo não está em UTF-8. Salve como CSV UTF-8 no Excel caso haja caracteres corrompidos.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "Codificação do arquivo",
            description: "Arquivo não está em UTF-8. Salve como CSV UTF-8 no Excel.",
            variant: "destructive",
          });
        }
      }
    } catch {
      text = await file.text();
    }

    const diag = diagnosticarCSV(text);

    // Log seguro sem PII (nunca logar CPF, nome ou valores das linhas)
    console.info("[import-ferias] mapeamento", {
      descanso: diag.reconhecidas.descanso
        ? {
            index: diag.reconhecidas.descanso.index,
            isFallback: diag.reconhecidas.descanso.isFallback,
            header: diag.reconhecidas.descanso.header,
          }
        : null,
      abono: diag.reconhecidas.abono
        ? {
            index: diag.reconhecidas.abono.index,
            isFallback: diag.reconhecidas.abono.isFallback,
            header: diag.reconhecidas.abono.header,
          }
        : null,
      ignoradas: diag.colunasIgnoradas.map((c) => c.rawHeader),
    });

    const { rows } = parseCSV(text);

    const idxCpf = diag.reconhecidas.cpf?.index ?? -1;
    const idxNome = diag.reconhecidas.nome?.index ?? -1;
    const idxPerIni = diag.reconhecidas.periodoInicio?.index ?? -1;
    const idxPerFim = diag.reconhecidas.periodoFim?.index ?? -1;
    const idxIni = diag.reconhecidas.inicioGozo?.index ?? -1;
    const idxFim = diag.reconhecidas.fimGozo?.index ?? -1;
    const idxPag = diag.reconhecidas.pagamento?.index ?? -1;
    const idxDias = diag.reconhecidas.descanso?.index ?? -1;
    const idxAbono = diag.reconhecidas.abono?.index ?? -1;

    const detectedWarnings: string[] = [];
    if (diag.reconhecidas.abono?.isFallback && diag.reconhecidas.abono.header) {
      detectedWarnings.push(`Coluna de abono detectada por aproximação: "${diag.reconhecidas.abono.header}"`);
    }
    if (diag.reconhecidas.descanso?.isFallback && diag.reconhecidas.descanso.header) {
      detectedWarnings.push(`Coluna de descanso detectada por aproximação: "${diag.reconhecidas.descanso.header}"`);
    }
    setWarnings(detectedWarnings);

    if (!diag.valido) {
      toast({
        title: "Cabeçalho inválido",
        description:
          "Colunas obrigatórias: cpf (ou nome), periodo_aquisitivo_inicio, periodo_aquisitivo_fim, data_inicio_gozo, data_fim_gozo.",
        variant: "destructive",
      });
      return;
    }

    const parsedRows: ParsedRow[] = rows.map((cols) => {
      const rawPerIni = cols[idxPerIni] || "";
      const rawPerFim = cols[idxPerFim] || "";
      const rawIni = cols[idxIni] || "";
      const rawFim = cols[idxFim] || "";
      const perIni = toISO(rawPerIni);
      const perFim = toISO(rawPerFim);
      const iniGozo = toISO(rawIni);
      const fimGozo = toISO(rawFim);
      const pag = idxPag >= 0 ? toISO(cols[idxPag] || "") : null;
      const rawDias = idxDias >= 0 ? (cols[idxDias] || "").trim() : "";
      const rawAbono = idxAbono >= 0 ? (cols[idxAbono] || "").trim() : "";
      const diasParsed = idxDias >= 0 ? parseDias(cols[idxDias]) : 0;
      const abonoParsed = idxAbono >= 0 ? parseDias(cols[idxAbono]) : 0;

      let error: string | undefined;
      if (!perIni || !perFim) error = "Período aquisitivo inválido";
      else if (!iniGozo || !fimGozo) error = "Datas de gozo inválidas";
      else if (fimGozo < iniGozo) error = "Fim do gozo anterior ao início";
      else if (perFim < perIni) error = "Fim do período anterior ao início";
      else if (rawDias && isFormatoData(rawDias)) error = `Coluna de dias parece conter data, não quantidade: "${rawDias}"`;
      else if (rawAbono && isFormatoData(rawAbono)) error = `Coluna de abono parece conter data, não quantidade: "${rawAbono}"`;
      else if (rawDias && !isDiasValido(rawDias)) error = `Dias de descanso inválidos: "${rawDias}"`;
      else if (rawAbono && !isDiasValido(rawAbono)) error = `Abono pecuniário inválido: "${rawAbono}"`;

      const diasFinal = !iniGozo || !fimGozo ? 0 : diasParsed > 0 ? diasParsed : diasEntre(iniGozo, fimGozo);

      if (!error) {
        if (diasFinal <= 0) error = "Dias de descanso inválidos";
        else if (abonoParsed < 0 || abonoParsed > 10) error = "Abono pecuniário deve ser entre 0 e 10 dias";
        else if (diasFinal + abonoParsed > 30) error = `Total (${diasFinal + abonoParsed}d) excede 30 dias`;
      }

      return {
        cpf: idxCpf >= 0 ? (cols[idxCpf] || "").replace(/\D/g, "") : undefined,
        nome: idxNome >= 0 ? cols[idxNome] : undefined,
        periodo_aquisitivo_inicio: perIni || "",
        periodo_aquisitivo_fim: perFim || "",
        data_inicio_gozo: iniGozo || "",
        data_fim_gozo: fimGozo || "",
        dias_descanso: diasFinal,
        dias_abono: abonoParsed,
        data_pagamento: pag,
        rawInicioPer: rawPerIni,
        rawFimPer: rawPerFim,
        rawIniGozo: rawIni,
        rawFimGozo: rawFim,
        error,
      };
    });

    setParsed(parsedRows);
  };

  const handleImport = async () => {
    if (!effectiveCompanyId) {
      toast({
        title: "Selecione uma empresa",
        description: "Importação requer uma empresa ativa no contexto.",
        variant: "destructive",
      });
      return;
    }
    setImporting(true);
    const res: ImportResult = {
      gozos_criados: 0,
      gozos_atualizados: 0,
      periodos_criados: 0,
      nao_encontrados: [],
      erros: [],
    };

    const { data: colabs, error } = await supabase
      .from("colaboradores")
      .select("id, cpf, full_name")
      .eq("company_id", effectiveCompanyId);

    if (error) {
      toast({ title: "Erro ao consultar colaboradores", description: error.message, variant: "destructive" });
      setImporting(false);
      return;
    }

    const byCpf = new Map<string, string>();
    const byName = new Map<string, string>();
    (colabs || []).forEach((c) => {
      if (c.cpf) byCpf.set(c.cpf.replace(/\D/g, ""), c.id);
      if (c.full_name) byName.set(c.full_name.trim().toLowerCase(), c.id);
    });

    // cache de períodos por colaborador
    const periodosCache = new Map<string, { id: string; data_inicio_aquisitivo: string }[]>();

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      if (row.error) {
        res.erros.push({ linha: i + 2, motivo: row.error });
        continue;
      }
      let colaboradorId: string | undefined;
      if (row.cpf) colaboradorId = byCpf.get(row.cpf);
      if (!colaboradorId && row.nome) colaboradorId = byName.get(row.nome.trim().toLowerCase());
      if (!colaboradorId) {
        res.nao_encontrados.push(row.cpf || row.nome || `linha ${i + 2}`);
        continue;
      }

      try {
        // garantir cache
        if (!periodosCache.has(colaboradorId)) {
          const { data: per } = await supabase
            .from("ferias_periodos_aquisitivos")
            .select("id, data_inicio_aquisitivo, status, dias_adquiridos")
            .eq("colaborador_id", colaboradorId);
          periodosCache.set(colaboradorId, per || []);
        }
        const periodos = periodosCache.get(colaboradorId)!;
        let periodo = periodos.find((p) => p.data_inicio_aquisitivo === row.periodo_aquisitivo_inicio);

        const hojeISO = formatDateToISO(new Date());
        const totalDias = (row.dias_descanso || 0) + (row.dias_abono || 0);
        const deveFechar = totalDias >= 30 && row.data_fim_gozo < hojeISO;

        if (!periodo) {
          const fimDate = parseISODate(row.periodo_aquisitivo_fim);
          const limite = calcularLimiteGozo(fimDate);
          const { data: created, error: errPer } = await supabase
            .from("ferias_periodos_aquisitivos")
            .insert({
              colaborador_id: colaboradorId,
              company_id: effectiveCompanyId,
              data_inicio_aquisitivo: row.periodo_aquisitivo_inicio,
              data_fim_aquisitivo: row.periodo_aquisitivo_fim,
              data_limite_gozo: formatDateToISO(limite),
              dias_adquiridos: 30,
              status: deveFechar ? "fechado" : "aberto",
            })
            .select("id, data_inicio_aquisitivo, status, dias_adquiridos")
            .single();
          if (errPer) throw errPer;
          periodo = created;
          periodos.push(created);
          res.periodos_criados++;
        } else if (deveFechar && (periodo as any).status !== "fechado") {
          await supabase
            .from("ferias_periodos_aquisitivos")
            .update({ status: "fechado" })
            .eq("id", periodo.id);
          (periodo as any).status = "fechado";
        }

        const pagamento = row.data_pagamento || row.data_inicio_gozo;
        const abonoDias = Math.max(0, Math.round(Number(row.dias_abono) || 0));
        const descansoDias = Math.max(0, Math.round(Number(row.dias_descanso) || 0));
        const obs =
          abonoDias > 0 ? `Importado (CSV) – Abono pecuniário: ${abonoDias} dia(s)` : "Importado (CSV)";

        // Upsert idempotente baseado na chave natural: (colaborador_id, periodo_aquisitivo_id, data_inicio_gozo, data_fim_gozo)
        const { data: existingGozo, error: errCheckGozo } = await supabase
          .from("ferias_gozo")
          .select("id")
          .eq("colaborador_id", colaboradorId)
          .eq("periodo_aquisitivo_id", periodo.id)
          .eq("data_inicio_gozo", row.data_inicio_gozo)
          .eq("data_fim_gozo", row.data_fim_gozo)
          .maybeSingle();

        if (errCheckGozo) throw errCheckGozo;

        if (existingGozo) {
          const { error: errUpdateGozo } = await supabase
            .from("ferias_gozo")
            .update({
              dias_gozados: descansoDias,
              data_pagamento: pagamento,
              abono_pecuniario_dias: abonoDias,
              status: "gozado",
              observacoes: obs,
            })
            .eq("id", existingGozo.id);
          if (errUpdateGozo) throw errUpdateGozo;
          res.gozos_atualizados++;
        } else {
          const { error: errGozo } = await supabase.from("ferias_gozo").insert({
            colaborador_id: colaboradorId,
            company_id: effectiveCompanyId,
            periodo_aquisitivo_id: periodo.id,
            data_inicio_gozo: row.data_inicio_gozo,
            data_fim_gozo: row.data_fim_gozo,
            dias_gozados: descansoDias,
            data_pagamento: pagamento,
            abono_pecuniario_dias: abonoDias,
            status: "gozado",
            observacoes: obs,
          });
          if (errGozo) throw errGozo;
          res.gozos_criados++;
        }
      } catch (e: any) {
        res.erros.push({ linha: i + 2, motivo: e.message || String(e) });
      }
    }

    setResult(res);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["colaboradores-ferias"] });
    queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
    const resumoErros = res.erros.length > 0 ? `, ${res.erros.length} com erro` : "";
    const resumoAtualizados = res.gozos_atualizados > 0 ? `, ${res.gozos_atualizados} atualizado(s)` : "";
    toast({
      title: "Importação concluída",
      description: `${res.gozos_criados} lançamento(s) criados${resumoAtualizados}${resumoErros}, ${res.periodos_criados} período(s) novos.`,
      variant: res.erros.length > 0 ? "destructive" : "default",
    });
  };

  const handleClose = () => {
    setParsed([]);
    setWarnings([]);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar férias passadas (CSV)</DialogTitle>
          <DialogDescription>
            Arquivo CSV com cabeçalho. Colunas obrigatórias: <strong>cpf</strong> (ou <strong>nome</strong>),{" "}
            <strong>periodo_aquisitivo_inicio</strong>, <strong>periodo_aquisitivo_fim</strong>,{" "}
            <strong>data_inicio_gozo</strong>, <strong>data_fim_gozo</strong>. Opcionais:{" "}
            <strong>dias_descanso</strong>, <strong>dias_abono</strong> (abono pecuniário / venda de até 10 dias),{" "}
            <strong>data_pagamento</strong>. Datas em DD/MM/AAAA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="text-sm"
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Baixar modelo CSV
            </Button>
          </div>

          {warnings.length > 0 && !result && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-1">
                <div className="font-semibold">Avisos de detecção de colunas:</div>
                {warnings.map((w, idx) => (
                  <div key={idx}>• {w}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {parsed.length > 0 && !result && (
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPF/Nome</TableHead>
                    <TableHead>Período aquisitivo</TableHead>
                    <TableHead>Gozo</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 200).map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{r.cpf || r.nome}</TableCell>
                      <TableCell className="text-xs">
                        {r.rawInicioPer} – {r.rawFimPer}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.rawIniGozo} – {r.rawFimGozo}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.dias_descanso}d descanso</span>
                          {r.dias_abono > 0 && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-medium">
                              +{r.dias_abono}d abono
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.error ? (
                          <Badge variant="destructive">{r.error}</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed.length > 200 && (
                <p className="text-xs text-muted-foreground p-2">
                  Mostrando 200 de {parsed.length} linhas. Todas serão processadas.
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>{result.gozos_criados}</strong> lançamento(s) criados
                  {result.gozos_atualizados > 0 && (
                    <> · <strong>{result.gozos_atualizados}</strong> atualizado(s)</>
                  )} ·{" "}
                  <strong>{result.periodos_criados}</strong> período(s) aquisitivo(s) novos
                  {result.erros.length > 0 && (
                    <span className="font-semibold text-destructive"> · {result.erros.length} com erro</span>
                  )}
                  .
                </AlertDescription>
              </Alert>
              {result.nao_encontrados.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não encontrados ({result.nao_encontrados.length}):{" "}
                    {result.nao_encontrados.slice(0, 10).join(", ")}
                    {result.nao_encontrados.length > 10 ? "…" : ""}
                  </AlertDescription>
                </Alert>
              )}
              {result.erros.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Linhas com erro ({result.erros.length}):</div>
                    <ul className="list-disc list-inside space-y-0.5 text-xs max-h-32 overflow-auto">
                      {result.erros.map((e, idx) => (
                        <li key={idx}>Linha {e.linha}: {e.motivo}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          {parsed.length > 0 && !result && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Importar {parsed.filter((p) => !p.error).length} linhas
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
