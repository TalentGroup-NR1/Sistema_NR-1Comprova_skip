import { useNavigate } from 'react-router-dom';
import { Building2, Server } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'platform-mode';

export type PlatformMode = 'empresa' | 'plataforma';

export function getPlatformMode(): PlatformMode {
  return (localStorage.getItem(STORAGE_KEY) as PlatformMode) || 'empresa';
}

/** Alternador Modo Empresa / Modo Plataforma — visível apenas para super admin. */
export function PlatformModeToggle() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const mode = getPlatformMode();

  if (!isSuperAdmin) return null;

  const setMode = (next: PlatformMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    navigate(next === 'plataforma' ? '/admin-plataforma' : '/');
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
      <Button
        type="button"
        size="sm"
        variant={mode === 'empresa' ? 'default' : 'ghost'}
        className={cn('h-8 gap-2 rounded-lg text-xs')}
        onClick={() => setMode('empresa')}
      >
        <Building2 className="h-3.5 w-3.5" />
        Modo Empresa
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'plataforma' ? 'default' : 'ghost'}
        className={cn('h-8 gap-2 rounded-lg text-xs')}
        onClick={() => setMode('plataforma')}
      >
        <Server className="h-3.5 w-3.5" />
        Modo Plataforma
      </Button>
    </div>
  );
}
