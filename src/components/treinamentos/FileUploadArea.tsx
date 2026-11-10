import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, FileText, FileVideo, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FILE_TYPE_CONFIG,
  UploadableFileType,
  validateFile,
} from "@/hooks/useTreinamentoStorage";

interface FileUploadAreaProps {
  fileType: UploadableFileType;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  existingFileName?: string | null;
  disabled?: boolean;
  className?: string;
}

export function FileUploadArea({
  fileType,
  selectedFile,
  onFileSelect,
  existingFileName,
  disabled = false,
  className,
}: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = FILE_TYPE_CONFIG[fileType];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileValidation(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
    // Reset input to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileValidation = (file: File) => {
    setError(null);
    const validation = validateFile(file, fileType);

    if (!validation.valid) {
      setError(validation.error || "Arquivo inválido");
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "ppt":
        return <FileType2 className="h-8 w-8 text-orange-500" />;
      case "video":
        return <FileVideo className="h-8 w-8 text-blue-500" />;
      default:
        return <FileText className="h-8 w-8 text-muted-foreground" />;
    }
  };

  // If we have a selected file, show preview
  if (selectedFile) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <div className="flex items-center gap-4">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If there's an existing file, show it
  if (existingFileName && !selectedFile) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <div className="flex items-center gap-4">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{existingFileName}</p>
            <p className="text-sm text-muted-foreground">Arquivo atual</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Substituir
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Upload drop zone
  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-1">
          Arraste o arquivo ou clique para selecionar
        </p>
        <p className="text-sm text-muted-foreground">
          {config.label} ({config.accept}) • Máximo {config.maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
