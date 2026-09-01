import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/comunicados/RichTextEditor";
import { toast } from "sonner";
import {
  slugify,
  uploadBlogFile,
  useBlogMutations,
  type BlogPost,
} from "@/hooks/useBlogPosts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
}

const empty = {
  slug: "",
  title: "",
  category: "NR-1",
  excerpt: "",
  content: "",
  cover_image_url: "",
  pdf_url: "",
  author_name: "Talent Group",
  reading_time_min: 5,
  meta_description: "",
  meta_keywords: "",
};

export function BlogPostFormDialog({ open, onOpenChange, post }: Props) {
  const { save } = useBlogMutations();
  const [form, setForm] = useState(empty);
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "pdf" | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlugEdited(!!post);
    setForm(
      post
        ? {
            slug: post.slug,
            title: post.title,
            category: post.category,
            excerpt: post.excerpt,
            content: post.content,
            cover_image_url: post.cover_image_url ?? "",
            pdf_url: post.pdf_url ?? "",
            author_name: post.author_name ?? "Talent Group",
            reading_time_min: post.reading_time_min ?? 5,
            meta_description: post.meta_description ?? "",
            meta_keywords: post.meta_keywords ?? "",
          }
        : empty,
    );
  }, [open, post]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  const handleUpload = async (file: File, tipo: "cover" | "pdf") => {
    setUploading(tipo);
    try {
      const path = await uploadBlogFile(file, tipo === "cover" ? "capas" : "pdfs");
      set(tipo === "cover" ? { cover_image_url: path } : { pdf_url: path });
      toast.success("Arquivo enviado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no envio do arquivo.");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (status: "draft" | "published") => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      toast.error("Preencha título, resumo e conteúdo.");
      return;
    }
    await save.mutateAsync({
      id: post?.id,
      slug: (form.slug || slugify(form.title)).trim(),
      title: form.title.trim(),
      category: form.category.trim() || "NR-1",
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover_image_url: form.cover_image_url || null,
      pdf_url: form.pdf_url || null,
      status,
      published_at: post?.published_at ?? null,
      author_name: form.author_name || "Talent Group",
      reading_time_min: Number(form.reading_time_min) || 5,
      meta_description: form.meta_description || null,
      meta_keywords: form.meta_keywords || null,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Editar artigo" : "Novo artigo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  set(slugEdited ? { title } : { title, slug: slugify(title) });
                }}
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set({ slug: slugify(e.target.value) });
                }}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Resumo</Label>
            <Textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => set({ excerpt: e.target.value })}
            />
          </div>

          <div>
            <Label>Conteúdo</Label>
            <RichTextEditor content={form.content} onChange={(c) => set({ content: c })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Imagem de capa</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "cover");
                  }}
                />
                {uploading === "cover" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {form.cover_image_url && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {form.cover_image_url}
                </p>
              )}
            </div>
            <div>
              <Label>PDF anexo (opcional)</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "pdf");
                  }}
                />
                {uploading === "pdf" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {form.pdf_url && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{form.pdf_url}</p>
              )}
            </div>
            <div>
              <Label>Autor</Label>
              <Input
                value={form.author_name}
                onChange={(e) => set({ author_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Tempo de leitura (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.reading_time_min}
                onChange={(e) => set({ reading_time_min: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Meta description (SEO)</Label>
              <Textarea
                rows={2}
                maxLength={160}
                value={form.meta_description}
                onChange={(e) => set({ meta_description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Meta keywords (SEO)</Label>
              <Input
                value={form.meta_keywords}
                onChange={(e) => set({ meta_keywords: e.target.value })}
                placeholder="nr-1, riscos psicossociais, pgr"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => submit("draft")} disabled={save.isPending}>
            Salvar rascunho
          </Button>
          <Button onClick={() => submit("published")} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
