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
  periodos_criados: number;
  nao_encontrados: string[];
  erros: { linha: number; motivo: string }[];
}

function normalizeHeader(h: string) {
  return h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ";" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = (lines[0] || "").split(sep).map((h) => normalizeHeader(h.replace(/^"|"$/g, "")));
  const rows = lines.slice(1).map((line) =>
    line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rows };
}

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
000.000.000-00;Exemplo Colaborador;21/06/2024;20/06/2025;04/02/2026;18/02/2026;15;0;02/02/2026
000.000.000-00;Exemplo Colaborador;21/06/2024;20/06/2025;23/06/2025;07/07/2025;15;0;21/06/2025
`;

export function ImportarUltimasFeriasDialog({ open, onOpenChange }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const effectiveCompanyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-ferias-passadas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
    const idxCpf = idx(["cpf"]);
    const idxNome = idx(["nome", "full_name", "nome_completo"]);
    const idxPerIni = idx(["periodo_aquisitivo_inicio", "periodo_inicio"]);
    const idxPerFim = idx(["periodo_aquisitivo_fim", "periodo_fim"]);
    const idxIni = idx(["data_inicio_gozo", "inicio", "data_inicio"]);
    const idxFim = idx(["data_fim_gozo", "fim", "data_fim"]);
    const idxDias = idx(["dias_descanso", "dias"]);
    const idxAbono = idx(["dias_abono", "abono"]);
    const idxPag = idx(["data_pagamento", "pagamento"]);

    if (idxPerIni < 0 || idxPerFim < 0 || idxIni < 0 || idxFim < 0 || (idxCpf < 0 && idxNome < 0)) {
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
      const dias = idxDias >= 0 && cols[idxDias] ? Number((cols[idxDias] || "").replace(",", ".")) : 0;
      const abono = idxAbono >= 0 && cols[idxAbono] ? Number((cols[idxAbono] || "").replace(",", ".")) : 0;

      let error: string | undefined;
      if (!perIni || !perFim) error = "Período aquisitivo inválido";
      else if (!iniGozo || !fimGozo) error = "Datas de gozo inválidas";
      else if (fimGozo < iniGozo) error = "Fim do gozo anterior ao início";
      else if (perFim < perIni) error = "Fim do período anterior ao início";

      const diasFinal = !iniGozo || !fimGozo ? 0 : dias > 0 ? dias : diasEntre(iniGozo, fimGozo);

      return {
        cpf: idxCpf >= 0 ? (cols[idxCpf] || "").replace(/\D/g, "") : undefined,
        nome: idxNome >= 0 ? cols[idxNome] : undefined,
        periodo_aquisitivo_inicio: perIni || "",
        periodo_aquisitivo_fim: perFim || "",
        data_inicio_gozo: iniGozo || "",
        data_fim_gozo: fimGozo || "",
        dias_descanso: diasFinal,
        dias_abono: isNaN(abono) ? 0 : abono,
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
            .select("id, data_inicio_aquisitivo")
            .eq("colaborador_id", colaboradorId);
          periodosCache.set(colaboradorId, per || []);
        }
        const periodos = periodosCache.get(colaboradorId)!;
        let periodo = periodos.find((p) => p.data_inicio_aquisitivo === row.periodo_aquisitivo_inicio);

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
              status: "fechado",
            })
            .select("id, data_inicio_aquisitivo")
            .single();
          if (errPer) throw errPer;
          periodo = created;
          periodos.push(created);
          res.periodos_criados++;
        }

        const pagamento = row.data_pagamento || row.data_inicio_gozo;
        const obs =
          row.dias_abono > 0 ? `Importado (CSV) – Abono pecuniário: ${row.dias_abono} dia(s)` : "Importado (CSV)";

        const { error: errGozo } = await supabase.from("ferias_gozo").insert({
          colaborador_id: colaboradorId,
          company_id: effectiveCompanyId,
          periodo_aquisitivo_id: periodo.id,
          data_inicio_gozo: row.data_inicio_gozo,
          data_fim_gozo: row.data_fim_gozo,
          dias_gozados: row.dias_descanso,
          data_pagamento: pagamento,
          abono_pecuniario_dias: row.dias_abono,
          status: "gozado",
          observacoes: obs,
        });
        if (errGozo) throw errGozo;
        res.gozos_criados++;
      } catch (e: any) {
        res.erros.push({ linha: i + 2, motivo: e.message || String(e) });
      }
    }

    setResult(res);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["colaboradores-ferias"] });
    queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
    toast({
      title: "Importação concluída",
      description: `${res.gozos_criados} lançamento(s) criados, ${res.periodos_criados} período(s) novos.`,
    });
  };

  const handleClose = () => {
    setParsed([]);
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
            <strong>dias_descanso</strong>, <strong>dias_abono</strong>, <strong>data_pagamento</strong>. Datas em DD/MM/AAAA.
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
                        {r.dias_descanso}d{r.dias_abono > 0 ? ` + ${r.dias_abono} abono` : ""}
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
                  <strong>{result.gozos_criados}</strong> lançamento(s) criados ·{" "}
                  <strong>{result.periodos_criados}</strong> período(s) aquisitivo(s) novos.
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
                    Erros ({result.erros.length}):{" "}
                    {result.erros.slice(0, 5).map((e) => `linha ${e.linha}: ${e.motivo}`).join("; ")}
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
