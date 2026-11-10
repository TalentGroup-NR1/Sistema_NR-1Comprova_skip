import { Heart, CheckCircle2, ArrowRight } from "lucide-react";
import { useMyPulseStatus } from "@/hooks/usePulseSurvey";
import { Link } from "react-router-dom";

export function PulsoSemanaCard() {
  const { data: status, isLoading } = useMyPulseStatus();
  const hasResponded = !!status?.hasResponded;

  return (
    <div
      className="rounded-xl border border-[#F1F0ED] bg-white p-5 transition-all duration-300 hover:border-[#D97706] animate-fade-in"
      style={{ animationDelay: "0.1s", animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-[#1E293B]">
          Pulso da Semana
        </h3>
        <Heart className="h-4 w-4 text-[#94A3B8]" />
      </div>

      {isLoading ? (
        <div className="h-10 bg-[#F8F6F3] rounded animate-pulse" />
      ) : hasResponded ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            <span className="text-sm font-semibold text-[#1E293B]">
              Resposta enviada!
            </span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Obrigado por compartilhar como você está
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] text-[#64748B] mb-2">
            Como você está se sentindo esta semana?
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#D97706] hover:text-[#F59E0B] hover:underline transition-colors"
          >
            Responder agora <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </div>
  );
}
