import { Shield, ArrowRight } from "lucide-react";
import { useMyQuestionariosPendentes } from "@/hooks/useCuidarMaisQuestionarios";
import { Link } from "react-router-dom";

export function QuestionariosNR1Card() {
  const { data: questionarios, isLoading } = useMyQuestionariosPendentes();
  const pending = questionarios?.length || 0;

  return (
    <div
      className="rounded-xl border border-[#F1F0ED] bg-white p-5 transition-all duration-300 hover:border-[#D97706] animate-fade-in"
      style={{ animationDelay: "0.2s", animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-[#1E293B]">
          Questionários NR1
        </h3>
        <Shield className="h-4 w-4 text-[#94A3B8]" />
      </div>

      {isLoading ? (
        <div className="h-10 bg-[#F8F6F3] rounded animate-pulse" />
      ) : pending === 0 ? (
        <>
          <span className="inline-flex items-center rounded-md bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#059669] mb-2">
            Tudo em dia!
          </span>
          <p className="text-[13px] text-[#64748B]">
            Nenhum questionário pendente
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#1E293B] mb-1">
            {pending} questionário{pending > 1 ? "s" : ""} pendente
            {pending > 1 ? "s" : ""}
          </p>
          <Link
            to="/mapa-riscos-nr1"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#D97706] hover:text-[#F59E0B] hover:underline transition-colors"
          >
            Responder agora <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </div>
  );
}
