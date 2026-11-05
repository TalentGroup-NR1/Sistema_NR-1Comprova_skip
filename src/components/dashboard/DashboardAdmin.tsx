import { StatsCard } from "@/components/dashboard/StatsCard";
import { DiariosBordoHojeAlert } from "@/components/dashboard/DiariosBordoHojeAlert";
import { AniversariosHojeAlert } from "@/components/dashboard/AniversariosHojeAlert";
import { RecentEmployees } from "@/components/dashboard/RecentEmployees";
import { BirthdaysList } from "@/components/dashboard/BirthdaysList";
import { WorkAnniversaries } from "@/components/dashboard/WorkAnniversaries";
import { DiarioBordoReminders } from "@/components/dashboard/DiarioBordoReminders";
import { PromocoesRecentesCard } from "@/components/dashboard/PromocoesRecentesCard";
import { FuncionariosPorEmpresaCard } from "@/components/dashboard/FuncionariosPorEmpresaCard";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAniversariantesGlobais } from "@/hooks/useAniversariantesGlobais";
import { useIsModuleVisible } from "@/hooks/useVisibleModules";
import { AdminFichaAlertBanner } from "@/components/dashboard/AdminFichaAlertBanner";
import { SectionErrorBoundary } from "@/components/dashboard/SectionErrorBoundary";
import { Users, UserPlus, UserMinus } from "lucide-react";

const MES_NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DashboardAdmin() {

  const {
    totalAtivos,
    contratadosMes,
    demitidosMes,
    ytdContratados,
    ytdDemitidos,
    ultimaAdmissaoRef,
    ultimaDemissaoRef,
    aniversariantes,
    aniversariosEmpresa,
    diarioBordoReminders,
    recentes,
    funcionariosPorEmpresa,
    showCompanyBreakdown,
    isLoading,
  } = useDashboardMetrics();
  const { data: aniversariantesGlobais, isLoading: loadingAniv } = useAniversariantesGlobais();

  const fmtRef = (ref: { mes: number; ano: number; total: number } | null) =>
    ref ? `Último: ${MES_NOMES[ref.mes - 1]}/${ref.ano} (${ref.total})` : 'Sem registros anteriores';

  const subtitleContratados = isLoading
    ? undefined
    : contratadosMes > 0
      ? `Acumulado no ano: ${ytdContratados}`
      : `Nenhum este mês • ${fmtRef(ultimaAdmissaoRef)} • YTD: ${ytdContratados}`;

  const subtitleDemitidos = isLoading
    ? undefined
    : demitidosMes > 0
      ? `Acumulado no ano: ${ytdDemitidos}`
      : `Nenhum este mês • ${fmtRef(ultimaDemissaoRef)} • YTD: ${ytdDemitidos}`;

  const subtitleAtivos = isLoading
    ? undefined
    : `+${contratadosMes} admissões / −${demitidosMes} desligamentos no mês`;

  const { isVisible: verDiario } = useIsModuleVisible('/diario-bordo');
  const { isVisible: verColaboradores } = useIsModuleVisible('/colaboradores');

  return (
    <>
      <SectionErrorBoundary title="Alertas de Ficha">
        <AdminFichaAlertBanner />
      </SectionErrorBoundary>

      <SectionErrorBoundary title="Alertas Diários">
        {verDiario && <DiariosBordoHojeAlert />}
        <AniversariosHojeAlert
          aniversariantes={aniversariantes}
          aniversariosEmpresa={aniversariosEmpresa}
          isLoading={isLoading}
        />
      </SectionErrorBoundary>

      {/* Stats Grid */}
      <SectionErrorBoundary title="Métricas Principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          <StatsCard
            title="Total de Ativos"
            value={isLoading ? "..." : totalAtivos}
            icon={<Users className="h-6 w-6" />}
            variant="primary"
            delay={0}
          />
          <StatsCard
            title="Contratados do Mês"
            value={isLoading ? "..." : contratadosMes}
            icon={<UserPlus className="h-6 w-6" />}
            variant="success"
            delay={100}
          />
          <StatsCard
            title="Demitidos do Mês"
            value={isLoading ? "..." : demitidosMes}
            icon={<UserMinus className="h-6 w-6" />}
            variant="warning"
            delay={200}
          />
        </div>
      </SectionErrorBoundary>

      {/* Company Breakdown - Only for admin_master with a specific sandbox company selected */}
      {showCompanyBreakdown && (
        <SectionErrorBoundary title="Distribuição por Empresa">
          <div className="mb-6">
            <FuncionariosPorEmpresaCard
              empresas={funcionariosPorEmpresa}
              isLoading={isLoading}
              delay={350}
              className=""
            />
          </div>
        </SectionErrorBoundary>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {verColaboradores && (
            <SectionErrorBoundary title="Colaboradores Recentes">
              <RecentEmployees 
                colaboradores={recentes} 
                isLoading={isLoading} 
                delay={400}
              />
            </SectionErrorBoundary>
          )}
          {verDiario && (
            <SectionErrorBoundary title="Lembretes do Diário">
              <DiarioBordoReminders 
                cycles={diarioBordoReminders} 
                isLoading={isLoading}
                delay={500}
              />
            </SectionErrorBoundary>
          )}
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          <SectionErrorBoundary title="Promoções Recentes">
            <PromocoesRecentesCard delay={450} />
          </SectionErrorBoundary>
          <SectionErrorBoundary title="Aniversariantes">
            <BirthdaysList 
              aniversariantes={aniversariantesGlobais?.nascimentos ?? []} 
              isLoading={loadingAniv}
              delay={500}
            />
            <div className="mt-6">
              <WorkAnniversaries 
                aniversarios={aniversariantesGlobais?.empresa ?? []} 
                isLoading={loadingAniv}
                delay={600}
              />
            </div>
          </SectionErrorBoundary>
        </div>
      </div>
    </>
  );
}
