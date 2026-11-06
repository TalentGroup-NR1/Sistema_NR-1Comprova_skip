import QRCode from 'qrcode';

export const LOGO_PLATAFORMA = '/logo.png';
export const NOME_PLATAFORMA = 'NR-1 Comprova';

export interface TreinamentoBrandingInput {
  company_id?: string | null;
  origem?: string | null;
}

export interface EmpresaBrandingInput {
  name?: string | null;
  logo_url?: string | null;
}

export interface CertificadoBrandingResult {
  tipo: 'plataforma' | 'empresa';
  logoUrl: string;
  nomeExibicao: string;
}

/**
 * Resolve logo e nome a serem exibidos no certificado de acordo com a origem do treinamento:
 * - company_id IS NULL ou origem === 'plataforma' -> logo e nome da NR-1 Comprova
 * - company_id NOT NULL e tem logo_url -> logo e nome da empresa
 * - company_id NOT NULL sem logo_url -> fallback completo da plataforma (logo E nome)
 */
export function resolverLogoCertificado(
  treinamento?: TreinamentoBrandingInput | null,
  empresa?: EmpresaBrandingInput | null
): CertificadoBrandingResult {
  const isGlobal = !treinamento?.company_id || treinamento?.origem === 'plataforma';

  if (isGlobal) {
    return {
      tipo: 'plataforma',
      logoUrl: LOGO_PLATAFORMA,
      nomeExibicao: NOME_PLATAFORMA,
    };
  }

  // Treinamento de empresa (company_id preenchido e origem != 'plataforma')
  if (!empresa?.logo_url) {
    return {
      tipo: 'plataforma',
      logoUrl: LOGO_PLATAFORMA,
      nomeExibicao: NOME_PLATAFORMA,
    };
  }

  return {
    tipo: 'empresa',
    logoUrl: empresa.logo_url,
    nomeExibicao: empresa.name || NOME_PLATAFORMA,
  };
}

/**
 * Converte imagem do logo em base64 com fetch + FileReader para evitar Canvas Tainted no html2canvas.
 * Caso falhe (rede, CORS ou timeout), faz fallback seguro para o logo local da plataforma.
 */
export async function carregarLogoBase64(url?: string | null): Promise<string> {
  const fallback = LOGO_PLATAFORMA;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    let fetchUrl = trimmed;
    if (trimmed.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      fetchUrl = `${window.location.origin}${trimmed}`;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const res = await fetch(fetchUrl, {
      signal: controller?.signal,
      mode: 'cors',
      credentials: 'omit',
    });
    if (timer) clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('FileReader não retornou string base64'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Erro ao converter blob para base64'));
      reader.readAsDataURL(blob);
    });
  } catch (err: any) {
    // Log seguro (sem PII) conforme LGPD
    console.warn('[CertificateGenerator] Falha ao carregar logo remoto como base64, usando fallback seguro:', {
      step: 'carregar_logo_base64',
      message: err?.message || 'Falha de rede/CORS',
    });
    return fallback;
  }
}

/**
 * Parse seguro de timestamp ISO ou formato do Postgres (ex: "2026-11-06 16:18:57.574+00"),
 * evitando erro de Invalid Date e prevenindo o deslocamento de 1 dia para trás em timezones negativos (UTC-3).
 */
export function parseDataIsoSegura(val: string | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string') {
    let s = val.trim();
    if (!s) return new Date();

    // Se a data for apenas YYYY-MM-DD ou contiver meia-noite UTC (00:00:00),
    // ancorar ao meio-dia de Brasília (-03:00) para evitar que UTC-3 faça retroceder 1 dia
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) || s.includes('T00:00:00') || s.includes(' 00:00:00')) {
      const [datePart] = s.split(/[T ]/);
      s = `${datePart}T12:00:00-03:00`;
    } else {
      // Normaliza formato retornado pelo Postgres (espaço -> 'T' e offset '+00' -> '+00:00')
      s = s.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Determina a data canônica de conclusão conforme a ordem estrita:
 * 1) existingCertificate.data_conclusao (fonte canônica congelada)
 * 2) progresso.concluido_em (primeira emissão)
 * 3) new Date().toISOString() (último recurso)
 */
export function extrairDataConclusaoCanonica(
  existingCertificate?: { data_conclusao?: string | null } | null,
  progresso?: { concluido_em?: string | null } | null
): string {
  if (existingCertificate?.data_conclusao) {
    return existingCertificate.data_conclusao;
  }
  if (progresso?.concluido_em) {
    return progresso.concluido_em;
  }
  return new Date().toISOString();
}

/**
 * Formata data de conclusão por extenso em pt-BR com timezone explícito America/Sao_Paulo.
 * Exemplo: "06 de novembro de 2026"
 */
export function formatarDataConclusao(dataIso: string | Date | null | undefined): string {
  const dateObj = parseDataIsoSegura(dataIso);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Formata data de emissão curta em pt-BR com timezone explícito America/Sao_Paulo.
 * Exemplo: "06/11/2026"
 */
export function formatarDataEmissaoCurta(dataIso: string | Date | null | undefined): string {
  const dateObj = parseDataIsoSegura(dataIso);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Gera Data URL PNG em base64 a partir de uma URL ou texto para uso direto no template de impressão.
 * Usa correção 'M', margem 1 e fundo branco puro, ideal para html2canvas e impressão sem artefatos.
 */
export async function gerarQrCodeDataUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '';
  }

  try {
    return await QRCode.toDataURL(url.trim(), {
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err: any) {
    console.warn('[CertificateGenerator] Falha ao gerar QR Code como PNG base64:', {
      step: 'gerar_qr_code',
      message: err?.message || 'Erro no qrcode.toDataURL',
    });
    return '';
  }
}
