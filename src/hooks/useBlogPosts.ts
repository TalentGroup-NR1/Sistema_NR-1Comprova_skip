import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BLOG_BUCKET = "blog";

export type BlogStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  pdf_url: string | null;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  reading_time_min: number | null;
  meta_description: string | null;
  meta_keywords: string | null;
}

export type BlogPostInput = Omit<
  BlogPost,
  "id" | "created_at" | "updated_at"
> & { id?: string };

/** Gera slug a partir do título (sem acentos, kebab-case). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** O bucket é privado: geramos URL assinada (1h) para capas e PDFs. */
export async function getBlogSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from(BLOG_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function uploadBlogFile(file: File, prefix: string): Promise<string> {
  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(BLOG_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Artigos publicados (uso público). */
export function usePublishedPosts(limit?: number) {
  return useQuery({
    queryKey: ["blog-posts", "published", limit ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
}

export function usePostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["blog-posts", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data as BlogPost | null) ?? null;
    },
  });
}

/** Todos os artigos (Super Admin). */
export function useAllPosts() {
  return useQuery({
    queryKey: ["blog-posts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });
}

export function useBlogMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["blog-posts"] });

  const save = useMutation({
    mutationFn: async (input: BlogPostInput) => {
      const payload = {
        slug: input.slug,
        title: input.title,
        category: input.category,
        excerpt: input.excerpt,
        content: input.content,
        cover_image_url: input.cover_image_url,
        pdf_url: input.pdf_url,
        status: input.status,
        published_at:
          input.status === "published"
            ? input.published_at ?? new Date().toISOString()
            : null,
        author_name: input.author_name,
        reading_time_min: input.reading_time_min,
        meta_description: input.meta_description,
        meta_keywords: input.meta_keywords,
      };
      if (input.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Artigo salvo.");
    },
    onError: (e: any) =>
      toast.error(
        e?.message?.includes("duplicate")
          ? "Já existe um artigo com este slug."
          : e?.message ?? "Não foi possível salvar o artigo.",
      ),
  });

  const togglePublish = useMutation({
    mutationFn: async (post: BlogPost) => {
      const publishing = post.status !== "published";
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: publishing ? "published" : "draft",
          published_at: publishing
            ? post.published_at ?? new Date().toISOString()
            : null,
        })
        .eq("id", post.id);
      if (error) throw error;
      return publishing;
    },
    onSuccess: (publishing) => {
      invalidate();
      toast.success(publishing ? "Artigo publicado." : "Artigo despublicado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao alterar o status."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Artigo excluído.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir o artigo."),
  });

  return { save, togglePublish, remove };
}
