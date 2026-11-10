import { useState, useEffect, useCallback, useRef } from 'react';
import { useUpdateLogAcesso, useUpdateProgresso } from './useTreinamentoProgresso';

interface UseTrainingTimerProps {
  logId: string | undefined;
  progressoId: string | undefined;
  treinamentoId: string;
  tempoMinimoMinutos: number;
  initialSeconds?: number;
  enabled?: boolean;
}

interface UseTrainingTimerReturn {
  elapsedSeconds: number;
  elapsedMinutes: number;
  isActive: boolean;
  isPaused: boolean;
  hasReachedMinimum: boolean;
  percentComplete: number;
  pause: () => void;
  resume: () => void;
}

export function useTrainingTimer({
  logId,
  progressoId,
  treinamentoId,
  tempoMinimoMinutos,
  initialSeconds = 0,
  enabled = true,
}: UseTrainingTimerProps): UseTrainingTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef(0);
  const updateLogAcesso = useUpdateLogAcesso();
  const updateProgresso = useUpdateProgresso();

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const hasReachedMinimum = tempoMinimoMinutos === 0 || elapsedMinutes >= tempoMinimoMinutos;
  const percentComplete = tempoMinimoMinutos > 0 
    ? Math.min(100, (elapsedMinutes / tempoMinimoMinutos) * 100) 
    : 100;

  // Salvar progresso periodicamente
  const saveProgress = useCallback(async (seconds: number, finalize = false) => {
    if (!logId) return;
    
    try {
      await updateLogAcesso.mutateAsync({
        id: logId,
        tempo_acumulado_segundos: seconds,
        finalizado: finalize,
      });

      if (progressoId) {
        const minutes = Math.floor(seconds / 60);
        await updateProgresso.mutateAsync({
          id: progressoId,
          treinamento_id: treinamentoId,
          tempo_total_minutos: minutes,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar progresso do timer:", error);
    }
  }, [logId, progressoId, treinamentoId, updateLogAcesso, updateProgresso]);

  // Timer principal
  useEffect(() => {
    if (!enabled || !isActive || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const newSeconds = prev + 1;
        
        // Salvar a cada 30 segundos
        if (newSeconds - lastSaveRef.current >= 30) {
          lastSaveRef.current = newSeconds;
          saveProgress(newSeconds);
        }
        
        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isActive, isPaused, saveProgress]);

  // Visibility change - pausar quando troca de aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsActive(false);
        // Salvar progresso ao sair
        saveProgress(elapsedSeconds);
      } else {
        setIsActive(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [elapsedSeconds, saveProgress]);

  // Window blur/focus - pausar quando perde foco
  useEffect(() => {
    const handleBlur = () => {
      setIsActive(false);
    };

    const handleFocus = () => {
      setIsActive(true);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Cleanup - salvar ao desmontar
  useEffect(() => {
    return () => {
      saveProgress(elapsedSeconds, true);
    };
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    saveProgress(elapsedSeconds);
  }, [elapsedSeconds, saveProgress]);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds,
    elapsedMinutes,
    isActive,
    isPaused,
    hasReachedMinimum,
    percentComplete,
    pause,
    resume,
  };
}
