import { useState, useEffect } from "react";
import { Globe, Loader2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useReplicationTargetCount } from "@/hooks/useGlobalReplication";

interface GlobalReplicationToggleProps {
  sourceCompanyId: string | null;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function GlobalReplicationToggle({
  sourceCompanyId,
  enabled,
  onEnabledChange,
  disabled = false,
}: GlobalReplicationToggleProps) {
  const { isAdminMaster } = useAuth();
  const { data: targetCount, isLoading } = useReplicationTargetCount(sourceCompanyId);

  // Only admin_master can see this toggle
  if (!isAdminMaster) {
    return null;
  }

  // Don't show if no source company selected
  if (!sourceCompanyId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <Label htmlFor="global-replication" className="font-medium">
            Replicar para todas as empresas
          </Label>
        </div>
        <Switch
          id="global-replication"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled || isLoading || !targetCount}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Verificando empresas...</span>
        </div>
      ) : targetCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há outras empresas ativas para replicar.
        </p>
      ) : enabled ? (
        <Alert variant="default" className="bg-primary/5 border-primary/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ao salvar, uma cópia será criada em <strong>{targetCount}</strong>{" "}
            {targetCount === 1 ? "outra empresa" : "outras empresas"}.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ative para criar cópias em {targetCount}{" "}
          {targetCount === 1 ? "empresa" : "empresas"}.
        </p>
      )}
    </div>
  );
}
