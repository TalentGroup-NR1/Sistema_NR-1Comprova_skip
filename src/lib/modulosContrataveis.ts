/**
 * CATÁLOGO OFICIAL DE MÓDULOS CONTRATÁVEIS (MODELO SOLIDES)
 * 
 * Única fonte da verdade (SSOT) para:
 * - Provisionamento de novos tenants (trigger de banco de dados e seed)
 * - Painel de Gestão de Módulos do Super Admin (/admin-plataforma)
 * - Guardas de rotas e verificações de servidor
 * 
 * Regra: sub-recursos herdam o status do módulo pai (ex.: PDI herda /avaliacoes;
 * laudos herdam /mapa-riscos-nr1; organograma herda /estrutura-organizacional).
 */

export interface ModuloContratavel {
  key: string;
  nome: string;
  pilar: 
    | 'Departamento Pessoal'
    | 'Desenvolvimento & Performance'
    | 'Saúde Mental & Psicossocial'
    | 'Saúde & Segurança Ocupacional'
    | 'Governança & Organização'
    | 'Compliance & Integridade'
    | 'Inteligência & Gestão';
  descricao: string;
  rota: string;
  subRotas: string[];
  isBase: boolean;
  ordem: number;
}

export const MODULOS_CONTRATAVEIS: ModuloContratavel[] = [
  // --- DEPARTAMENTO PESSOAL ---
  {
    key: '/colaboradores',
    nome: 'Colaboradores',
    pilar: 'Departamento Pessoal',
    descricao: 'Gestão cadastral, contratos, dependentes e ficha profissional completa.',
    rota: '/colaboradores',
    subRotas: ['/ficha-profissional'],
    isBase: true, // Módulo base inegociável - não pode ser desativado
    ordem: 1,
  },
  {
    key: '/ferias',
    nome: 'Gestão de Férias',
    pilar: 'Departamento Pessoal',
    descricao: 'Controle de períodos aquisitivos, solicitações, aprovações e aviso de férias.',
    rota: '/ferias',
    subRotas: ['/minhas-ferias'],
    isBase: false,
    ordem: 2,
  },
  {
    key: '/demissoes',
    nome: 'Demissões & Desligamentos',
    pilar: 'Departamento Pessoal',
    descricao: 'Fluxo de rescisão, entrevistas de desligamento e motivos de turnover.',
    rota: '/demissoes',
    subRotas: [],
    isBase: false,
    ordem: 3,
  },
  {
    key: '/beneficios',
    nome: 'Benefícios Corporativos',
    pilar: 'Departamento Pessoal',
    descricao: 'Catálogo de benefícios, elegibilidade por cargo/setor e gestão de adesões.',
    rota: '/beneficios',
    subRotas: [],
    isBase: false,
    ordem: 4,
  },
  {
    key: '/minhas-tarefas',
    nome: 'Tarefas & Produtividade',
    pilar: 'Departamento Pessoal',
    descricao: 'Distribuição de tarefas, prazos e lembretes da equipe.',
    rota: '/minhas-tarefas',
    subRotas: ['/minhas-atividades'],
    isBase: false,
    ordem: 5,
  },
  {
    key: '/comunicados',
    nome: 'Mural de Comunicados',
    pilar: 'Departamento Pessoal',
    descricao: 'Mural de avisos internos, confirmação de leitura e campanhas informativas.',
    rota: '/comunicados',
    subRotas: [],
    isBase: false,
    ordem: 6,
  },

  // --- DESENVOLVIMENTO & PERFORMANCE ---
  {
    key: '/avaliacoes',
    nome: 'Avaliação de Desempenho',
    pilar: 'Desenvolvimento & Performance',
    descricao: 'Ciclos 90/180/360°, matriz 9-box, competências e Planos de Desenvolvimento Individual (PDI).',
    rota: '/avaliacoes',
    subRotas: ['/pdi', '/avaliacao/preencher', '/avaliacao/resultado'],
    isBase: false,
    ordem: 7,
  },
  {
    key: '/feedback-gestao',
    nome: 'Feedback Contínuo & 1:1',
    pilar: 'Desenvolvimento & Performance',
    descricao: 'Reuniões 1:1, feedbacks estruturados, elogios e orientações de desenvolvimento.',
    rota: '/feedback-gestao',
    subRotas: ['/feedback'],
    isBase: false,
    ordem: 8,
  },
  {
    key: '/diario-bordo',
    nome: 'Diário de Bordo',
    pilar: 'Desenvolvimento & Performance',
    descricao: 'Acompanhamento do período de experiência (30/60/90 dias) e marcos da jornada.',
    rota: '/diario-bordo',
    subRotas: [],
    isBase: false,
    ordem: 9,
  },
  {
    key: '/treinamentos',
    nome: 'Treinamentos & LXP',
    pilar: 'Desenvolvimento & Performance',
    descricao: 'Trilhas de aprendizagem, emissão e validação pública de certificados.',
    rota: '/treinamentos',
    subRotas: ['/treinamento', '/validar-certificado'],
    isBase: false,
    ordem: 10,
  },

  // --- SAÚDE MENTAL & PSICOSSOCIAL ---
  {
    key: '/cuidar-mais',
    nome: 'Cuidar+ (Clima & Riscos Psicossociais)',
    pilar: 'Saúde Mental & Psicossocial',
    descricao: 'Pesquisas de pulso frequentes, termômetro emocional, alertas de acolhimento e biblioteca de apoio.',
    rota: '/cuidar-mais',
    subRotas: ['/cuidar-mais-form', '/campanhas'],
    isBase: false,
    ordem: 11,
  },

  // --- SAÚDE & SEGURANÇA OCUPACIONAL ---
  {
    key: '/mapa-riscos-nr1',
    nome: 'Mapa de Riscos NR-1 & PGR',
    pilar: 'Saúde & Segurança Ocupacional',
    descricao: 'Importação/IA de PGR, matriz de risco ocupacional, instrumentos científicos (COPSOQ/PROART/HSE) e Checklist AEP.',
    rota: '/mapa-riscos-nr1',
    subRotas: ['/laudo', '/laudo-aep', '/evidencias'],
    isBase: false,
    ordem: 12,
  },

  // --- GOVERNANÇA & ORGANIZAÇÃO ---
  {
    key: '/estrutura-organizacional',
    nome: 'Estrutura Organizacional',
    pilar: 'Governança & Organização',
    descricao: 'Hierarquia de cargos, descrições de função, GHEs, setores e organograma interativo.',
    rota: '/estrutura-organizacional',
    subRotas: ['/organograma'],
    isBase: false,
    ordem: 13,
  },

  // --- INTELIGÊNCIA & GESTÃO ---
  {
    key: '/relatorios-executivos',
    nome: 'Relatórios Executivos',
    pilar: 'Inteligência & Gestão',
    descricao: 'Painel executivo unificado com indicadores consolidados de DHO, turnover e riscos.',
    rota: '/relatorios-executivos',
    subRotas: ['/relatorios'],
    isBase: false,
    ordem: 14,
  },

  // --- COMPLIANCE & INTEGRIDADE ---
  {
    key: '/denuncias',
    nome: 'Canal de Denúncias & Fale Conosco',
    pilar: 'Compliance & Integridade',
    descricao: 'Canal anônimo de denúncias, apuração confidencial, ouvidoria e comportamentos ofensivos.',
    rota: '/denuncias',
    subRotas: ['/comportamentos-ofensivos'],
    isBase: false,
    ordem: 15,
  },
];

/** Mapeamento de chave de rota para módulo contratável correspondente */
export const MAPA_ROTA_MODULO: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  MODULOS_CONTRATAVEIS.forEach((mod) => {
    map[mod.key] = mod.key;
    mod.subRotas.forEach((sub) => {
      map[sub] = mod.key;
    });
  });
  // Adiciona atalhos de sub-rotas dinâmicas
  map['/pdi'] = '/avaliacoes';
  map['/avaliacao'] = '/avaliacoes';
  map['/treinamento'] = '/treinamentos';
  map['/campanhas'] = '/cuidar-mais';
  map['/laudo-aep'] = '/mapa-riscos-nr1';
  map['/evidencias'] = '/mapa-riscos-nr1';
  map['/organograma'] = '/estrutura-organizacional';
  map['/minhas-ferias'] = '/ferias';
  map['/minhas-atividades'] = '/minhas-tarefas';
  map['/relatorios'] = '/relatorios-executivos';
  map['/ficha-profissional'] = '/colaboradores';
  map['/comportamentos-ofensivos'] = '/denuncias';
  return map;
})();

/**
 * Resolve qualquer caminho/pathname (incluindo rotas aninhadas com parâmetros)
 * para a chave canônica do módulo pai contratável.
 */
export function resolverModuloPai(pathname: string): string {
  if (!pathname) return pathname;
  if (MAPA_ROTA_MODULO[pathname]) {
    return MAPA_ROTA_MODULO[pathname];
  }
  for (const mod of MODULOS_CONTRATAVEIS) {
    if (pathname === mod.key || pathname.startsWith(mod.key + '/')) {
      return mod.key;
    }
    for (const sub of mod.subRotas) {
      if (pathname === sub || pathname.startsWith(sub + '/')) {
        return mod.key;
      }
    }
  }
  return pathname;
}

/** Retorna a chave do módulo contratável correspondente a uma rota */
export function obterModuloPorRota(pathname: string): ModuloContratavel | undefined {
  const chavePai = resolverModuloPai(pathname);
  return MODULOS_CONTRATAVEIS.find((mod) => mod.key === chavePai);
}

/** Verifica se um módulo é a base inegociável da plataforma (/colaboradores) */
export function isModuloBase(moduleKey?: string): boolean {
  if (!moduleKey) return false;
  const pai = resolverModuloPai(moduleKey);
  return pai === '/colaboradores';
}
