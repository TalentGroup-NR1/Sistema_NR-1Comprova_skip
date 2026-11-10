import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'colaboradores-avatars';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useColaboradorAvatar() {
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File, colaboradorId?: string): Promise<string | null> => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      return null;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const folder = colaboradorId || 'new';
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message || 'Tente novamente'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async (url: string): Promise<boolean> => {
    try {
      // Extract path from public URL
      const parts = url.split(`/storage/v1/object/public/${BUCKET}/`);
      if (parts.length < 2) return false;
      const path = parts[1];

      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error deleting avatar:', err);
      return false;
    }
  };

  return { uploadAvatar, deleteAvatar, uploading };
}
