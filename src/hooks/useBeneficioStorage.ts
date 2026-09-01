import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ACCEPTED_MATERIAL_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4'
];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_PDF_PPT_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getMaterialType(file: File): 'pdf' | 'ppt' | 'video' | null {
  const mimeType = file.type;
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
  if (mimeType.startsWith('video/')) return 'video';
  return null;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato inválido. Aceitos: JPG, PNG, WebP';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'Imagem muito grande. Máximo: 5MB';
  }
  return null;
}

export function validateMaterialFile(file: File): string | null {
  if (!ACCEPTED_MATERIAL_TYPES.includes(file.type)) {
    return 'Formato inválido. Aceitos: PDF, PPT, PPTX, MP4';
  }
  
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PDF_PPT_SIZE;
  const maxSizeLabel = isVideo ? '500MB' : '50MB';
  
  if (file.size > maxSize) {
    return `Arquivo muito grande. Máximo: ${maxSizeLabel}`;
  }
  return null;
}

export async function uploadBeneficioImagem(file: File, beneficioId: string): Promise<string | null> {
  const error = validateImageFile(file);
  if (error) {
    toast.error(error);
    return null;
  }

  const ext = getFileExtension(file.name);
  const fileName = `${beneficioId}/${Date.now()}.${ext}`;

  const { data, error: uploadError } = await supabase.storage
    .from('beneficios-imagens')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    toast.error('Erro ao fazer upload da imagem');
    console.error(uploadError);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beneficios-imagens')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function uploadBeneficioMaterial(file: File, beneficioId: string): Promise<string> {
  const validationError = validateMaterialFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // Sanitize file name to remove spaces, accents and special characters
  const sanitizedName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${beneficioId}/${Date.now()}-${sanitizedName}`;

  const { data, error: uploadError } = await supabase.storage
    .from('beneficios-materiais')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
  }

  return data.path;
}

export async function getSignedMaterialUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('beneficios-materiais')
    .createSignedUrl(path, 3600); // 1 hora

  if (error) {
    console.error('Erro ao gerar URL assinada:', error);
    return null;
  }

  return data.signedUrl;
}

export async function deleteBeneficioImagem(url: string): Promise<boolean> {
  // Extract path from public URL
  const match = url.match(/beneficios-imagens\/(.+)$/);
  if (!match) return false;

  const { error } = await supabase.storage
    .from('beneficios-imagens')
    .remove([match[1]]);

  if (error) {
    console.error('Erro ao deletar imagem:', error);
    return false;
  }
  return true;
}

export async function deleteBeneficioMaterial(path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('beneficios-materiais')
    .remove([path]);

  if (error) {
    console.error('Erro ao deletar material:', error);
    return false;
  }
  return true;
}
