import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: "Tipo de arquivo não suportado. Use PNG, JPG ou SVG." 
    };
  }
  
  if (file.size > MAX_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.` 
    };
  }
  
  return { valid: true };
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, file }: { companyId: string; file: File }) => {
      // Validate file
      const validation = validateLogoFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${companyId}/logo.${extension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update company record
      const { error: updateError } = await supabase
        .from("companies")
        .update({ 
          logo_url: logoUrl,
          logo_upload_date: new Date().toISOString()
        })
        .eq("id", companyId);

      if (updateError) throw updateError;

      return logoUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Logo atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao fazer upload do logo: " + error.message);
    },
  });
}

export function useDeleteCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      // List files in company folder to find the logo
      const { data: files } = await supabase.storage
        .from("logos")
        .list(companyId);

      // Delete all logo files for this company
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${companyId}/${f.name}`);
        await supabase.storage
          .from("logos")
          .remove(filePaths);
      }

      // Update company record
      const { error: updateError } = await supabase
        .from("companies")
        .update({ 
          logo_url: null,
          logo_upload_date: null
        })
        .eq("id", companyId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Logo removido com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover logo: " + error.message);
    },
  });
}
