import { useState, useMemo } from "react";
import Papa from "papaparse";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useCreatePromocaoRetroativa } from "@/hooks/usePromocoes";

interface ImportarPromocoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RawRow {
  matricula?: string;
  email_pessoal?: string;
  data_promocao?: string;
  cargo_anterior?: string;
  salario_anterior?: string;
  nivel_anterior?: string;
  departamento_anterior?: string;
  cargo_novo?: string;
  salario_novo?: string;
  nivel_novo?: string;
  departamento_novo?: string;
  motivo?: string;
  aprovado_por?: string;
  observacoes?: string;
}

interface ParsedRow {
  rowIndex: number;
  raw: RawRow;
  colaboradorId?: string;
  companyId?: string;
  colaboradorNome?: string;
  data?: string; // YYYY-MM-DD
  cargoAnterior?: string;
  salarioAnterior?: number;
  nivelAnterior?: string;
  departamentoAnterior?: string;
  cargoNovo?: string;
  salarioNovo?: number;
  nivelNovo?: string;
  departamentoNovo?: string;
  motivo?: string;
  aprovadoPor?: string;
  observacoes?: string;
  error?: string;
  status?: "pending" | "ok" | "fail";
  failReason?: string;
}

const MOTIVOS_VALIDOS = ["Mérito", "Promoção", "Dissídio", "Enquadramento"];

const CSV_HEADERS = [
  "matricula",
  "email_pessoal",
  "data_promocao",
  "cargo_anterior",
  "salario_anterior",
  "nivel_anterior",
  "departamento_anterior",
  "cargo_novo",
  "salario_novo",
  "nivel_novo",
  "departamento_novo",
  "motivo",
  "aprovado_por",
  "observacoes",
];

function parseDate(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return v;
  // DD/MM/YYYY
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

function downloadTemplate() {
  const sample = [
    "12345",
    "joao@email.com",
    "15/03/2022",
    "Analista Júnior",
    "3500,00",
    "Júnior II",
    "Tecnologia",
    "Analista Pleno",
    "5200,00",
    "Pleno I",
    "Tecnologia",
    "Mérito",
    "Maria Silva",
    "Promoção anual por desempenho",
  ];
  const csv = CSV_HEADERS.join(",") + "\n" + sample.map((v) => `"${v}"`).join(",") + "\n";
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_historico_promocoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportarPromocoesDialog({ open, onOpenChange }: ImportarPromocoesDialogProps) {
  const { toast } = useToast();
  const { data: colaboradores = [] } = useColaboradores();
  const createRetroativa = useCreatePromocaoRetroativa();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<{ ok: number; fail: number } | null>(null);

  const colaboradorByMatricula = useMemo(() => {
    const map = new Map<string, typeof colaboradores[0]>();
    colaboradores.forEach((c) => {
      if (c.matricula) map.set(c.matricula.toString().trim().toLowerCase(), c);
    });
    return map;
  }, [colaboradores]);

  const colaboradorByEmail = useMemo(() => {
    const map = new Map<string, typeof colaboradores[0]>();
    colaboradores.forEach((c) => {
      if (c.email_pessoal) map.set(c.email_pessoal.trim().toLowerCase(), c);
    });
    return map;
  }, [colaboradores]);

  function validateRow(raw: RawRow, rowIndex: number): ParsedRow {
    const row: ParsedRow = { rowIndex, raw, status: "pending" };

    const matricula = raw.matricula?.toString().trim().toLowerCase();
    const email = raw.email_pessoal?.toString().trim().toLowerCase();

    let colab = matricula ? colaboradorByMatricula.get(matricula) : undefined;
    if (!colab && email) colab = colaboradorByEmail.get(email);

    if (!colab) {
      row.error = "Colaborador não encontrado (matrícula/e-mail inválidos)";
      return row;
    }
    row.colaboradorId = colab.id;
    row.companyId = colab.company_id;
    row.colaboradorNome = colab.full_name;

    const data = parseDate(raw.data_promocao || "");
    if (!data) { row.error = "Data inválida (use DD/MM/YYYY)"; return row; }
    if (data > new Date().toISOString().slice(0, 10)) { row.error = "Data não pode ser futura"; return row; }
    row.data = data;

    if (!raw.cargo_anterior || raw.cargo_anterior.trim().length < 2) {
      row.error = "Cargo anterior obrigatório"; return row;
    }
    row.cargoAnterior = raw.cargo_anterior.trim();

    const sAnt = parseNumber(raw.salario_anterior || "");
    if (sAnt === null || sAnt <= 0) { row.error = "Salário anterior inválido"; return row; }
    row.salarioAnterior = sAnt;

    if (!raw.cargo_novo || raw.cargo_novo.trim().length < 2) {
      row.error = "Cargo novo obrigatório"; return row;
    }
    row.cargoNovo = raw.cargo_novo.trim();

    const sNov = parseNumber(raw.salario_novo || "");
    if (sNov === null || sNov <= 0) { row.error = "Salário novo inválido"; return row; }
    row.salarioNovo = sNov;

    row.nivelAnterior = raw.nivel_anterior?.trim() || undefined;
    row.departamentoAnterior = raw.departamento_anterior?.trim() || undefined;
    row.nivelNovo = raw.nivel_novo?.trim() || undefined;
    row.departamentoNovo = raw.departamento_novo?.trim() || undefined;

    const motivo = raw.motivo?.trim();
    if (motivo && !MOTIVOS_VALIDOS.includes(motivo)) {
      row.error = `Motivo inválido (use: ${MOTIVOS_VALIDOS.join(", ")})`; return row;
    }
    row.motivo = motivo || undefined;

    row.aprovadoPor = raw.aprovado_por?.trim() || "Importação histórica";
    row.observacoes = raw.observacoes?.trim() || undefined;

    return row;
  }

  function handleFile(file: File) {
    setDone(null);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const parsed = result.data.map((raw, idx) => validateRow(raw, idx + 2));
        setRows(parsed);
        const okCount = parsed.filter((r) => !r.error).length;
        const errCount = parsed.length - okCount;
        toast({
          title: "Planilha carregada",
          description: `${okCount} linha(s) válida(s) e ${errCount} com erro de ${parsed.length} total.`,
        });
      },
      error: (err) => {
        toast({ title: "Erro ao ler CSV", description: err.message, variant: "destructive" });
      },
    });
  }

  async function executeImport() {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setImporting(true);
    setProgress(0);
    let ok = 0;
    let fail = 0;
    const updated = [...rows];

    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      try {
        await createRetroativa.mutateAsync({
          colaborador_id: r.colaboradorId!,
          company_id: r.companyId!,
          data_promocao: r.data!,
          cargo_anterior: r.cargoAnterior!,
          salario_anterior: r.salarioAnterior!,
          nivel_anterior: r.nivelAnterior || null,
          departamento_anterior: r.departamentoAnterior || null,
          cargo_novo: r.cargoNovo!,
          salario_novo: r.salarioNovo!,
          nivel_novo: r.nivelNovo || null,
          departamento_novo: r.departamentoNovo || null,
          motivo: r.motivo || null,
          aprovado_por: r.aprovadoPor!,
          observacoes: r.observacoes || null,
        });
        const idx = updated.findIndex((x) => x.rowIndex === r.rowIndex);
        if (idx >= 0) updated[idx] = { ...updated[idx], status: "ok" };
        ok++;
      } catch (e: any) {
        const idx = updated.findIndex((x) => x.rowIndex === r.rowIndex);
        if (idx >= 0) updated[idx] = { ...updated[idx], status: "fail", failReason: e.message };
        fail++;
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
      setRows([...updated]);
    }
    setImporting(false);
    setDone({ ok, fail });
  }

  function downloadErrors() {
    const failed = rows.filter((r) => r.error || r.status === "fail");
    if (failed.length === 0) return;
    const lines = [[...CSV_HEADERS, "erro"].join(",")];
    failed.forEach((r) => {
      const cells = CSV_HEADERS.map((h) => `"${(r.raw as any)[h] || ""}"`);
      cells.push(`"${(r.error || r.failReason || "").replace(/"/g, "'")}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setRows([]);
    setProgress(0);
    setDone(null);
  }

  const okRows = rows.filter((r) => !r.error).length;
  const errRows = rows.length - okRows;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Histórico de Promoções
          </DialogTitle>
          <DialogDescription>
            Cadastre em massa o histórico antigo de cargo e salário. Os dados atuais dos colaboradores não serão alterados.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10">
            <div className="text-center max-w-md space-y-2">
              <p className="text-sm text-muted-foreground">
                Baixe o modelo, preencha com o histórico (identificando cada colaborador por <strong>matrícula</strong> ou <strong>e-mail pessoal</strong>) e faça o upload.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Baixar modelo CSV
              </Button>
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" /> Selecionar planilha
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Formato aceito: CSV (UTF-8). Datas: DD/MM/AAAA. Valores: 1234,56</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-green-700 border-green-600">{okRows} válidas</Badge>
              {errRows > 0 && <Badge variant="outline" className="text-red-700 border-red-600">{errRows} com erro</Badge>}
              {done && (
                <>
                  <Badge className="bg-green-600">Importadas: {done.ok}</Badge>
                  {done.fail > 0 && <Badge variant="destructive">Falhas: {done.fail}</Badge>}
                </>
              )}
              <div className="flex-1" />
              {(errRows > 0 || (done && done.fail > 0)) && (
                <Button variant="outline" size="sm" onClick={downloadErrors}>
                  <Download className="mr-2 h-4 w-4" /> Baixar erros
                </Button>
              )}
              {!importing && !done && (
                <Button variant="outline" size="sm" onClick={reset}>Trocar planilha</Button>
              )}
            </div>

            {importing && <Progress value={progress} />}

            <ScrollArea className="flex-1 border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="p-2 w-8">#</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Colaborador</th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Cargo antes</th>
                    <th className="p-2">Salário antes</th>
                    <th className="p-2">Cargo depois</th>
                    <th className="p-2">Salário depois</th>
                    <th className="p-2">Motivo</th>
                    <th className="p-2">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowIndex} className={r.error ? "bg-red-50" : r.status === "ok" ? "bg-green-50" : r.status === "fail" ? "bg-red-50" : ""}>
                      <td className="p-2 text-muted-foreground">{r.rowIndex}</td>
                      <td className="p-2">
                        {r.error ? <XCircle className="h-4 w-4 text-red-600" /> :
                          r.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                          r.status === "fail" ? <XCircle className="h-4 w-4 text-red-600" /> :
                          <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </td>
                      <td className="p-2">{r.colaboradorNome || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="p-2">{r.data || r.raw.data_promocao}</td>
                      <td className="p-2">{r.cargoAnterior || r.raw.cargo_anterior}</td>
                      <td className="p-2">{r.salarioAnterior?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || r.raw.salario_anterior}</td>
                      <td className="p-2">{r.cargoNovo || r.raw.cargo_novo}</td>
                      <td className="p-2">{r.salarioNovo?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || r.raw.salario_novo}</td>
                      <td className="p-2">{r.motivo || r.raw.motivo || "—"}</td>
                      <td className="p-2 text-red-700">{r.error || r.failReason || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {done ? "Fechar" : "Cancelar"}
          </Button>
          {rows.length > 0 && !done && (
            <Button onClick={executeImport} disabled={importing || okRows === 0}>
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando... {progress}%</>
              ) : (
                <>Importar {okRows} registro{okRows !== 1 ? "s" : ""}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
