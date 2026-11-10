import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const BUCKET_NAME = "treinamentos";

// File type configurations
export const FILE_TYPE_CONFIG = {
  pdf: {
    accept: ".pdf",
    mimeTypes: ["application/pdf"],
    maxSizeMB: 50,
    label: "PDF",
  },
  ppt: {
    accept: ".ppt,.pptx",
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxSizeMB: 50,
    label: "PowerPoint",
  },
  video: {
    accept: ".mp4",
    mimeTypes: ["video/mp4"],
    maxSizeMB: 500,
    label: "Vídeo MP4",
  },
} as const;

export type UploadableFileType = keyof typeof FILE_TYPE_CONFIG;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file against type and size constraints
 */
export function validateFile(
  file: File,
  fileType: UploadableFileType
): FileValidationResult {
  const config = FILE_TYPE_CONFIG[fileType];
  const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

  // Check file type
  const isValidType = config.mimeTypes.some(
    (mime) => file.type === mime || file.name.toLowerCase().endsWith(config.accept.split(",")[0])
  );

  if (!isValidType) {
    return {
      valid: false,
      error: `Tipo de arquivo inválido. Esperado: ${config.label} (${config.accept})`,
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${config.maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file path for storage
 */
function generateFilePath(treinamentoId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${treinamentoId}/${timestamp}_${sanitizedName}`;
}

/**
 * Hook for uploading training files to Supabase Storage
 */
export function useUploadTreinamentoFile() {
  return useMutation({
    mutationFn: async ({
      treinamentoId,
      file,
      fileType,
    }: {
      treinamentoId: string;
      file: File;
      fileType: UploadableFileType;
    }) => {
      // Validate file
      const validation = validateFile(file, fileType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const filePath = generateFilePath(treinamentoId, file.name);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      return {
        filePath,
        fileName: file.name,
        fileSize: file.size,
      };
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/** Validação e upload de imagem de capa do treinamento */
const CAPA_MAX_MB = 5;
const CAPA_MIME = ["image/jpeg", "image/png", "image/webp"];

export function useUploadTreinamentoCapa() {
  return useMutation({
    mutationFn: async ({ treinamentoId, file }: { treinamentoId: string; file: File }) => {
      if (!CAPA_MIME.includes(file.type)) {
        throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
      }
      if (file.size > CAPA_MAX_MB * 1024 * 1024) {
        throw new Error(`Imagem muito grande. Máximo: ${CAPA_MAX_MB}MB`);
      }

      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${treinamentoId}/capas/${Date.now()}_${sanitized}`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) throw new Error(`Erro ao enviar capa: ${error.message}`);

      return { filePath };
    },
    onError: (error: Error) => {
      toast({ title: "Erro no upload da capa", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Hook for deleting training files from Supabase Storage
 */
export function useDeleteTreinamentoFile() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        throw new Error(`Erro ao excluir arquivo: ${error.message}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Get a signed URL for accessing a training file (valid for 60 minutes)
 */
export async function getSignedUrlTreinamento(
  filePath: string
): Promise<string | null> {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 60 minutes

  if (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Check if a file path is a storage path (not a URL)
 */
export function isStoragePath(urlOrPath: string | null): boolean {
  if (!urlOrPath) return false;
  return !urlOrPath.startsWith("http://") && !urlOrPath.startsWith("https://");
}
