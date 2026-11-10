import { useAuth } from './useAuth';
import { useMyColaborador } from './useMyFeedbackCycles';

/**
 * Hook that provides gestor_departamento filtering info.
 * For gestor_departamento users, returns their colaborador ID so queries
 * can filter by gestor_id. For other roles, no filtering is applied.
 */
export function useGestorFilter() {
  const { role } = useAuth();
  const isGestor = role === 'gestor_departamento';
  const { data: myColaborador, isLoading } = useMyColaborador();

  return {
    /** The gestor's own colaborador ID (null if not gestor or not loaded) */
    gestorColaboradorId: isGestor ? myColaborador?.id ?? null : null,
    /** The gestor's own department (null if not gestor or not loaded) */
    gestorDepartment: isGestor ? myColaborador?.department ?? null : null,
    /** The gestor's own colaborador record */
    myColaborador: isGestor ? myColaborador : null,
    /** Whether the current user is a gestor_departamento */
    isGestor,
    /** Whether queries should filter by gestor_id */
    shouldFilterByGestor: isGestor && !!myColaborador?.id,
    /** Whether the gestor data is still loading */
    isLoadingGestor: isGestor && isLoading,
  };
}
