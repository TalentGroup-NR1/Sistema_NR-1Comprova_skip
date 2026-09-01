import { supabase } from "@/integrations/supabase/client";
import { ImgHTMLAttributes, useEffect, useState } from "react";

const BUCKET = "comunicados_media";
const EXPIRES_IN = 60 * 60; // 1 hora

// Cache simples em memória durante a sessão para evitar resignar a mesma URL várias vezes.
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extrai o path interno do bucket a partir de uma URL completa ou retorna o próprio
 * valor quando ele já é um path relativo (ex.: "covers/abc.png").
 */
export function extractComunicadoMediaPath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // Já é um path relativo dentro do bucket.
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, "");
  }

  // URL pública/assinada anterior: /storage/v1/object/{public|sign}/comunicados_media/<path>
  const match = trimmed.match(/\/comunicados_media\/([^?]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Gera (ou reaproveita) uma signed URL para um arquivo do bucket de mídia de comunicados.
 * Aceita tanto um path quanto uma URL pública antiga salva no banco.
 */
export async function getSignedComunicadoMediaUrl(
  urlOrPath: string | null | undefined
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractComunicadoMediaPath(urlOrPath);
  if (!path) return null;

  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRES_IN);
  if (error || !data?.signedUrl) {
    return null;
  }

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: now + EXPIRES_IN * 1000,
  });
  return data.signedUrl;
}

/**
 * Hook React que resolve uma URL assinada a partir de um path ou URL pública salva.
 * Retorna `null` enquanto carrega ou se a fonte for inválida.
 */
export function useSignedComunicadoMediaUrl(
  urlOrPath: string | null | undefined
): string | null {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!urlOrPath) {
      setSigned(null);
      return;
    }
    getSignedComunicadoMediaUrl(urlOrPath).then((url) => {
      if (!cancelled) setSigned(url);
    });
    return () => {
      cancelled = true;
    };
  }, [urlOrPath]);

  return signed;
}

/**
 * `<img>` que resolve automaticamente a URL assinada do bucket comunicados_media.
 * Aceita tanto path interno quanto URL pública antiga; renderiza nada enquanto carrega.
 */
type SignedImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
};

export function SignedComunicadoImg({ src, ...rest }: SignedImgProps) {
  const signed = useSignedComunicadoMediaUrl(src);
  if (!signed) return null;
  return <img {...rest} src={signed} />;
}

