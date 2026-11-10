import { useMemo } from 'react';

interface QuestionResponse {
  question_id: string;
  question_text: string;
  question_type: 'ESCALA_NUMERICA' | 'TEXTO_LIVRE' | 'SIM_NAO';
  scale_min?: number;
  scale_max?: number;
  respondent_type?: 'COLABORADOR' | 'GESTOR' | 'AMBOS';
  is_comparative?: boolean;
  colaborador_response?: number | string | null;
  gestor_response?: number | string | null;
}

export interface PerformanceStatus {
  status: 'ASCENSAO' | 'ATENCAO' | 'RISCO_MODERADO' | 'RISCO_ELEVADO' | 'PENDENTE';
  label: string;
  color: string;
  emoji: string;
}

export interface AnalysisData {
  // New metrics
  colaboradorAverage: number;
  gestorAverage: number;
  adaptationAverage: number;
  overallAverage: number;
  // Existing metrics
  alignmentScore: number;
  strongPoints: number;
  attentionAreas: number;
  cycleStatus: string;
  performanceStatus: PerformanceStatus;
  questionAnalysis: {
    question_id: string;
    question_text: string;
    question_type: string;
    colaborador_value: number | string | null;
    gestor_value: number | string | null;
    alignment: 'high' | 'medium' | 'low' | 'na';
    difference: number | null;
    is_comparative: boolean;
    respondent_type?: string;
  }[];
  attentionAreasList: string[];
  strongPointsList: string[];
  summary: string;
  suggestedActions: string[];
  radarData: { question: string; colaborador: number; gestor: number; fullQuestion: string }[];
  barData: { question: string; colaborador: number; gestor: number; fullQuestion: string }[];
  // New: Top 3 scores and gap alerts
  topThreeScoreIds: string[];
  gapAlertIds: string[];
}

// Keywords for adaptation-related questions
const ADAPTATION_KEYWORDS = [
  'adaptação', 'ambiente', 'satisfação', 'integração', 'receptividade',
  'acolhimento', 'equipe', 'trabalho', 'clima'
];

const isAdaptationQuestion = (questionText: string): boolean => {
  const lowerText = questionText.toLowerCase();
  return ADAPTATION_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export function useAnalysisCalculations(
  responses: QuestionResponse[],
  colaboradorName: string,
  milestone: string,
  cycleStatus: string
): AnalysisData {
  return useMemo(() => {
    // ========== CALCULATE AVERAGES BY RESPONDENT ==========
    
    // Get all numeric responses from colaborador
    const colaboradorNumericResponses = responses.filter(
      r => r.question_type === 'ESCALA_NUMERICA' && 
           r.colaborador_response !== null && 
           r.colaborador_response !== undefined &&
           typeof r.colaborador_response === 'number'
    );

    // Get all numeric responses from gestor
    const gestorNumericResponses = responses.filter(
      r => r.question_type === 'ESCALA_NUMERICA' && 
           r.gestor_response !== null && 
           r.gestor_response !== undefined &&
           typeof r.gestor_response === 'number'
    );

    // Média Geral Colaborador (all numeric answers from collaborator)
    const colaboradorAverage = colaboradorNumericResponses.length > 0
      ? colaboradorNumericResponses.reduce((sum, r) => sum + Number(r.colaborador_response), 0) / colaboradorNumericResponses.length
      : 0;

    // Média Geral Gestor (all numeric answers from manager - primary performance indicator)
    const gestorAverage = gestorNumericResponses.length > 0
      ? gestorNumericResponses.reduce((sum, r) => sum + Number(r.gestor_response), 0) / gestorNumericResponses.length
      : 0;

    // Média de Adaptação (questions related to adaptation/environment)
    const adaptationColabResponses = colaboradorNumericResponses.filter(r => isAdaptationQuestion(r.question_text));
    const adaptationGestorResponses = gestorNumericResponses.filter(r => isAdaptationQuestion(r.question_text));
    
    const adaptationColabAvg = adaptationColabResponses.length > 0
      ? adaptationColabResponses.reduce((sum, r) => sum + Number(r.colaborador_response), 0) / adaptationColabResponses.length
      : 0;
    const adaptationGestorAvg = adaptationGestorResponses.length > 0
      ? adaptationGestorResponses.reduce((sum, r) => sum + Number(r.gestor_response), 0) / adaptationGestorResponses.length
      : 0;
    
    // Combined adaptation average
    const adaptationAverage = (adaptationColabAvg > 0 && adaptationGestorAvg > 0)
      ? (adaptationColabAvg + adaptationGestorAvg) / 2
      : adaptationColabAvg > 0 ? adaptationColabAvg : adaptationGestorAvg;

    // Overall average combining both respondents
    const overallAverage = (colaboradorAverage > 0 && gestorAverage > 0)
      ? (colaboradorAverage + gestorAverage) / 2
      : colaboradorAverage > 0 ? colaboradorAverage : gestorAverage;

    // ========== CALCULATE ALIGNMENT SCORE ==========
    
    // For separate questionnaires: calculate alignment based on averages
    const hasGestorData = gestorAverage > 0;
    const hasColabData = colaboradorAverage > 0;
    
    let alignmentScore = 0;
    
    // If both have data, calculate alignment from averages
    if (hasColabData && hasGestorData) {
      const averageDifference = Math.abs(colaboradorAverage - gestorAverage);
      // Max difference is 10 (on a 0-10 scale), so convert to percentage
      alignmentScore = Math.round(Math.max(0, 100 - (averageDifference * 10)));
    } else if (hasColabData || hasGestorData) {
      // If only one respondent, assume 100% alignment (no comparison possible)
      alignmentScore = 100;
    }

    // ========== CALCULATE STRONG POINTS AND ATTENTION AREAS ==========
    
    const strongPointsList: string[] = [];
    const attentionAreasList: string[] = [];
    
    // Analyze all numeric responses for insights
    responses.forEach(r => {
      if (r.question_type !== 'ESCALA_NUMERICA') return;
      
      const gestorValue = r.gestor_response !== null && r.gestor_response !== undefined 
        ? Number(r.gestor_response) : null;
      const colabValue = r.colaborador_response !== null && r.colaborador_response !== undefined 
        ? Number(r.colaborador_response) : null;
      
      // Primary: Use gestor evaluation when available
      const primaryValue = gestorValue ?? colabValue;
      
      if (primaryValue === null) return;
      
      // Strong point: high score (≥8)
      if (primaryValue >= 8) {
        strongPointsList.push(r.question_text);
      }
      
      // Attention area: low score (<6) or significant divergence
      const difference = (colabValue !== null && gestorValue !== null) 
        ? Math.abs(colabValue - gestorValue) : 0;
      
      if (primaryValue < 6 || (gestorValue !== null && gestorValue < 6)) {
        attentionAreasList.push(r.question_text);
      } else if (difference >= 4) {
        // High divergence even with decent scores warrants attention
        attentionAreasList.push(`Divergência em: ${r.question_text}`);
      }
    });

    // ========== DETERMINE PERFORMANCE STATUS (CORRECTED ALGORITHM) ==========
    
    const getPerformanceStatus = (): PerformanceStatus => {
      // If no data at all, return pending
      if (!hasGestorData && !hasColabData) {
        return { 
          status: 'PENDENTE', 
          label: 'Dados Insuficientes', 
          color: 'text-muted-foreground',
          emoji: '⏳'
        };
      }

      // Use gestor average as primary indicator (they evaluate the real performance)
      // Fall back to colaborador if no gestor data
      const primaryScore = hasGestorData ? gestorAverage : colaboradorAverage;
      
      // Calculate effective alignment (100% if only one respondent)
      const effectiveAlignment = (hasColabData && hasGestorData) ? alignmentScore : 100;
      
      // Count real attention areas (excluding divergence-only items)
      const realAttentionCount = attentionAreasList.filter(a => !a.startsWith('Divergência')).length;
      
      // 🟢 PROFISSIONAL EM ASCENSÃO
      // Primary score >= 8 AND good alignment OR no comparison possible
      if (primaryScore >= 8 && effectiveAlignment >= 70) {
        return { 
          status: 'ASCENSAO', 
          label: 'Profissional em Ascensão', 
          color: 'text-green-600',
          emoji: '🟢'
        };
      }
      
      // 🟡 PRECISA DE ATENÇÃO
      // Primary score >= 6 AND moderate alignment
      if (primaryScore >= 6 && effectiveAlignment >= 50) {
        return { 
          status: 'ATENCAO', 
          label: 'Precisa de Atenção', 
          color: 'text-yellow-600',
          emoji: '🟡'
        };
      }
      
      // 🟠 RISCO MODERADO
      // Primary score >= 4 OR has some issues but not critical
      if (primaryScore >= 4) {
        return { 
          status: 'RISCO_MODERADO', 
          label: 'Risco Moderado', 
          color: 'text-orange-600',
          emoji: '🟠'
        };
      }
      
      // 🔴 RISCO ELEVADO
      // Primary score < 4
      return { 
        status: 'RISCO_ELEVADO', 
        label: 'Risco Elevado', 
        color: 'text-red-600',
        emoji: '🔴'
      };
    };

    const performanceStatus = getPerformanceStatus();

    // ========== ANALYZE EACH QUESTION ==========
    
    const questionAnalysis = responses.map(r => {
      let alignment: 'high' | 'medium' | 'low' | 'na' = 'na';
      let difference: number | null = null;
      const isComparative = r.is_comparative === true;

      if (r.question_type === 'ESCALA_NUMERICA') {
        const colabVal = r.colaborador_response !== null && r.colaborador_response !== undefined 
          ? Number(r.colaborador_response) : null;
        const gestorVal = r.gestor_response !== null && r.gestor_response !== undefined 
          ? Number(r.gestor_response) : null;
        
        if (colabVal !== null && gestorVal !== null) {
          difference = Math.abs(colabVal - gestorVal);
          if (difference <= 2) alignment = 'high';
          else if (difference <= 4) alignment = 'medium';
          else alignment = 'low';
        }
      }

      return {
        question_id: r.question_id,
        question_text: r.question_text,
        question_type: r.question_type,
        colaborador_value: r.colaborador_response ?? null,
        gestor_value: r.gestor_response ?? null,
        alignment,
        difference,
        is_comparative: isComparative,
        respondent_type: r.respondent_type,
      };
    });

    // ========== GENERATE INTELLIGENT SUMMARY ==========
    
    const generateSummary = (): string => {
      let summary = '';
      
      // Opening with performance level
      if (hasGestorData) {
        if (gestorAverage >= 9) {
          summary = `O colaborador ${colaboradorName} demonstra **desempenho excepcional** no ciclo '${milestone}', com média de avaliação técnica de ${gestorAverage.toFixed(1)}/10 pelo gestor. `;
        } else if (gestorAverage >= 7) {
          summary = `O colaborador ${colaboradorName} apresenta **bom desempenho** no ciclo '${milestone}', com média de ${gestorAverage.toFixed(1)}/10 na avaliação do gestor. `;
        } else if (gestorAverage >= 5) {
          summary = `O colaborador ${colaboradorName} demonstra **desempenho em desenvolvimento** no ciclo '${milestone}', com média de ${gestorAverage.toFixed(1)}/10 na avaliação do gestor. `;
        } else {
          summary = `O colaborador ${colaboradorName} necessita de **atenção prioritária** no ciclo '${milestone}', com média de ${gestorAverage.toFixed(1)}/10 na avaliação do gestor. `;
        }
      } else if (hasColabData) {
        summary = `O colaborador ${colaboradorName} realizou sua autoavaliação no ciclo '${milestone}' com média de ${colaboradorAverage.toFixed(1)}/10. Aguardando avaliação do gestor para análise completa. `;
      }
      
      // Alignment analysis
      if (hasColabData && hasGestorData) {
        const alignmentDiff = Math.abs(colaboradorAverage - gestorAverage);
        if (alignmentDiff <= 1) {
          summary += `Há **excelente alinhamento** entre autopercepção (${colaboradorAverage.toFixed(1)}) e avaliação técnica (${gestorAverage.toFixed(1)}), indicando boa consciência profissional. `;
        } else if (alignmentDiff <= 2) {
          summary += `O alinhamento entre percepções é **satisfatório** (diferença de ${alignmentDiff.toFixed(1)} pontos). `;
        } else {
          summary += `Existe **divergência significativa** entre autopercepção (${colaboradorAverage.toFixed(1)}) e avaliação técnica (${gestorAverage.toFixed(1)}), sugerindo necessidade de feedback direcionado. `;
        }
      }
      
      // Strong points
      if (strongPointsList.length > 0) {
        summary += `Foram identificados **${strongPointsList.length} ponto(s) forte(s)** que merecem reconhecimento. `;
      }
      
      // Attention areas
      if (attentionAreasList.length > 0) {
        summary += `Há **${attentionAreasList.length} área(s) de atenção** que requerem acompanhamento.`;
      }
      
      return summary;
    };

    const summary = generateSummary();

    // ========== GENERATE PERSONALIZED RECOMMENDATIONS ==========
    
    const generateSuggestedActions = (): string[] => {
      const actions: string[] = [];
      
      switch (performanceStatus.status) {
        case 'ASCENSAO':
          actions.push('✅ Reconhecer e celebrar o excelente desempenho do colaborador');
          actions.push('🎯 Considerar novas responsabilidades ou projetos desafiadores');
          actions.push('📈 Avaliar potencial para mentoria de novos colaboradores');
          actions.push('💼 Discutir plano de carreira e oportunidades de crescimento');
          break;
        case 'ATENCAO':
          actions.push('📋 Agendar reunião de feedback para alinhar expectativas');
          if (attentionAreasList.length > 0) {
            actions.push(`🎯 Focar desenvolvimento em: ${attentionAreasList.slice(0, 2).map(a => a.substring(0, 40)).join(', ')}`);
          }
          actions.push('📅 Estabelecer check-ins semanais para monitorar progresso');
          actions.push('📚 Identificar treinamentos ou recursos de apoio');
          break;
        case 'RISCO_MODERADO':
          actions.push('⚠️ Agendar reunião urgente com RH e gestor');
          actions.push('📝 Elaborar Plano de Desenvolvimento Individual (PDI) estruturado');
          actions.push('👥 Considerar mentoria dedicada ou buddy de apoio');
          actions.push('📊 Aumentar frequência de acompanhamento (2x por semana)');
          actions.push('🎓 Identificar treinamentos específicos para áreas críticas');
          break;
        case 'RISCO_ELEVADO':
          actions.push('🚨 Intervenção imediata: reunião com RH, gestor e colaborador');
          actions.push('📋 Definir plano de recuperação com metas claras de curto prazo');
          actions.push('🔍 Avaliar alinhamento cultural e fit com a posição');
          actions.push('👥 Suporte intensivo: acompanhamento diário');
          actions.push('⏰ Definir prazo para reavaliação (15-30 dias)');
          break;
        default:
          actions.push('⏳ Aguardar coleta completa de respostas para análise');
          actions.push('📧 Verificar se os links de feedback foram enviados corretamente');
      }
      
      actions.push('📝 Documentar pontos discutidos e acompanhar evolução no próximo ciclo');
      
      return actions;
    };

    const suggestedActions = generateSuggestedActions();

    // ========== PREPARE CHART DATA ==========
    
    // For charts, show all numeric questions with available data
    const numericQuestionsWithData = responses.filter(r => 
      r.question_type === 'ESCALA_NUMERICA' && 
      (r.colaborador_response !== null || r.gestor_response !== null)
    );

    const radarData = numericQuestionsWithData.slice(0, 8).map((r, index) => ({
      question: `Q${index + 1}`,
      colaborador: r.colaborador_response !== null ? Number(r.colaborador_response) : 0,
      gestor: r.gestor_response !== null ? Number(r.gestor_response) : 0,
      fullQuestion: r.question_text,
    }));

    const barData = numericQuestionsWithData.map((r, index) => ({
      question: `Q${index + 1}`,
      colaborador: r.colaborador_response !== null ? Number(r.colaborador_response) : 0,
      gestor: r.gestor_response !== null ? Number(r.gestor_response) : 0,
      fullQuestion: r.question_text,
    }));

    // ========== TOP 3 SCORES AND GAP ALERTS ==========
    
    // Calculate top 3 highest scores (using max of colab/gestor)
    const scoresByQuestion = numericQuestionsWithData.map(r => ({
      question_id: r.question_id,
      maxScore: Math.max(
        r.colaborador_response !== null ? Number(r.colaborador_response) : 0,
        r.gestor_response !== null ? Number(r.gestor_response) : 0
      )
    }));
    
    const topThreeScoreIds = scoresByQuestion
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, 3)
      .map(s => s.question_id);

    // Gap alerts: questions where difference > 1.5 points
    const gapAlertIds = numericQuestionsWithData
      .filter(r => {
        const colab = r.colaborador_response !== null ? Number(r.colaborador_response) : null;
        const gestor = r.gestor_response !== null ? Number(r.gestor_response) : null;
        if (colab === null || gestor === null) return false;
        return Math.abs(colab - gestor) > 1.5;
      })
      .map(r => r.question_id);

    return {
      colaboradorAverage,
      gestorAverage,
      adaptationAverage,
      overallAverage,
      alignmentScore,
      strongPoints: strongPointsList.length,
      attentionAreas: attentionAreasList.length,
      cycleStatus,
      performanceStatus,
      questionAnalysis,
      attentionAreasList,
      strongPointsList,
      summary,
      suggestedActions,
      radarData,
      barData,
      topThreeScoreIds,
      gapAlertIds,
    };
  }, [responses, colaboradorName, milestone, cycleStatus]);
}
