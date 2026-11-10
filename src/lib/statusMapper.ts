export type StatusAcao = 'pendente' | 'em_andamento' | 'concluida' | 'validada';

export function mapColumnToStatus(colunaId: string): StatusAcao | undefined {
  const map: Record<string, StatusAcao> = {
    'pendente': 'pendente',
    'em_andamento': 'em_andamento',
    'concluida': 'concluida',
    'validada': 'validada'
  };

  return map[colunaId];
}

export function resolveTargetStatus(overId: string, acoes: any[] | undefined): StatusAcao | undefined {
  // Normalização agressiva: lowercase, remove acentos, troca espaços/hífens por underscore
  const normalizedId = overId
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[-\s]+/g, '_');

  // Tenta resolver como uma coluna (status direto)
  const isDirectStatus = mapColumnToStatus(normalizedId);
  if (isDirectStatus) return isDirectStatus;

  // Tenta resolver como um id de card (aqui usamos o overId original caso o ID do card não seja normalizado)
  if (acoes && acoes.length > 0) {
    const acaoDestino = acoes.find(a => a.id === overId);
    if (acaoDestino && acaoDestino.status) {
      return mapColumnToStatus(acaoDestino.status);
    }
  }

  return undefined;
}
