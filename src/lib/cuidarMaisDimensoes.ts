// Definição das 8 dimensões de saúde mental do módulo Cuidar+
// Baseadas na NR1 e boas práticas de saúde ocupacional

export const DIMENSOES_CUIDAR_MAIS = {
  CARGA_TRABALHO: {
    id: 'CARGA_TRABALHO',
    nome: 'Carga de trabalho e ritmo',
    descricao: 'Avalia a percepção sobre volume de trabalho, prazos e ritmo das atividades',
    icone: '⚡',
    cor: 'bg-amber-500',
  },
  CLAREZA_PAPEIS: {
    id: 'CLAREZA_PAPEIS',
    nome: 'Clareza de papéis e expectativas',
    descricao: 'Avalia se os colaboradores entendem suas responsabilidades e o que é esperado deles',
    icone: '🎯',
    cor: 'bg-blue-500',
  },
  AUTONOMIA_CONTROLE: {
    id: 'AUTONOMIA_CONTROLE',
    nome: 'Autonomia e controle',
    descricao: 'Avalia o grau de autonomia e controle sobre o próprio trabalho',
    icone: '🔓',
    cor: 'bg-purple-500',
  },
  APOIO_LIDERANCA: {
    id: 'APOIO_LIDERANCA',
    nome: 'Apoio da liderança',
    descricao: 'Avalia a qualidade do suporte e orientação recebidos da liderança',
    icone: '🤝',
    cor: 'bg-green-500',
  },
  RELACOES_CLIMA: {
    id: 'RELACOES_CLIMA',
    nome: 'Relações e clima do time',
    descricao: 'Avalia a qualidade das relações interpessoais e o clima organizacional',
    icone: '👥',
    cor: 'bg-cyan-500',
  },
  RECONHECIMENTO: {
    id: 'RECONHECIMENTO',
    nome: 'Reconhecimento e valorização',
    descricao: 'Avalia se os colaboradores se sentem reconhecidos e valorizados',
    icone: '⭐',
    cor: 'bg-yellow-500',
  },
  EQUILIBRIO_VIDA_TRABALHO: {
    id: 'EQUILIBRIO_VIDA_TRABALHO',
    nome: 'Equilíbrio vida-trabalho e recuperação',
    descricao: 'Avalia a capacidade de manter equilíbrio entre vida pessoal e profissional',
    icone: '⚖️',
    cor: 'bg-pink-500',
  },
  SEGURANCA_PSICOLOGICA: {
    id: 'SEGURANCA_PSICOLOGICA',
    nome: 'Segurança psicológica e respeito',
    descricao: 'Avalia se o ambiente é seguro para expressão de ideias e preocupações',
    icone: '🛡️',
    cor: 'bg-indigo-500',
  },
} as const;

export type DimensaoCuidarMais = keyof typeof DIMENSOES_CUIDAR_MAIS;

export const DIMENSOES_OPTIONS = Object.entries(DIMENSOES_CUIDAR_MAIS).map(([key, value]) => ({
  value: key,
  label: value.nome,
  descricao: value.descricao,
  icone: value.icone,
}));

// Limiares de risco e alertas
export const LIMIARES = {
  SCORE_RISCO: 3.0, // Score abaixo deste valor é considerado crítico
  PERCENTUAL_RISCO: 35, // % em 1-2 acima deste valor é alerta
  DELTA_QUEDA: 0.3, // Queda maior que este valor é alerta
  AMOSTRA_MINIMA: 5, // Mínimo de respondentes para exibir dados agregados
} as const;

// Recomendações por dimensão
export const RECOMENDACOES: Record<DimensaoCuidarMais, { curto_prazo: string[]; medio_prazo: string[] }> = {
  CARGA_TRABALHO: {
    curto_prazo: [
      'Revisar priorização de tarefas com a equipe',
      'Identificar gargalos e redistribuir demandas urgentes',
    ],
    medio_prazo: [
      'Implementar gestão de demandas com metodologia estruturada',
      'Avaliar necessidade de contratações ou realocações',
    ],
  },
  CLAREZA_PAPEIS: {
    curto_prazo: [
      'Realizar alinhamento individual de expectativas',
      'Documentar responsabilidades e entregas esperadas',
    ],
    medio_prazo: [
      'Criar descrições de cargo atualizadas',
      'Implementar rituais de feedback contínuo',
    ],
  },
  AUTONOMIA_CONTROLE: {
    curto_prazo: [
      'Revisar processos de aprovação excessivos',
      'Delegar decisões operacionais à equipe',
    ],
    medio_prazo: [
      'Desenvolver cultura de empowerment',
      'Treinar lideranças em delegação efetiva',
    ],
  },
  APOIO_LIDERANCA: {
    curto_prazo: [
      'Aumentar frequência de 1:1 com líderes',
      'Criar canal direto de comunicação com gestão',
    ],
    medio_prazo: [
      'Capacitar líderes em gestão de pessoas',
      'Implementar mentoria e coaching',
    ],
  },
  RELACOES_CLIMA: {
    curto_prazo: [
      'Promover atividades de integração do time',
      'Mediar conflitos identificados',
    ],
    medio_prazo: [
      'Desenvolver programa de team building',
      'Revisar composição e dinâmica das equipes',
    ],
  },
  RECONHECIMENTO: {
    curto_prazo: [
      'Implementar reconhecimentos públicos',
      'Dar feedbacks positivos imediatos',
    ],
    medio_prazo: [
      'Criar programa estruturado de reconhecimento',
      'Revisar política de remuneração e benefícios',
    ],
  },
  EQUILIBRIO_VIDA_TRABALHO: {
    curto_prazo: [
      'Respeitar horários de descanso e desconexão',
      'Revisar expectativas de disponibilidade',
    ],
    medio_prazo: [
      'Implementar políticas de flexibilidade',
      'Avaliar carga horária das funções',
    ],
  },
  SEGURANCA_PSICOLOGICA: {
    curto_prazo: [
      'Criar espaços seguros para feedback',
      'Investigar e tratar comportamentos inadequados',
    ],
    medio_prazo: [
      'Treinar equipe em comunicação respeitosa',
      'Fortalecer canal de denúncias e ouvidoria',
    ],
  },
};
