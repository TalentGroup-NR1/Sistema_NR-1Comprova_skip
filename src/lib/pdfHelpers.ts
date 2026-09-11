import QRCode from "qrcode";

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256HexFromBytes(bytes: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface LoadedImage {
  dataUrl: string;
  w: number;
  h: number;
}

export async function loadImage(url?: string | null): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    if (!dims.w || !dims.h) return null;
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function fetchHash(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return await sha256HexFromBytes(buf);
  } catch {
    return null;
  }
}

export function fitImage(img: LoadedImage, maxW: number, maxH: number) {
  const ratio = img.w / img.h;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

export async function generateVerificationQRCode(payload: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: 220,
      color: { dark: "#1F2937", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}
