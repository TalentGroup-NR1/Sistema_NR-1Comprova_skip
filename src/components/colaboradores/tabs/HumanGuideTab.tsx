import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface HumanGuideTabProps {
  form: UseFormReturn<ColaboradorFormData>;
  colaboradorId?: string;
}

const BUCKET = 'colaboradores-curriculos';
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function HumanGuideTab({ form, colaboradorId }: HumanGuideTabProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const humanguide_path = form.watch('humanguide_path');

  const handleUpload = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Apenas arquivos PDF ou imagens (PNG, JPG) são aceitos');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('O arquivo deve ter no máximo 10MB');
      return;
    }

    setUploading(true);
    try {
      const oldPath = form.getValues('humanguide_path');
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      const safeName = sanitizeFileName(file.name);
      const folder = colaboradorId || 'new';
      const path = `humanguide/${folder}/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) throw error;

      form.setValue('humanguide_path', path, { shouldDirty: true });
      toast.success('Arquivo HumanGuide enviado com sucesso');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [form, colaboradorId]);

  const handleRemove = useCallback(async () => {
    const path = form.getValues('humanguide_path');
    if (!path) return;
    try {
      await supabase.storage.from(BUCKET).remove([path]);
      form.setValue('humanguide_path', '', { shouldDirty: true });
      toast.success('Arquivo removido');
    } catch (err: any) {
      toast.error('Erro ao remover arquivo');
    }
  }, [form]);

  const handleDownload = useCallback(async () => {
    if (!humanguide_path) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(humanguide_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast.error('Erro ao baixar arquivo');
    } finally {
      setDownloading(false);
    }
  }, [humanguide_path]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  const fileName = humanguide_path ? humanguide_path.split('/').pop()?.replace(/^\d+_/, '') : null;

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="humanguide_notas"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resultado do Teste HumanGuide</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Cole ou digite o resultado do teste HumanGuide aqui..."
                className="min-h-[200px] resize-y"
                maxLength={5000}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <div className="flex justify-between">
              <FormMessage />
              <span className="text-xs text-muted-foreground">
                {(field.value || '').length}/5000
              </span>
            </div>
          </FormItem>
        )}
      />

      <div>
        <p className="text-sm font-medium mb-2">Arquivo do Teste</p>
        {humanguide_path ? (
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
            <FileText className="h-10 w-10 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{fileName}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleRemove} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="font-medium text-sm">{uploading ? 'Enviando...' : 'Arraste o arquivo aqui ou clique para selecionar'}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF ou imagem, máximo 10MB</p>
            </div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
