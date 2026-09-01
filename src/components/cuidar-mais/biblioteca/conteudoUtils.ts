import { useState } from "react";
import { BookOpen, FileText, Play, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  extractYoutubeId,
  getCuidarSignedUrl,
  type CuidarConteudo,
} from "@/hooks/useCuidarConteudos";

export const TIPO_META: Record<
  CuidarConteudo["tipo"],
  { icon: LucideIcon; label: string; acao: string }
> = {
  video: { icon: Play, label: "Vídeo", acao: "Assistir" },
  cartilha: { icon: FileText, label: "Cartilha", acao: "Ler cartilha" },
  artigo: { icon: BookOpen, label: "Artigo", acao: "Ler artigo" },
};

/** Gradiente determinístico usado quando o material não tem capa. */
const GRADIENTES = [
  "from-primary/25 via-primary/10 to-background",
  "from-emerald-500/25 via-emerald-500/10 to-background",
  "from-sky-500/25 via-sky-500/10 to-background",
  "from-amber-500/25 via-amber-500/10 to-background",
  "from-violet-500/25 via-violet-500/10 to-background",
  "from-rose-500/25 via-rose-500/10 to-background",
];

export function gradientePorCategoria(categoria: string): string {
  let hash = 0;
  for (let i = 0; i < categoria.length; i++) {
    hash = (hash * 31 + categoria.charCodeAt(i)) % 997;
  }
  return GRADIENTES[hash % GRADIENTES.length];
}

/** Vídeo do YouTube informado por URL, quando existir. */
export function youtubeIdDoConteudo(conteudo: CuidarConteudo): string | null {
  return conteudo.origem === "url" && conteudo.tipo === "video" && conteudo.url
    ? extractYoutubeId(conteudo.url)
    : null;
}

/** O conteúdo abre em modal (upload ou YouTube) ou em nova aba (link simples). */
export function abreEmModal(conteudo: CuidarConteudo): boolean {
  return conteudo.origem === "upload" || !!youtubeIdDoConteudo(conteudo);
}

export function podeBaixar(conteudo: CuidarConteudo): boolean {
  return (
    conteudo.origem === "upload" &&
    !!conteudo.storage_path &&
    conteudo.permite_download !== false
  );
}

/** Baixa o arquivo do material usando URL assinada temporária. */
export function useDownloadConteudo() {
  const [baixando, setBaixando] = useState(false);

  const baixar = async (conteudo: CuidarConteudo) => {
    if (!conteudo.storage_path) return;
    setBaixando(true);
    try {
      const url = await getCuidarSignedUrl(conteudo.storage_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = conteudo.storage_path.split("/").pop() ?? conteudo.titulo;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Não foi possível baixar o material.");
    } finally {
      setBaixando(false);
    }
  };

  return { baixar, baixando };
}
