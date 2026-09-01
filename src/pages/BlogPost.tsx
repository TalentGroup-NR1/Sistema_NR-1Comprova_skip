import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Download, Loader2 } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BlogCover } from "@/components/blog/BlogCover";
import { Button } from "@/components/ui/button";
import { getBlogSignedUrl, usePostBySlug } from "@/hooks/useBlogPosts";
import { sanitizeRichText } from "@/lib/sanitize";

const SITE_URL = "https://nr-1pronto.com.br";

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = "canonical";
    } else {
      el = document.createElement("meta");
      const match = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (match) el.setAttribute(match[1], match[2]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = usePostBySlug(slug);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (post?.pdf_url) {
      getBlogSignedUrl(post.pdf_url).then((u) => {
        if (!cancelled) setPdfUrl(u);
      });
    } else {
      setPdfUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [post?.pdf_url]);

  useEffect(() => {
    if (!post) return;
    const description = post.meta_description || post.excerpt;
    const url = `${SITE_URL}/blog/${post.slug}`;
    document.title = `${post.title} | NR-1 Pronto`;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", post.title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", post.title);
    setMeta('meta[name="twitter:description"]', "content", description);
    if (post.meta_keywords) setMeta('meta[name="keywords"]', "content", post.meta_keywords);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-blog-jsonld", "true");
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: post.author_name || "Talent Group" },
      publisher: { "@type": "Organization", name: "NR-1 Pronto" },
      mainEntityOfPage: url,
      articleSection: post.category,
    });
    document.head.appendChild(ld);
    return () => {
      ld.remove();
    };
  }, [post]);

  return (
    <div className="min-h-screen bg-brand-offwhite font-brand">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Button variant="ghost" asChild className="mb-6 -ml-3 text-muted-foreground">
          <Link to="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para os artigos
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !post || post.status !== "published" ? (
          <div className="py-20 text-center">
            <h1 className="text-2xl font-extrabold text-brand-gray-dark">
              Artigo não encontrado
            </h1>
            <p className="mt-3 text-muted-foreground">
              Este conteúdo pode ter sido removido ou ainda não foi publicado.
            </p>
          </div>
        ) : (
          <article>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
              {post.category}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-brand-gray-dark sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{post.author_name || "Talent Group"}</span>
              {post.published_at && (
                <span>
                  ·{" "}
                  {new Date(post.published_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {!!post.reading_time_min && (
                <span className="flex items-center gap-1">
                  · <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.reading_time_min} min de leitura
                </span>
              )}
            </p>

            {post.cover_image_url && (
              <div className="mt-8 overflow-hidden rounded-2xl">
                <BlogCover path={post.cover_image_url} alt={post.title} className="h-64 w-full" />
              </div>
            )}

            <div
              className="prose prose-slate mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }}
            />

            {pdfUrl && (
              <div className="mt-10 rounded-2xl border border-border bg-card p-6">
                <p className="text-sm font-semibold text-brand-gray-dark">
                  Material complementar em PDF
                </p>
                <Button asChild className="mt-3 bg-brand-red text-white hover:bg-brand-red/90">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </a>
                </Button>
              </div>
            )}
          </article>
        )}
      </main>
      <LandingFooter />
    </div>
  );
};

export default BlogPostPage;
