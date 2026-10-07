import { Link } from "react-router-dom";
import { Linkedin, Instagram, ShieldCheck, Activity, Lock } from "lucide-react";
import {
  LANDING_CNPJ,
  LANDING_INSTAGRAM,
  LANDING_LINKEDIN,
  LANDING_SUPPORT_EMAIL,
} from "@/lib/landing";

const SEALS = [
  { icon: ShieldCheck, title: "Conforme NR-01", sub: "MTE" },
  { icon: Activity, title: "Adequado à NR-17", sub: "Ergonomia" },
  { icon: Lock, title: "Proteção de Dados", sub: "LGPD" },
];

export function LandingFooter() {
  return (
    <footer className="lp-dark relative border-t border-white/10 font-brand">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-12 grid gap-3 sm:grid-cols-3">
          {SEALS.map((s) => (
            <div
              key={s.title}
              className="lp-glass flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors hover:border-[#00E676]/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E676]/20 to-[#00E5FF]/20 text-[#00E676] ring-1 ring-[#00E676]/30">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-white">{s.title}</span>
                <span className="block text-xs text-white/50">{s.sub}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logos/nr-1comprova-logo-main.png?v=2"
                alt="NR-1Comprova"
                className="h-[30px] w-[30px] object-contain"
                loading="lazy"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold uppercase tracking-wide">
                  <span className="text-gray-300">NR-1</span>
                  <span className="text-gray-300 underline underline-offset-2">Com</span>
                  <span className="text-[#E30613]">prova</span>
                </span>
                <span className="text-xs text-white/50">powered by Talent Group</span>
              </span>
            </div>

            <p className="mt-3 max-w-xs text-sm text-white/60">
              Ecossistema unificado de gestão de pessoas, clima, treinamento e conformidade
              ocupacional.
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
              aria-label="LinkedIn da NR-1Comprova"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/70 transition-colors hover:border-brand-red hover:text-white"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={LANDING_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da NR-1Comprova"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/70 transition-colors hover:border-brand-red hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © 2026 NR-1Comprova Consultoria de R&amp;S Ltda. CNPJ: {LANDING_CNPJ}
        </p>
      </div>
    </footer>
  );
}
