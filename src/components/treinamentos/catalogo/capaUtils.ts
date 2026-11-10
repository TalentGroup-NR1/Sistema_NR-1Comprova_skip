import { useEffect, useState } from "react";
import { getSignedUrlTreinamento } from "@/hooks/useTreinamentoStorage";
import type { Treinamento } from "@/hooks/useTreinamentos";

/** Extrai o ID de um vídeo do YouTube a partir de uma URL. */
export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/** Gradientes de fallback determinísticos por id. */
const GRADIENTS = [
  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.55) 100%)",
  "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--primary) / 0.7) 100%)",
  "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--primary) / 0.6) 100%)",
  "linear-gradient(135deg, hsl(var(--primary) / 0.85) 0%, hsl(var(--muted)) 100%)",
];

export function getFallbackGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % 997;
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * Resolve a imagem de capa do treinamento:
 * 1) capa enviada pelo admin (storage) 2) thumbnail do YouTube 3) null (gradiente)
 */
export function useCapaTreinamento(treinamento: Pick<Treinamento, "id" | "capa_path" | "url_conteudo" | "tipo">) {
  const [url, setUrl] = useState<string | null>(null);

  const capaPath = treinamento.capa_path;
  const youtubeId = getYoutubeId(treinamento.url_conteudo);

  useEffect(() => {
    let active = true;

    if (capaPath) {
      getSignedUrlTreinamento(capaPath).then((signed) => {
        if (active) setUrl(signed);
      });
      return () => {
        active = false;
      };
    }

    setUrl(youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);
    return () => {
      active = false;
    };
  }, [capaPath, youtubeId]);

  return url;
}
