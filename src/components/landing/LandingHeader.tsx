import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scrollToContact } from "@/lib/landing";

const navLinks = [
  { href: "#ecossistema", label: "Plataforma" },
  { href: "#pgr-inteligente", label: "PGR Inteligente" },
  { href: "#diagnostico", label: "Diagnóstico" },
  { href: "#insights", label: "Insights" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 font-brand transition-all duration-500",
        scrolled
          ? "border-b border-white/10 bg-[#0B132B]/80 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          : "border-b border-transparent bg-[#0B132B]"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/logos/nr-1comprova-logo-main.png?v=2"
            alt="NR-1Comprova"
            className="h-8 w-8 shrink-0 object-contain transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-110 md:h-10 md:w-10"
            loading="eager"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-extrabold uppercase tracking-wide sm:text-sm">
              <span className="text-gray-300">NR-1</span>
              <span className="text-gray-300 underline underline-offset-2">Com</span>
              <span className="text-[#E30613]">prova</span>
            </span>
            <span className="text-[10px] font-normal text-white/50 sm:text-xs">
              powered by Talent Group
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/65 transition-all hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button
            id="header-cta-demo"
            size="sm"
            onClick={scrollToContact}
            className="lp-btn-glow group rounded-full border-0 px-4 font-bold hover:opacity-100"
          >
            Solicitar Demonstração
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
