import { type MouseEvent } from "react";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import logoNr1Comprova from "@/assets/logo-nr-1comprova.png";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";
import { scrollToContact, scrollToMatriz } from "@/lib/landing";

export function HeroSection() {
  return (
    <section className="lp-dark lp-aurora lp-grid relative overflow-hidden font-brand">
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 lg:pb-32 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* Bloco de Texto (Esquerda) */}
          <div className="max-w-2xl text-left">
            <Reveal>
              <span className="lp-beam inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold tracking-wide sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#F5D27A]" />
                <span className="lp-gold-text">
                  O Ecossistema Unificado de Inteligência em Pessoas, Clima e Saúde Ocupacional
                </span>
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-7 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                A ponte perfeita entre a escuta ativa, o cuidado com as pessoas e a{" "}
                <span className="lp-gradient-text">conformidade legal</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 text-base leading-relaxed text-white/60 sm:text-lg">
                A plataforma que aproxima o trabalho real da gestão preventiva, capacitando sua empresa para cumprir a legislação na prática.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-10 flex flex-col items-start justify-start gap-3 sm:flex-row">
                <Button
                  id="hero-cta-demo"
                  size="lg"
                  onClick={scrollToContact}
                  className="lp-btn-glow group h-12 rounded-full border-0 px-7 text-[15px] font-bold hover:opacity-100 w-full sm:w-auto"
                >
                  Solicitar Demonstração Executiva
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  id="hero-cta-simulador"
                  size="lg"
                  variant="outline"
                  onClick={scrollToMatriz}
                  className="lp-glass h-12 rounded-full px-7 text-[15px] font-semibold text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
                >
                  Simular Diagnóstico
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Bloco Visual (Direita) */}
          <Reveal delay={320} className="relative flex items-center justify-center lg:justify-end mt-10 lg:mt-0">
            <div className="relative flex h-72 w-72 lg:h-[450px] lg:w-[450px] items-center justify-center [perspective:1000px]">
              {/* Glow background behind logo */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00E676]/20 to-[#00E5FF]/20 blur-[100px]" />
              
              <img 
                src={logoNr1Comprova} 
                alt="NR-1Comprova" 
                className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_50px_rgba(0,229,255,0.3)]"
                style={{ animation: "spin3d 15s linear infinite" }}
              />
              <style>{`
                @keyframes spin3d {
                  0% { transform: rotateY(0deg) scale(1); }
                  50% { transform: rotateY(180deg) scale(1.05); }
                  100% { transform: rotateY(360deg) scale(1); }
                }
              `}</style>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
