import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";
import {
  type FaixasHoraExtra,
  type GrupoFaixaHE,
  GRUPOS,
  MAX_FAIXAS,
} from "@/lib/faixasHoraExtra";

interface Props {
  value: FaixasHoraExtra;
  onChange: (next: FaixasHoraExtra) => void;
  onSave: () => void;
  dirty: boolean;
  saving: boolean;
  disabled?: boolean;
}

export function FaixasHoraExtraEditor({ value, onChange, onSave, dirty, saving, disabled }: Props) {
  const updateGroup = (grupo: GrupoFaixaHE, faixas: FaixasHoraExtra[GrupoFaixaHE]) => {
    onChange({ ...value, [grupo]: faixas });
  };

  const addFaixa = (grupo: GrupoFaixaHE) => {
    const atual = value[grupo];
    if (atual.length >= MAX_FAIXAS) return;
    const last = atual[atual.length - 1];
    const novaPenultima = { ...last, ate_horas: last.ate_horas ?? 2 };
    const novaUltima = { ate_horas: null, percentual: 100 };
    updateGroup(grupo, [...atual.slice(0, -1), novaPenultima, novaUltima]);
  };

  const removeFaixa = (grupo: GrupoFaixaHE, idx: number) => {
    const atual = value[grupo];
    if (atual.length <= 1) return;
    const next = atual.filter((_, i) => i !== idx);
    // Garante última sempre sem teto
    next[next.length - 1] = { ...next[next.length - 1], ate_horas: null };
    updateGroup(grupo, next);
  };

  const updateFaixa = (grupo: GrupoFaixaHE, idx: number, patch: Partial<{ ate_horas: number | null; percentual: number }>) => {
    const next = value[grupo].map((f, i) => (i === idx ? { ...f, ...patch } : f));
    updateGroup(grupo, next);
  };

  return (
    <div className="space-y-5">
      {GRUPOS.map(({ key, label }) => {
        const faixas = value[key];
        return (
          <div key={key} className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{label}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addFaixa(key)}
                disabled={faixas.length >= MAX_FAIXAS || disabled}
                className="gap-1 h-8"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar faixa
              </Button>
            </div>
            <div className="space-y-2">
              {faixas.map((f, idx) => {
                const isLast = idx === faixas.length - 1;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {isLast ? (
                        <div className="text-xs text-muted-foreground h-10 flex items-center px-3 bg-muted rounded-md">
                          {faixas.length === 1 ? "Todas as horas" : "Acima do limite anterior"}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Até (horas)</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={f.ate_horas ?? ""}
                            onChange={(e) =>
                              updateFaixa(key, idx, {
                                ate_horas: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            disabled={disabled}
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-span-5 space-y-1">
                      <span className="text-xs text-muted-foreground">Adicional (%)</span>
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        value={f.percentual}
                        onChange={(e) => updateFaixa(key, idx, { percentual: Number(e.target.value) })}
                        disabled={disabled}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFaixa(key, idx)}
                        disabled={faixas.length <= 1 || disabled}
                        title="Remover faixa"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={onSave} disabled={!dirty || saving || disabled} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
