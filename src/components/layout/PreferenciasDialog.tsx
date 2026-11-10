import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useBranding } from "@/hooks/useBranding";
import { RotateCcw } from "lucide-react";

const THEME_COLORS = [
  { label: "Azul", hex: "#1E5A99" },
  { label: "Verde", hex: "#10B981" },
  { label: "Roxo", hex: "#8B5CF6" },
  { label: "Vermelho", hex: "#DC2626" },
  { label: "Laranja", hex: "#F97316" },
  { label: "Rosa", hex: "#EC4899" },
  { label: "Ciano", hex: "#06B6D4" },
  { label: "Âmbar", hex: "#F59E0B" },
  { label: "Índigo", hex: "#6366F1" },
  { label: "Esmeralda", hex: "#059669" },
];

interface PreferenciasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferenciasDialog({ open, onOpenChange }: PreferenciasDialogProps) {
  const { themeColor, updateThemeColor } = useUserPreferences();
  const { companyPrimaryColor, primaryColor } = useBranding();
  const effectiveCompanyColor = companyPrimaryColor || primaryColor || "#0D13C5";

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedColor(themeColor);
      setCustomHex(themeColor || "");
    }
  }, [open, themeColor]);

  const handleSave = () => {
    updateThemeColor.mutate(selectedColor);
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelectedColor(null);
    setCustomHex("");
  };

  const handlePresetClick = (hex: string) => {
    setSelectedColor(hex);
    setCustomHex(hex);
  };

  const handleCustomChange = (value: string) => {
    setCustomHex(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setSelectedColor(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências</DialogTitle>
          <DialogDescription>Personalize a cor do sistema para o seu perfil.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Label className="text-sm font-medium">Escolha uma cor de tema</Label>

          {/* Preset grid */}
          <div className="grid grid-cols-5 gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => handlePresetClick(color.hex)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105",
                  selectedColor?.toLowerCase() === color.hex.toLowerCase()
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-sm border border-border"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-[10px] text-muted-foreground leading-tight">{color.label}</span>
              </button>
            ))}
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="color"
              value={selectedColor || effectiveCompanyColor}
              onChange={(e) => {
                setSelectedColor(e.target.value);
                setCustomHex(e.target.value);
              }}
              className="w-10 h-10 rounded-md border border-input cursor-pointer"
              style={{ padding: 0 }}
            />
            <Input
              value={customHex}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder={effectiveCompanyColor}
              maxLength={7}
              className="w-28 font-mono text-sm uppercase"
            />
            {selectedColor && (
              <div
                className="w-10 h-10 rounded-md border border-input shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
            )}
          </div>

          {/* Reset button */}
          <Button
            variant={selectedColor === null ? "secondary" : "outline"}
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Usar cor da empresa {effectiveCompanyColor ? `(${effectiveCompanyColor})` : ""}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateThemeColor.isPending}>
            {updateThemeColor.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
