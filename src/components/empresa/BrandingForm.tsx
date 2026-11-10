import { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, RotateCcw, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingFormProps {
  brandName: string;
  onBrandNameChange: (value: string) => void;
  primaryColor: string;
  onPrimaryColorChange: (value: string) => void;
  logoFile: File | null;
  onLogoFileChange: (file: File | null) => void;
  currentLogoUrl?: string | null;
  removeLogo?: boolean;
  onRemoveLogoChange?: (remove: boolean) => void;
  disabled?: boolean;
}

/**
 * Função utilitária para upload de logotipo da empresa no bucket de logos do Supabase.
 */
export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${companyId}/logo-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
}

export function BrandingForm({
  brandName,
  onBrandNameChange,
  primaryColor,
  onPrimaryColorChange,
  logoFile,
  onLogoFileChange,
  currentLogoUrl,
  removeLogo = false,
  onRemoveLogoChange,
  disabled = false,
}: BrandingFormProps) {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gera URL temporária para visualização do arquivo recém-selecionado
  useEffect(() => {
    if (!logoFile) {
      setFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  // URL final para exibição do preview
  const displayLogoUrl = filePreview || (!removeLogo ? currentLogoUrl : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onLogoFileChange(file);
    if (file && onRemoveLogoChange) {
      onRemoveLogoChange(false);
    }
  };

  const handleRemoveLogo = () => {
    if (logoFile) {
      onLogoFileChange(null);
    }
    if (currentLogoUrl && onRemoveLogoChange) {
      onRemoveLogoChange(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUndoRemove = () => {
    if (onRemoveLogoChange) {
      onRemoveLogoChange(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Nome de exibição */}
      <div className="space-y-2">
        <Label htmlFor="wz-brand">Nome de exibição</Label>
        <Input
          id="wz-brand"
          value={brandName}
          onChange={(e) => onBrandNameChange(e.target.value)}
          placeholder="Como sua marca aparece no sistema"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Nome da empresa exibido no topo do menu, abas do navegador e cabeçalhos.
        </p>
      </div>

      {/* Cor principal */}
      <div className="space-y-2">
        <Label htmlFor="wz-color">Cor principal</Label>
        <div className="flex items-center gap-3">
          <Input
            id="wz-color"
            type="color"
            className="h-10 w-16 p-1 cursor-pointer"
            value={primaryColor}
            onChange={(e) => onPrimaryColorChange(e.target.value)}
            disabled={disabled}
          />
          <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Cor de destaque aplicada aos botões, links ativos e elementos principais da interface.
        </p>
      </div>

      {/* Logotipo com preview e opção de remover */}
      <div className="space-y-2">
        <Label htmlFor="wz-logo">Logotipo</Label>

        {/* Preview do logo existente ou novo */}
        {displayLogoUrl && (
          <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="h-16 w-28 flex items-center justify-center rounded bg-background border p-1 shadow-sm">
              <img
                src={displayLogoUrl}
                alt="Pré-visualização do logotipo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {logoFile ? 'Novo arquivo selecionado' : 'Logotipo atual da empresa'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {logoFile ? logoFile.name : 'Exibido na barra lateral e relatórios'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={disabled}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remover
            </Button>
          </div>
        )}

        {/* Aviso de remoção pendente */}
        {removeLogo && !logoFile && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 text-xs text-destructive font-medium">
              <Trash2 className="h-4 w-4" />
              <span>Logotipo marcado para remoção ao salvar.</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUndoRemove}
              disabled={disabled}
              className="text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Desfazer
            </Button>
          </div>
        )}

        {/* Seletor de arquivo */}
        <Input
          id="wz-logo"
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: PNG, JPG, SVG ou WEBP com fundo transparente.
        </p>
      </div>
    </div>
  );
}
