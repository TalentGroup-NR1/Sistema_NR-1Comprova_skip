import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { scrollToContact } from "@/lib/landing";

const navLinks = [
  { href: "#diagnostico", label: "Diagnóstico" },
  { href: "#metodologias", label: "Metodologias" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#insights", label: "Insights" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-blue/40 bg-brand-navy/95 font-brand backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logos/Logo_NR1_Transparente.png"
            alt="NR-1 Pronto"
            className="h-8 w-8 shrink-0 object-contain md:h-10 md:w-10"
            loading="eager"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-extrabold text-brand-red sm:text-sm">NR-1 Pronto</span>
            <span className="text-[10px] font-normal text-white/50 sm:text-xs">
              powered by NR1-Pronto
            </span>
          </span>
        </Link>


        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button
            size="sm"
            onClick={scrollToContact}
            className="bg-brand-red text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-brand-red/90"
          >
            Solicitar Demonstração
          </Button>
        </div>
      </div>
    </header>
  );
}
