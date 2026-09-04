import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://cdn.gpteng.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // White-label: logomarcas de clientes vêm de URLs externas arbitrárias.
  // https: permite qualquer imagem HTTPS sem relaxar script-src/connect-src.
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nr1pronto.com.br https://www.nr1pronto.com.br",
  "media-src 'self' blob: https://*.supabase.co",
  "frame-src 'self' blob: https://*.supabase.co https://www.youtube.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:5173 http://localhost:8080 ws: wss:",
  "media-src 'self' blob: https://*.supabase.co",
  "frame-src 'self' blob: https://*.supabase.co https://www.youtube.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function cspPlugin(isProd: boolean): Plugin {
  const policy = isProd ? CSP_PROD : CSP_DEV;
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
  return {
    name: "inject-csp",
    transformIndexHtml(html) {
      return html.replace("<head>", `<head>\n    ${tag}`);
    },
  };
}

const SECURITY_META = [
  `<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), accelerometer=(), autoplay=(), encrypted-media=(), payment=(), usb=(), xr-spatial-tracking=()" />`,
  `<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />`,
  `<meta http-equiv="X-Content-Type-Options" content="nosniff" />`,
  `<meta http-equiv="X-Frame-Options" content="DENY" />`,
  `<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />`,
  `<meta http-equiv="Cross-Origin-Resource-Policy" content="same-origin" />`,
].join("\n    ");

function securityHeadersPlugin(): Plugin {
  return {
    name: "inject-security-meta",
    transformIndexHtml(html) {
      return html.replace("<head>", `<head>\n    ${SECURITY_META}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    cspPlugin(mode === "production"),
    securityHeadersPlugin(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Remove comentários e anotações que poderiam revelar nomes de libs/versões.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Nomes opacos baseados apenas em hash — sem 'vendor', 'react', etc.
        entryFileNames: "assets/[hash].js",
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      },
    },
  },
  esbuild: {
    legalComments: "none",
  },
}));
