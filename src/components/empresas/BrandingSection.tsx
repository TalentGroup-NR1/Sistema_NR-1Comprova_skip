import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Palette, RotateCcw, Sparkles } from "lucide-react";
import { LogoUploader } from "./LogoUploader";
import { ColorPicker } from "./ColorPicker";
import { Company } from "@/lib/validators/company";
import { useUpdateCompanyColors, useUpdateCompanyBranding } from "@/hooks/useCompanies";
import { DEFAULT_BRANDING } from "@/hooks/useBranding";

interface BrandingSectionProps {
  company: Company;
}

const DEFAULT_COLORS = {
  primary: "#1E5A99",
  secondary: "#333333",
  accent: "#FFFFFF",
};

// Talent Red preset
const TALENT_RED_COLORS = {
  primary: "#8B0000",
  secondary: "#333333",
  accent: "#FFFFFF",
};

export function BrandingSection({ company }: BrandingSectionProps) {
  const [primaryColor, setPrimaryColor] = useState(company.primary_color || DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(company.secondary_color || DEFAULT_COLORS.secondary);
  const [accentColor, setAccentColor] = useState(company.accent_color || DEFAULT_COLORS.accent);
  const [hasChanges, setHasChanges] = useState(false);

  // Identidade da marca (white-label)
  const [brandName, setBrandName] = useState(company.brand_name || "");
  const [brandLogoUrl, setBrandLogoUrl] = useState(company.brand_logo_url || "");
  const [brandFaviconUrl, setBrandFaviconUrl] = useState(company.brand_favicon_url || "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    company.brand_primary_color || DEFAULT_BRANDING.primaryColor
  );

  useEffect(() => {
    setBrandName(company.brand_name || "");
    setBrandLogoUrl(company.brand_logo_url || "");
    setBrandFaviconUrl(company.brand_favicon_url || "");
    setBrandPrimaryColor(company.brand_primary_color || DEFAULT_BRANDING.primaryColor);
  }, [company]);

  const updateBrandingMutation = useUpdateCompanyBranding();

  const handleSaveBranding = async () => {
    await updateBrandingMutation.mutateAsync({
      id: company.id,
      brand_name: brandName.trim() || null,
      brand_logo_url: brandLogoUrl.trim() || null,
      brand_favicon_url: brandFaviconUrl.trim() || null,
      brand_primary_color: brandPrimaryColor || null,
    });
  };

  const updateColorsMutation = useUpdateCompanyColors();

  // Check if colors have changed from saved values
  useEffect(() => {
    const savedPrimary = company.primary_color || DEFAULT_COLORS.primary;
    const savedSecondary = company.secondary_color || DEFAULT_COLORS.secondary;
    const savedAccent = company.accent_color || DEFAULT_COLORS.accent;

    setHasChanges(
      primaryColor !== savedPrimary ||
      secondaryColor !== savedSecondary ||
      accentColor !== savedAccent
    );
  }, [primaryColor, secondaryColor, accentColor, company]);

  const handleApplyColors = async () => {
    await updateColorsMutation.mutateAsync({
      id: company.id,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
    });
  };

  const handleApplyTalentRed = () => {
    setPrimaryColor(TALENT_RED_COLORS.primary);
    setSecondaryColor(TALENT_RED_COLORS.secondary);
    setAccentColor(TALENT_RED_COLORS.accent);
  };

  const handleResetColors = () => {
    setPrimaryColor(company.primary_color || DEFAULT_COLORS.primary);
    setSecondaryColor(company.secondary_color || DEFAULT_COLORS.secondary);
    setAccentColor(company.accent_color || DEFAULT_COLORS.accent);
  };

  const isLoading = updateColorsMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          Logo da Empresa
        </h3>
        <LogoUploader 
          companyId={company.id} 
          currentLogoUrl={company.logo_url}
        />
      </div>

      <Separator />

      {/* Brand identity (white-label) */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Identidade da Marca
        </h3>
        <p className="text-xs text-muted-foreground">
          Nome, logo e cor exibidos no login, na barra lateral e na aba do navegador.
          Se ficarem em branco, o padrão NR1-Pronto é usado.
        </p>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Nome da marca</Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={DEFAULT_BRANDING.brandName}
              disabled={updateBrandingMutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-logo">URL do logo da marca</Label>
            <Input
              id="brand-logo"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder="https://... (padrão: logo da empresa)"
              disabled={updateBrandingMutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-favicon">URL do favicon</Label>
            <Input
              id="brand-favicon"
              value={brandFaviconUrl}
              onChange={(e) => setBrandFaviconUrl(e.target.value)}
              placeholder="https://... (padrão: logo da marca)"
              disabled={updateBrandingMutation.isPending}
            />
          </div>

          <ColorPicker
            label="Cor da marca"
            value={brandPrimaryColor}
            onChange={setBrandPrimaryColor}
            disabled={updateBrandingMutation.isPending}
          />
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSaveBranding}
          disabled={updateBrandingMutation.isPending}
        >
          {updateBrandingMutation.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Salvar identidade
        </Button>
      </div>

      <Separator />

      {/* Colors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cores do Tema
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyTalentRed}
            disabled={isLoading}
          >
            Aplicar Talent Red
          </Button>
        </div>

        <div className="grid gap-4">
          <ColorPicker
            label="Cor Primária"
            value={primaryColor}
            onChange={setPrimaryColor}
            disabled={isLoading}
          />

          <ColorPicker
            label="Cor Secundária"
            value={secondaryColor}
            onChange={setSecondaryColor}
            disabled={isLoading}
          />

          <ColorPicker
            label="Cor de Acentuação"
            value={accentColor}
            onChange={setAccentColor}
            disabled={isLoading}
          />
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
          <div className="flex items-center gap-2">
            <div
              className="px-4 py-2 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Botão Primário
            </div>
            <div
              className="px-4 py-2 rounded-md text-sm font-medium border-2"
              style={{ 
                borderColor: primaryColor, 
                color: primaryColor,
                backgroundColor: accentColor 
              }}
            >
              Botão Secundário
            </div>
            <div
              className="w-8 h-8 rounded-md"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>
        </div>

        {/* Actions */}
        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={handleApplyColors}
              disabled={isLoading}
              size="sm"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Cores
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetColors}
              disabled={isLoading}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Descartar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
