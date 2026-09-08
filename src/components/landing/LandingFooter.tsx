import { Link } from "react-router-dom";
import { Linkedin, Instagram } from "lucide-react";
import {
  LANDING_CNPJ,
  LANDING_INSTAGRAM,
  LANDING_LINKEDIN,
  LANDING_SUPPORT_EMAIL,
} from "@/lib/landing";

export function LandingFooter() {
  return (
    <footer className="landing-navy font-brand">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logos/Logo_NR1_Transparente.png"
                alt="NR-1 Pronto"
                className="h-[30px] w-[30px] object-contain"
                loading="lazy"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold text-brand-red">NR-1 Pronto</span>
                <span className="text-xs text-white/50">powered by NR1-Pronto</span>
              </span>
            </div>

            <p className="mt-3 max-w-xs text-sm text-white/60">
              Gestão de RH, SST e conformidade NR-1 com riscos psicossociais mapeados.
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/termos" className="text-white/60 transition-colors hover:text-white">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="text-white/60 transition-colors hover:text-white">
              Política de Privacidade
            </Link>
            <a
              href={`mailto:${LANDING_SUPPORT_EMAIL}`}
              className="text-white/60 transition-colors hover:text-white"
            >
              {LANDING_SUPPORT_EMAIL}
            </a>
          </nav>

          <div className="flex gap-3">
            <a
              href={LANDING_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn da NR1-Pronto"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/70 transition-colors hover:border-brand-red hover:text-white"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={LANDING_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da NR1-Pronto"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/70 transition-colors hover:border-brand-red hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © 2026 NR1-Pronto Consultoria de R&amp;S Ltda. CNPJ: {LANDING_CNPJ}
        </p>
      </div>
    </footer>
  );
}
