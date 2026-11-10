export function hexToHslString(hex: string): string {
  if (!hex) return "0 0% 0%";
  
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  // Fallback to black if invalid hex
  if (hex.length !== 6 || isNaN(parseInt(hex, 16))) {
    return "0 0% 0%";
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

export function getForegroundHslFromHex(hex: string): string {
  if (!hex) return "0 0% 100%";
  
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  if (hex.length !== 6 || isNaN(parseInt(hex, 16))) {
    return "0 0% 100%";
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.5) {
    // Background is light, use black text
    return "0 0% 0%";
  } else {
    // Background is dark, use white text
    return "0 0% 100%";
  }
}

export function adjustHslLightness(hsl: string, amount: number): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return hsl;
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2], 10);
  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
}

/**
 * Aplica todas as variáveis CSS derivadas da cor primária da marca no elemento raiz :root.
 * Unifica a aplicação em um único ponto com suporte a reatividade multiempresa e login.
 */
export function applyThemeToRoot(primaryHex?: string | null): void {
  if (typeof document === 'undefined') return;

  const validHex = primaryHex && /^#([0-9A-Fa-f]{3}){1,2}$/.test(primaryHex)
    ? primaryHex
    : '#C8102E';

  const primaryHSL = hexToHslString(validHex);
  const foregroundHSL = getForegroundHslFromHex(validHex);
  const root = document.documentElement;

  // Cores primárias
  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--primary-hover', adjustHslLightness(primaryHSL, -6));
  root.style.setProperty('--primary-pressed', adjustHslLightness(primaryHSL, -10));
  root.style.setProperty('--primary-muted', adjustHslLightness(primaryHSL, 45));
  root.style.setProperty('--primary-foreground', foregroundHSL);

  // Foco e anéis
  root.style.setProperty('--ring', primaryHSL);
  root.style.setProperty('--focus-ring', primaryHSL);

  // Cores da Sidebar
  root.style.setProperty('--sidebar-primary', primaryHSL);
  root.style.setProperty('--sidebar-ring', primaryHSL);
  root.style.setProperty('--sidebar-active', adjustHslLightness(primaryHSL, 48));
  root.style.setProperty('--sidebar-active-text', adjustHslLightness(primaryHSL, -6));

  // Accent & Info
  root.style.setProperty('--accent', primaryHSL);
  root.style.setProperty('--info', primaryHSL);

  // Gradiente
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${adjustHslLightness(primaryHSL, -8)}) 100%)`
  );
}
