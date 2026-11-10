import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hexToHslString, getForegroundHslFromHex } from "./lib/colorUtils";

// Script síncrono defensivo de Anti-Flicker (Anti-FOUC)
try {
  let currentUserId: string | null = null;
  // Abordagem Aprovada: Decodificar a chave determinística (sem iterar)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const authKey = `sb-${projectRef}-auth-token`;
    const tokenStr = localStorage.getItem(authKey);
    if (tokenStr) {
      const tokenData = JSON.parse(tokenStr);
      // O JWT decodificado (ou cacheado do Supabase) possui a identificação determinística
      currentUserId = tokenData?.user?.id || null;
    }
  }

  if (currentUserId) {
    const cacheKey = `nr1_branding_${currentUserId}`;
    const cachedColor = localStorage.getItem(cacheKey);
    // Regex rigorosa para validar cor em Hexadecimal (bloqueia CSS injection)
    if (cachedColor && /^#([0-9A-F]{3}){1,2}$/i.test(cachedColor)) {
      const hslColor = hexToHslString(cachedColor);
      const hslForeground = getForegroundHslFromHex(cachedColor);
      
      // Injeção de TODOS os tokens do app shell neutralizados anteriormente
      document.documentElement.style.setProperty('--primary', hslColor);
      document.documentElement.style.setProperty('--primary-foreground', hslForeground);
      document.documentElement.style.setProperty('--ring', hslColor);
      document.documentElement.style.setProperty('--sidebar-primary', hslColor);
      document.documentElement.style.setProperty('--focus-ring', hslColor);
      document.documentElement.style.setProperty('--sidebar-ring', hslColor);
      document.documentElement.style.setProperty('--accent', hslColor);
      document.documentElement.style.setProperty('--sidebar-active-text', hslColor);
    }
  }
} catch (error) {
  console.warn("Falha no boot script de cache de branding:", error);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
