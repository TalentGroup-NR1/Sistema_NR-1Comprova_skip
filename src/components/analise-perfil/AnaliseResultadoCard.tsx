import React, { useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Printer, Briefcase, Star, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AnalisePerfil, AnalisePerfilResult, AnaliseBloco } from "@/hooks/useAnalisesPerfil";
import { isNewFormat, useUpdateAnaliseResultado } from "@/hooks/useAnalisesPerfil";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";

function getColor(pct: number) {
  if (pct >= 70) return "#16a34a";
  if (pct >= 50) return TALENT_GOLD;
  return TALENT_RED;
}

function getLabel(pct: number) {
  if (pct >= 70) return "Alta Aderência";
  if (pct >= 50) return "Aderência Parcial";
  return "Baixa Aderência";
}

function CircularProgress({ value }: { value: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = getColor(value);
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
}

function SectionHeader({ color, icon: Icon, title, count }: { color: string; icon: React.ElementType; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-1.5 pb-1 border-b" style={{ borderColor: `${color}30` }}>
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>{title}</h3>
      <span className="text-[9px]" style={{ color: TALENT_GRAY }}>({count})</span>
    </div>
  );
}

function AutoResizeTextarea({ value, onChange, className }: {
  value: string; onChange: (val: string) => void; className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = '0px';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <>
      <textarea
        ref={ref}
        className={cn("flex-1 p-0.5 text-[10px] leading-relaxed border border-transparent hover:border-border focus:border-border focus:outline-none resize-none bg-transparent overflow-hidden print:hidden", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
      />
      <div className={cn("hidden print:block flex-1 p-0.5 text-[10px] leading-relaxed whitespace-pre-wrap", className)} style={{ color: '#374151' }}>
        {value}
      </div>
    </>
  );
}

function EditableList({ items, color, icon: Icon, onUpdate }: {
  items: string[]; color: string; icon: React.ElementType;
  onUpdate: (items: string[]) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[10px] leading-relaxed group" style={{ color: '#374151' }}>
          <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color }} />
          <AutoResizeTextarea
            value={item}
            onChange={(val) => { const n = [...items]; n[i] = val; onUpdate(n); }}
          />
          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive mt-0.5 no-print"
            onClick={() => onUpdate(items.filter((_, j) => j !== i))}>
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
      <li className="no-print">
        <button className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
          onClick={() => onUpdate([...items, ""])}>
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </li>
    </ul>
  );
}

function ReportHeader({ dataAnalise }: { dataAnalise: string }) {
  return (
    <>
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${TALENT_NAVY}, ${TALENT_RED})` }} />
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/nr-1comprova-logo.png" alt="NR-1Comprova" className="h-9 object-contain" />
          <div className="border-l-2 pl-3" style={{ borderColor: TALENT_GOLD }}>
            <h1 className="text-xs font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>
              Relatório de Análise de Perfil
            </h1>
            <p className="text-[9px] mt-0.5" style={{ color: TALENT_GRAY }}>Análise Cruzada por Inteligência Artificial</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px]" style={{ color: TALENT_GRAY }}>{dataAnalise}</p>
        </div>
      </div>
      <div className="mx-5 h-px" style={{ backgroundColor: `${TALENT_GOLD}40` }} />
    </>
  );
}

function ReportFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="px-5 py-2 flex justify-between items-center" style={{ backgroundColor: TALENT_NAVY }}>
      <span className="text-[9px]" style={{ color: TALENT_GOLD }}>NR-1Comprova — Relatório gerado por IA</span>
      <span className="text-[9px] text-white/40">Documento confidencial — Página {page}/{total}</span>
    </div>
  );
}

function BlocoAnalise({ title, subtitle, bloco, onUpdate }: {
  title: string; subtitle: string; bloco: AnaliseBloco;
  onUpdate: (b: AnaliseBloco) => void;
}) {
  const updateField = <K extends keyof AnaliseBloco>(key: K, value: AnaliseBloco[K]) => {
    onUpdate({ ...bloco, [key]: value });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-md border p-2.5" style={{ borderColor: `${TALENT_GOLD}30`, backgroundColor: '#fafaf8' }}>
        <CircularProgress value={bloco.percentual_aderencia} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-[11px] font-bold" style={{ color: TALENT_NAVY }}>{title}</h2>
            <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${getColor(bloco.percentual_aderencia)}15`, color: getColor(bloco.percentual_aderencia), border: `1px solid ${getColor(bloco.percentual_aderencia)}30` }}>
              {getLabel(bloco.percentual_aderencia)}
            </span>
          </div>
          <p className="text-[9px]" style={{ color: TALENT_GRAY }}>{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {bloco.convergencias?.length > 0 && (
          <div>
            <SectionHeader color="#16a34a" icon={CheckCircle2} title="Convergências" count={bloco.convergencias.length} />
            <EditableList items={bloco.convergencias} color="#16a34a" icon={CheckCircle2} onUpdate={(v) => updateField("convergencias", v)} />
          </div>
        )}
        {bloco.divergencias?.length > 0 && (
          <div>
            <SectionHeader color={TALENT_RED} icon={XCircle} title="Divergências" count={bloco.divergencias.length} />
            <EditableList items={bloco.divergencias} color={TALENT_RED} icon={XCircle} onUpdate={(v) => updateField("divergencias", v)} />
          </div>
        )}
        {bloco.pontos_atencao?.length > 0 && (
          <div>
            <SectionHeader color={TALENT_GOLD} icon={AlertTriangle} title="Pontos de Atenção" count={bloco.pontos_atencao.length} />
            <EditableList items={bloco.pontos_atencao} color={TALENT_GOLD} icon={AlertTriangle} onUpdate={(v) => updateField("pontos_atencao", v)} />
          </div>
        )}
        {bloco.pontos_fortes?.length > 0 && (
          <div>
            <SectionHeader color="#16a34a" icon={Star} title="Pontos Fortes" count={bloco.pontos_fortes.length} />
            <EditableList items={bloco.pontos_fortes} color="#16a34a" icon={Star} onUpdate={(v) => updateField("pontos_fortes", v)} />
          </div>
        )}
      </div>

      {bloco.parecer && (
        <div className="rounded-md p-2.5 border" style={{ borderColor: `${TALENT_NAVY}15`, backgroundColor: '#f8f9fb' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="h-3 w-3" style={{ color: TALENT_NAVY }} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>Parecer</h3>
          </div>
          <AutoResizeTextarea
            value={bloco.parecer}
            onChange={(val) => updateField("parecer", val)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

// ====== LEGACY COMPONENT (for old-format analyses) ======
function LegacyReport({ analise, resultado, dataAnalise }: {
  analise: AnalisePerfil; resultado: AnalisePerfilResult; dataAnalise: string;
}) {
  const admissionFormatted = analise.colaborador_admission_date
    ? format(new Date(analise.colaborador_admission_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : null;

  return (
    <div className="analise-report-container bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxWidth: '210mm' }}>
      <ReportHeader dataAnalise={dataAnalise} />
      <div className="px-5 py-2.5 grid grid-cols-3 gap-3">
        <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Colaborador</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{analise.candidato_nome}</span></div>
        <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Cargo / Nível</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{analise.vaga}</span></div>
        <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Data de Admissão</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{admissionFormatted || "—"}</span></div>
      </div>
      <div className="mx-5 rounded-md border p-3 flex items-center gap-4" style={{ borderColor: `${TALENT_GOLD}30`, backgroundColor: '#fafaf8' }}>
        <CircularProgress value={resultado.percentual_aderencia || 0} />
        <div className="flex-1">
          <h2 className="text-xs font-bold" style={{ color: TALENT_NAVY }}>Índice de Aderência</h2>
          <p className="text-[10px] leading-relaxed" style={{ color: TALENT_GRAY }}>Formato legado — análise única.</p>
        </div>
      </div>
      <div className="px-5 py-3 space-y-3">
        {resultado.convergencias?.length ? (
          <div>
            <SectionHeader color="#16a34a" icon={CheckCircle2} title="Convergências" count={resultado.convergencias.length} />
            <ul className="space-y-0.5">{resultado.convergencias.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: '#374151' }}>
                <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" /><span>{item}</span>
              </li>
            ))}</ul>
          </div>
        ) : null}
        {resultado.divergencias?.length ? (
          <div>
            <SectionHeader color={TALENT_RED} icon={XCircle} title="Divergências" count={resultado.divergencias.length} />
            <ul className="space-y-0.5">{resultado.divergencias.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: '#374151' }}>
                <XCircle className="h-3 w-3 flex-shrink-0" style={{ color: TALENT_RED }} /><span>{item}</span>
              </li>
            ))}</ul>
          </div>
        ) : null}
        {resultado.resumo_executivo && (
          <div className="rounded-md p-3 border" style={{ borderColor: `${TALENT_NAVY}15`, backgroundColor: '#f8f9fb' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3 w-3" style={{ color: TALENT_NAVY }} />
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>Parecer Executivo</h3>
            </div>
            <p className="text-[10px] whitespace-pre-line leading-relaxed" style={{ color: '#4b5563' }}>{resultado.resumo_executivo}</p>
          </div>
        )}
      </div>
      <ReportFooter page={1} total={1} />
    </div>
  );
}

// ====== MAIN COMPONENT ======
export function AnaliseResultadoCard({ analise }: { analise: AnalisePerfil }) {
  const resultado = analise.resultado;
  const updateMutation = useUpdateAnaliseResultado();

  const [editedResult, setEditedResult] = useState<AnalisePerfilResult | null>(null);
  const currentResult = editedResult || resultado;
  const hasEdits = editedResult !== null;

  const handleSave = useCallback(async () => {
    if (!editedResult) return;
    await updateMutation.mutateAsync({ id: analise.id, resultado: editedResult });
    setEditedResult(null);
  }, [editedResult, analise.id, updateMutation]);

  if (!resultado || resultado.error) {
    return (
      <div className="border border-red-200 rounded-lg p-6 text-center text-red-600 bg-red-50">
        <XCircle className="h-8 w-8 mx-auto mb-2" />
        <p className="font-medium">Erro na análise</p>
        <p className="text-sm mt-1">{resultado?.error || "Erro desconhecido"}</p>
      </div>
    );
  }

  const handlePrint = () => window.print();
  const dataAnalise = format(new Date(analise.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const admissionFormatted = analise.colaborador_admission_date
    ? format(new Date(analise.colaborador_admission_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : null;

  // Legacy fallback
  if (!isNewFormat(resultado)) {
    return (
      <>
        <PrintStyles />
        <div className="space-y-3 analise-pages-wrapper">
          <div className="flex justify-end no-print">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
          <LegacyReport analise={analise} resultado={resultado} dataAnalise={dataAnalise} />
        </div>
      </>
    );
  }

  // New two-analysis format
  const r = currentResult!;
  const bloco1 = r.analise_alinhamento_entrevista!;
  const bloco2 = r.analise_anuncio_curriculo!;
  const hasAnuncio = !!r.texto_anuncio_bruto;
  const hasPerfilHG = !!r.texto_perfil_hg;
  const totalPages = 2 + (hasAnuncio ? 1 : 0) + (hasPerfilHG ? 1 : 0);
  let nextPage = 3;

  const updateBloco1 = (b: AnaliseBloco) => setEditedResult({ ...r, analise_alinhamento_entrevista: b });
  const updateBloco2 = (b: AnaliseBloco) => setEditedResult({ ...r, analise_anuncio_curriculo: b });

  return (
    <>
      <PrintStyles />
      <div className="space-y-3 analise-pages-wrapper">
        {/* Action buttons */}
        <div className="flex justify-end gap-2 no-print">
          {hasEdits && (
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" /> {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>

        {/* PAGE 1: Header + Score Geral + Análise 1 */}
        <div className="analise-report-container bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxWidth: '210mm' }}>
          <ReportHeader dataAnalise={dataAnalise} />

          {/* Employee info */}
          <div className="px-5 py-2.5 grid grid-cols-3 gap-3">
            <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Colaborador</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{analise.candidato_nome}</span></div>
            <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Cargo / Nível</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{analise.vaga}</span></div>
            <div><span className="text-[9px] uppercase tracking-wider block" style={{ color: TALENT_GRAY }}>Data de Admissão</span><span className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>{admissionFormatted || "—"}</span></div>
          </div>

          {/* Score Geral */}
          <div className="mx-5 rounded-md border p-3 flex items-center gap-4" style={{ borderColor: `${TALENT_GOLD}30`, backgroundColor: '#fafaf8' }}>
            <CircularProgress value={r.percentual_aderencia_geral || 0} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-xs font-bold" style={{ color: TALENT_NAVY }}>Índice de Aderência Geral</h2>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${getColor(r.percentual_aderencia_geral || 0)}15`, color: getColor(r.percentual_aderencia_geral || 0), border: `1px solid ${getColor(r.percentual_aderencia_geral || 0)}30` }}>
                  {getLabel(r.percentual_aderencia_geral || 0)}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: TALENT_GRAY }}>
                Resultado consolidado das duas análises cruzadas: Alinhamento × Entrevista ({bloco1.percentual_aderencia}%) e Anúncio × Currículo ({bloco2.percentual_aderencia}%).
              </p>
            </div>
          </div>

          {/* Análise 1 */}
          <div className="px-5 py-3">
            <BlocoAnalise
              title="Análise 1: Alinhamento × Entrevista"
              subtitle="Cruzamento entre a reunião de alinhamento com o cliente e a entrevista do candidato"
              bloco={bloco1}
              onUpdate={updateBloco1}
            />
          </div>

          <ReportFooter page={1} total={totalPages} />
        </div>

        {/* PAGE 2: Análise 2 + Conclusão Geral */}
        <div className="analise-report-container analise-page-break bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxWidth: '210mm' }}>
          <ReportHeader dataAnalise={dataAnalise} />

          <div className="px-5 py-3 space-y-3">
            <BlocoAnalise
              title="Análise 2: Anúncio × Currículo"
              subtitle="Cruzamento entre o anúncio publicado da vaga e o currículo do candidato"
              bloco={bloco2}
              onUpdate={updateBloco2}
            />

            {/* Conclusão Geral */}
            <div className="rounded-md p-3 border" style={{ borderColor: `${TALENT_NAVY}15`, backgroundColor: '#f8f9fb' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3 w-3" style={{ color: TALENT_NAVY }} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>
                  Conclusão Geral — Parecer do Analista
                </h3>
              </div>
              <AutoResizeTextarea
                value={r.conclusao_geral || ""}
                onChange={(val) => setEditedResult({ ...r, conclusao_geral: val })}
                className="w-full"
              />
            </div>
          </div>

          <ReportFooter page={2} total={totalPages} />
        </div>

        {/* PAGE 3: Job Ad Raw Text */}
        {hasAnuncio && (() => { const pg = nextPage++; return (
          <div className="analise-report-container analise-page-break bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxWidth: '210mm' }}>
            <ReportHeader dataAnalise={dataAnalise} />
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b" style={{ borderColor: `${TALENT_NAVY}20` }}>
                <Briefcase className="h-3.5 w-3.5" style={{ color: TALENT_NAVY }} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>
                  Texto Original do Anúncio da Vaga
                </h3>
              </div>
              <div className="text-[10px] leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {r.texto_anuncio_bruto}
              </div>
            </div>
            <ReportFooter page={pg} total={totalPages} />
          </div>
        ); })()}

        {/* PAGE 4: Perfil HG */}
        {hasPerfilHG && (() => { const pg = nextPage++; return (
          <div className="analise-report-container analise-page-break bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxWidth: '210mm' }}>
            <ReportHeader dataAnalise={dataAnalise} />
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b" style={{ borderColor: `${TALENT_NAVY}20` }}>
                <FileText className="h-3.5 w-3.5" style={{ color: TALENT_NAVY }} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TALENT_NAVY }}>
                  Perfil HG
                </h3>
              </div>
              <AutoResizeTextarea
                value={r.texto_perfil_hg || ""}
                onChange={(val) => setEditedResult({ ...r, texto_perfil_hg: val })}
                className="w-full text-[10px] leading-relaxed"
              />
            </div>
            <ReportFooter page={pg} total={totalPages} />
          </div>
        ); })()}
      </div>
    </>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 8mm; }
        html, body {
          margin: 0 !important; padding: 0 !important;
          height: auto !important; overflow: visible !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }

        /* Hide EVERYTHING by default */
        body * {
          visibility: hidden !important;
        }

        /* Then show ONLY the report containers and their contents */
        .analise-report-container,
        .analise-report-container * {
          visibility: visible !important;
        }

        /* Make ALL layout wrappers transparent — display:contents removes them from layout entirely */
        body > div, body > div > div, body > div > div > div,
        main, .space-y-6, .analise-page-grid,
        .analise-page-grid > div,
        .analise-page-grid > div > div,
        [class*="flex h-screen"], [class*="flex-1 flex flex-col"],
        [class*="overflow-y-auto"], [class*="overflow-auto"],
        [class*="overflow-hidden"]:not(.analise-report-container) {
          display: contents !important;
        }

        /* Hide non-report elements completely — these must be display:none, not contents */
        .no-print, nav, aside, header, footer,
        [data-sidebar], [role="navigation"],
        [class*="Sidebar"], [class*="Header"] {
          display: none !important;
        }

        /* Hide page title, form, history — anything not containing a report */
        .space-y-6 > h1, .space-y-6 > p,
        .space-y-6 > div:not(:has(.analise-report-container)) {
          display: none !important;
        }
        .analise-page-grid > div:not(:has(.analise-report-container)) {
          display: none !important;
        }

        /* Pages wrapper becomes transparent */
        .analise-pages-wrapper {
          display: contents !important;
        }
        .analise-pages-wrapper > :not(.analise-report-container) {
          display: none !important;
        }

        /* Report container full-width */
        .analise-report-container {
          visibility: visible !important;
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          padding-bottom: 28px !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          page-break-inside: avoid;
          position: relative !important;
          min-height: calc(297mm - 16mm) !important;
        }
        /* Footer always at bottom of each page */
        .analise-report-container > div:last-child {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
        }
        .analise-report-container * {
          visibility: visible !important;
        }

        /* Page breaks */
        .analise-page-break {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* textarea hidden, static div shown via print:block */
        .analise-report-container textarea,
        textarea.print\\:hidden,
        textarea { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
      }
    `}</style>
  );
}
