import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";
import { AlertTriangle } from "lucide-react";

export function CompanySuspendedBanner() {
  const companyId = useEffectiveCompanyId();
  const { data: status } = useCompanyStatus(companyId);

  if (status !== 'suspensa') {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-amber-500 text-amber-950 border-b border-amber-600/30 px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm z-40 transition-colors"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950" />
      <span>Serviços suspensos. Regularize o pagamento.</span>
    </div>
  );
}

