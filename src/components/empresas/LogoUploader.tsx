import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { useUploadCompanyLogo, useDeleteCompanyLogo, validateLogoFile } from "@/hooks/useCompanyLogo";
import { cn } from "@/lib/utils";

interface LogoUploaderProps {
  companyId: string;
  currentLogoUrl?: string | null;
}

export function LogoUploader({ companyId, currentLogoUrl }: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadCompanyLogo();
  const deleteMutation = useDeleteCompanyLogo();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setError(validation.error || "Arquivo inválido");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({ companyId, file: selectedFile });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleRemoveLogo = async () => {
    await deleteMutation.mutateAsync(companyId);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;
  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayUrl ? (
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="w-24 h-16 flex items-center justify-center bg-background rounded border">
              <img
                src={displayUrl}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1">
              {selectedFile ? (
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Logo atual</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {selectedFile ? (
              <>
                <Button
                  onClick={handleUpload}
                  disabled={isLoading}
                  size="sm"
                >
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Logo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelPreview}
                  disabled={isLoading}
                  size="sm"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Trocar Logo
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveLogo}
                  disabled={isLoading}
                  size="sm"
                >
                  {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG ou SVG (máx. 5MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
