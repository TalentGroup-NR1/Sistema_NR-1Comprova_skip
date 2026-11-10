import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getBlogSignedUrl } from "@/hooks/useBlogPosts";
import { cn } from "@/lib/utils";

interface Props {
  path: string | null | undefined;
  alt: string;
  className?: string;
}

/** Capa do artigo — resolve a URL assinada do bucket privado. */
export function BlogCover({ path, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    getBlogSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className={cn("landing-navy flex items-center justify-center", className)}>
        <FileText className="h-8 w-8 text-white/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
