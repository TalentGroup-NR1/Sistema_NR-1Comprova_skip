import { forwardRef } from 'react';
import { format, differenceInMonths } from 'date-fns';
import { parseISODate } from '@/lib/validators/colaborador';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CareerGrid, type CareerGridStars, type StarState } from './CareerGrid';
import type { Colaborador } from '@/hooks/useColaboradores';
import type { Promocao } from '@/hooks/usePromocoes';

interface DiarioBordoScore {
  milestone: string;
  milestoneLabel: string;
  profissionalAvg: number | null;
  gestaoAvg: number | null;
  overallAvg: number | null;
}

interface AvaliacaoItemFicha {
  nome: string;
  notaColaborador: string | null;
  notaGestor: string | null;
  pesoColaborador: number | null;
  pesoGestor: number | null;
}

export interface AvaliacaoCicloFicha {
  cicloNome: string;
  cicloStatus: string;
  statusAutoavaliacao: string;
  statusGestor: string;
  mediaColaborador: number | null;
  mediaGestor: number | null;
  competencias: AvaliacaoItemFicha[];
  objetivos: AvaliacaoItemFicha[];
}

interface FichaProfissionalCardProps {
  colaborador: Colaborador;
  companyName: string;
  companyLogoUrl: string | null;
  promocoes: Promocao[];
  diarioBordoScores: DiarioBordoScore[];
  diarioBordoFeedback: string | null;
  avaliacoesCiclos: AvaliacaoCicloFicha[];
  avaliacaoFeedback: string | null;
  formacaoAcademica: string;
  cursosRealizados: string;
  breveResumo: string;
  gestorNome: string | null;
  careerGridStars: CareerGridStars;
  onStarClick?: (key: string, currentState: StarState) => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatTempoEmpresa(admissionDate: string): string {
  const months = differenceInMonths(new Date(), new Date(admissionDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0) return `${years}a ${rem}m`;
  return `${rem} meses`;
}

export const FichaProfissionalCard = forwardRef<HTMLDivElement, FichaProfissionalCardProps>(
  (
    {
      colaborador,
      companyName,
      companyLogoUrl,
      promocoes,
      diarioBordoScores,
      diarioBordoFeedback,
      avaliacoesCiclos,
      avaliacaoFeedback,
      formacaoAcademica,
      cursosRealizados,
      breveResumo,
      gestorNome,
      careerGridStars,
      onStarClick,
    },
    ref
  ) => {
    const admissionFormatted = format(parseISODate(colaborador.admission_date), 'dd/MM/yyyy', { locale: ptBR });
    const lastPromotion = promocoes.length > 0 ? promocoes[0] : null;

    // Calculate overall average across all cycles
    const allMediasColab = avaliacoesCiclos.filter(c => c.mediaColaborador !== null).map(c => c.mediaColaborador!);
    const allMediasGestor = avaliacoesCiclos.filter(c => c.mediaGestor !== null).map(c => c.mediaGestor!);
    const mediaGeralColab = allMediasColab.length > 0 ? allMediasColab.reduce((a, b) => a + b, 0) / allMediasColab.length : null;
    const mediaGeralGestor = allMediasGestor.length > 0 ? allMediasGestor.reduce((a, b) => a + b, 0) / allMediasGestor.length : null;

    return (
      <div ref={ref} className="bg-white text-gray-900" style={{ width: '900px', fontFamily: "'Manrope', sans-serif", fontSize: '13px' }}>
        {/* PAGE 1: Personal info */}
        <div data-page="1">
          <div className="flex">
            {/* LEFT PANEL */}
            <div className="flex flex-col items-center" style={{ width: '320px' }}>
              <div
                className="w-full flex items-end justify-center"
                style={{ backgroundColor: '#E53935', height: '140px', position: 'relative' }}
              >
                <div style={{ position: 'absolute', bottom: '-70px', zIndex: 10 }}>
                  <div className="rounded-full border-4 border-white shadow-lg overflow-hidden" style={{ width: '140px', height: '140px' }}>
                    <Avatar className="h-full w-full">
                      <AvatarImage src={colaborador.avatar_url || ''} alt={colaborador.full_name} className="object-cover" />
                      <AvatarFallback className="text-3xl font-bold bg-gray-300 text-gray-600 h-full w-full">
                        {getInitials(colaborador.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>

              <div
                className="w-full flex flex-col items-center px-6 pb-6"
                style={{ backgroundColor: '#C8C0B8', paddingTop: '80px' }}
              >
                <h1 className="text-lg font-extrabold text-center leading-tight tracking-wide uppercase text-gray-800">
                  {colaborador.full_name}
                </h1>
                <p className="mt-1 text-[11px] tracking-[0.2em] text-center text-gray-600 uppercase leading-snug">
                  {colaborador.job_title}
                  {colaborador.job_level ? `\n${colaborador.job_level}` : ''}
                </p>

                <div className="mt-6 w-full bg-white/60 rounded-lg px-4 py-3">
                  <h3 className="text-xs font-bold tracking-[0.3em] text-center uppercase mb-2 text-gray-700">PROMOÇÕES</h3>
                  {lastPromotion ? (
                    <p className="text-[11px] text-center text-gray-600 mb-2">
                      Promovido em {format(new Date(lastPromotion.data_promocao), 'dd/MM/yyyy')}
                    </p>
                  ) : (
                    <p className="text-[11px] text-center text-gray-500 mb-2">Sem promoções registradas</p>
                  )}
                  <CareerGrid stars={careerGridStars} onStarClick={onStarClick} />
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 px-6 py-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">RESUMO</h2>
                  <div className="space-y-1 text-[12px]">
                    <p><span className="font-bold">Cargo:</span> {colaborador.job_title}{colaborador.job_level ? ` ${colaborador.job_level}` : ''}</p>
                    <p><span className="font-bold">Admissão:</span> {admissionFormatted}</p>
                    <p><span className="font-bold">Tempo de empresa:</span> {formatTempoEmpresa(colaborador.admission_date)}</p>
                    {gestorNome && <p><span className="font-bold">Equipe:</span> {gestorNome}</p>}
                  </div>
                </div>
                {companyLogoUrl && (
                  <img src={companyLogoUrl} alt={companyName} className="h-12 object-contain" crossOrigin="anonymous" />
                )}
              </div>
              <div className="mb-3">
                <h3 className="font-bold text-[12px] mb-1">Formação acadêmica</h3>
                <p className="text-[11px] text-gray-600">{formacaoAcademica || 'N/I'}</p>
              </div>
              <div className="mb-4">
                <h3 className="font-bold text-[12px] mb-1">Cursos realizados</h3>
                <p className="text-[11px] text-gray-600">{cursosRealizados || 'N/I'}</p>
              </div>
              <div>
                <h3 className="font-bold text-xs tracking-[0.15em] uppercase mb-2">BREVE RESUMO PERFIL</h3>
                <p className="text-[11px] text-gray-600 leading-relaxed text-justify">
                  {breveResumo || 'Sem informações disponíveis.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE 2: Results */}
        <div data-page="2">
          <div style={{ breakBefore: 'page', pageBreakBefore: 'always' }} />
          <div className="flex" style={{ paddingTop: '24px' }}>
            {/* Diário de Bordo */}
            <div className="flex-1 px-6 py-5 border-r border-gray-200">
              <h3 className="font-bold text-sm mb-4" style={{ color: '#E53935' }}>
                Diário de Bordo - {diarioBordoScores.filter(s => s.overallAvg !== null).map(s => s.milestoneLabel).join(' e ') || '30 e 80 dias'}
              </h3>

              {diarioBordoScores.some(s => s.overallAvg !== null) ? (
                <div className="space-y-3">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[11px] font-semibold mb-2">Profissional</p>
                      <div className="flex items-end gap-3">
                        {diarioBordoScores.map((s) =>
                          s.profissionalAvg !== null ? (
                            <div key={s.milestone} className="text-center">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ backgroundColor: '#8B9DC3' }}>
                                {s.profissionalAvg.toFixed(1)}
                              </div>
                              <span className="text-[9px] text-gray-500 mt-1 block">{s.milestoneLabel}</span>
                            </div>
                          ) : null
                        )}
                        {(() => {
                          const allScores = diarioBordoScores.filter(s => s.overallAvg !== null);
                          if (allScores.length === 0) return null;
                          const avg = allScores.reduce((sum, s) => sum + (s.overallAvg || 0), 0) / allScores.length;
                          return (
                            <div className="text-center">
                              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto" style={{ backgroundColor: '#A8B5D0' }}>
                                {avg.toFixed(1)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold mb-2">Gestão Técnica</p>
                      <div className="flex items-end gap-3">
                        {diarioBordoScores.map((s) =>
                          s.gestaoAvg !== null ? (
                            <div key={s.milestone} className="text-center">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ backgroundColor: '#8B9DC3' }}>
                                {s.gestaoAvg.toFixed(1)}
                              </div>
                              <span className="text-[9px] text-gray-500 mt-1 block">{s.milestoneLabel}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                  {diarioBordoFeedback && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold mb-1">Feedback - Gestão técnica - Diário de Bordo</p>
                      <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-line">{diarioBordoFeedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Sem dados de diário de bordo disponíveis.</p>
              )}
            </div>

            {/* Avaliações de Desempenho - ALL CYCLES */}
            <div className="flex-1 px-6 py-5">
              <h3 className="font-bold text-sm mb-3" style={{ color: '#E53935' }}>
                Avaliações de Desempenho
              </h3>

              {avaliacoesCiclos.length > 0 ? (
                <div className="space-y-4">
                  {/* Média geral consolidada */}
                  {(mediaGeralColab !== null || mediaGeralGestor !== null) && (
                    <div className="flex items-center gap-4 pb-3 border-b border-gray-200">
                      <p className="text-[11px] font-bold text-gray-700">Média Geral:</p>
                      {mediaGeralColab !== null && (
                        <div className="text-center">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ backgroundColor: '#4CC9D9' }}>
                            {mediaGeralColab.toFixed(1)}
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1 block">Colab.</span>
                        </div>
                      )}
                      {mediaGeralGestor !== null && (
                        <div className="text-center">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ backgroundColor: '#8B9DC3' }}>
                            {mediaGeralGestor.toFixed(1)}
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1 block">Gestor</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Each cycle */}
                  {avaliacoesCiclos.map((ciclo, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-gray-800">{ciclo.cicloNome}</p>
                        <div className="flex items-center gap-2">
                          {ciclo.mediaColaborador !== null && (
                            <div className="text-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: '#4CC9D9' }}>
                                {ciclo.mediaColaborador.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {ciclo.mediaGestor !== null && (
                            <div className="text-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: '#8B9DC3' }}>
                                {ciclo.mediaGestor.toFixed(1)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Competencias table */}
                      {ciclo.competencias.length > 0 && (
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 font-semibold text-gray-500 pr-2">Competência</th>
                              <th className="text-center py-1 font-semibold text-gray-500 w-14">Colab.</th>
                              <th className="text-center py-1 font-semibold text-gray-500 w-14">Gestor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ciclo.competencias.map((comp, ci) => (
                              <tr key={ci} className="border-b border-gray-50">
                                <td className="py-1 pr-2 text-gray-700">{comp.nome}</td>
                                <td className="text-center py-1 text-gray-600">{comp.notaColaborador || '—'}</td>
                                <td className="text-center py-1 text-gray-600">{comp.notaGestor || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Objetivos table */}
                      {ciclo.objetivos.length > 0 && (
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 font-semibold text-gray-500 pr-2">Objetivo</th>
                              <th className="text-center py-1 font-semibold text-gray-500 w-14">Colab.</th>
                              <th className="text-center py-1 font-semibold text-gray-500 w-14">Gestor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ciclo.objetivos.map((obj, oi) => (
                              <tr key={oi} className="border-b border-gray-50">
                                <td className="py-1 pr-2 text-gray-700">{obj.nome}</td>
                                <td className="text-center py-1 text-gray-600">{obj.notaColaborador || '—'}</td>
                                <td className="text-center py-1 text-gray-600">{obj.notaGestor || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {idx < avaliacoesCiclos.length - 1 && <div className="border-b border-gray-200 mt-2" />}
                    </div>
                  ))}

                  {avaliacaoFeedback && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-bold mb-1">Feedback - Avaliação de Desempenho</p>
                      <p className="text-[10px] text-gray-600 whitespace-pre-line">{avaliacaoFeedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Sem avaliações disponíveis.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FichaProfissionalCard.displayName = 'FichaProfissionalCard';
