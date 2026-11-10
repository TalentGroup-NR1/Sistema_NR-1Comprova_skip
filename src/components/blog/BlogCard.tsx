import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { BlogCover } from "@/components/blog/BlogCover";
import type { BlogPost } from "@/hooks/useBlogPosts";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="h-36 w-full overflow-hidden">
          <BlogCover path={post.cover_image_url} alt={post.title} className="h-36 w-full" />
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
            {post.category}
            {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
          </p>
          <h3 className="mt-2 text-base font-bold leading-snug text-brand-gray-dark">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
          {!!post.reading_time_min && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.reading_time_min} min de leitura
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
