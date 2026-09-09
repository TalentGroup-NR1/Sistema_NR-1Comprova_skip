import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { RegistroPonto } from "@/components/ponto/RegistroPonto";
import { HistoricoPonto } from "@/components/ponto/HistoricoPonto";
import { PontoConfiguracao } from "@/components/ponto/PontoConfiguracao";
import { EspelhoPonto } from "@/components/ponto/EspelhoPonto";
import { PontoDashboard } from "@/components/ponto/PontoDashboard";
import { PontoAprovacoes } from "@/components/ponto/PontoAprovacoes";
import { MeuBancoHoras } from "@/components/ponto/MeuBancoHoras";
import { MinhasHorasExtras } from "@/components/ponto/MinhasHorasExtras";
import { RankingBancoHoras } from "@/components/ponto/RankingBancoHoras";
import { FechamentoPonto } from "@/components/ponto/FechamentoPonto";
import { EspelhoMensalAdmin } from "@/components/ponto/EspelhoMensalAdmin";
import { MinhaAssinatura } from "@/components/ponto/MinhaAssinatura";
import { RelatoriosPonto } from "@/components/ponto/relatorios/RelatoriosPonto";
import { usePodeAcessarPonto } from "@/hooks/usePodeAcessarPonto";
import { useMeuRegimePonto } from "@/hooks/useMeuRegimePonto";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PontoEletronico() {
  const { role } = useAuth();
  const isAdmin = role && ["admin_master", "admin_empresa", "analista_rh"].includes(role);
  const { data: gateResult, isLoading: loadingGate } = usePodeAcessarPonto();
  const { isBancoHoras } = useMeuRegimePonto();
  const meuBancoLabel = isBancoHoras ? "Meu Banco" : "Minhas Horas Extras";
  const MeuBancoComponent = isBancoHoras ? MeuBancoHoras : MinhasHorasExtras;

  // Onda 6.13: permitir que componentes filhos solicitem mudança de aba
  // (ex.: modal de marcação faltante → "Ir para Ajuste agora").
  const [adminTab, setAdminTab] = useState("dashboard");
  const [colabTab, setColabTab] = useState("registro");
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string } | undefined;
      if (!detail?.tab) return;
      if (isAdmin) {
        // mapeia "historico" → "meu-ponto" (admin vê RegistroPonto + HistoricoPonto juntos)
        setAdminTab(detail.tab === "historico" ? "meu-ponto" : detail.tab);
      } else {
        setColabTab(detail.tab);
      }
    };
    window.addEventListener("ponto:goto-tab", handler as EventListener);
    return () => window.removeEventListener("ponto:goto-tab", handler as EventListener);
  }, [isAdmin]);

  // Onda 6.14: sincroniza aba com ?tab=... da URL (ex.: notificação de assinatura pendente).
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (!tab) return;
    if (isAdmin) {
      setAdminTab(tab === "historico" ? "meu-ponto" : tab);
    } else {
      setColabTab(tab);
    }
  }, [location.search, isAdmin]);

  if (loadingGate) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!gateResult?.podeAcessar) {
    const isRegimeNaoDefinido = gateResult?.regimeNaoDefinido;
    return (
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Ponto Eletrônico</h1>
          <Card className={isRegimeNaoDefinido ? "border-amber-200 bg-amber-50/30" : undefined}>
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <Lock className={`h-10 w-10 ${isRegimeNaoDefinido ? "text-amber-500" : "text-muted-foreground"}`} />
              <p className="text-base font-medium text-foreground">
                {isRegimeNaoDefinido
                  ? "Regime não definido — contate o administrador"
                  : "Seu vínculo não exige registro de ponto."}
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                {isRegimeNaoDefinido
                  ? "Seu cadastro de colaborador ainda não possui um regime de contratação (CLT, Estágio, etc.) definido. Solicite ao administrador ou RH da empresa a definição do seu regime de trabalho."
                  : "Este módulo é exclusivo para colaboradores com regime CLT, Estágio, Aprendiz ou Temporário."}
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const dataExtenso = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <MainLayout>
      <div className="bg-white">
        <div className="space-y-6">
          {/* Header - oculto para admin para ganhar espaço */}
          {!isAdmin && (
            <header className="pb-4 border-b border-[#F1F0ED]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#64748B]">
                <h1 className="font-display font-bold text-[28px] text-[#1E293B] leading-tight">
                  Ponto Eletrônico
                </h1>
                <span className="text-[#CBD5E1]">•</span>
                <span>Registre sua jornada de trabalho</span>
                <span className="text-[#CBD5E1]">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" strokeWidth={1.5} />
                  <span className="capitalize">{dataExtenso}</span>
                </span>
              </div>
            </header>
          )}

          {isAdmin ? (
            <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
              <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="espelho">Espelho de Ponto</TabsTrigger>
                <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
                <TabsTrigger value="ranking">Ranking Banco</TabsTrigger>
                <TabsTrigger value="fechamento">Fechamento Banco</TabsTrigger>
                <TabsTrigger value="espelho-mensal">Espelho Mensal</TabsTrigger>
                <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                <TabsTrigger value="configuracao">Configurações</TabsTrigger>
                <TabsTrigger value="meu-ponto">Meu Ponto</TabsTrigger>
                <TabsTrigger value="meu-banco">{meuBancoLabel}</TabsTrigger>
                <TabsTrigger value="minha-assinatura">Minha Assinatura</TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard"><PontoDashboard /></TabsContent>
              <TabsContent value="espelho"><EspelhoPonto /></TabsContent>
              <TabsContent value="aprovacoes"><PontoAprovacoes /></TabsContent>
              <TabsContent value="ranking"><RankingBancoHoras /></TabsContent>
              <TabsContent value="fechamento"><FechamentoPonto /></TabsContent>
              <TabsContent value="espelho-mensal"><EspelhoMensalAdmin /></TabsContent>
              <TabsContent value="relatorios"><RelatoriosPonto /></TabsContent>
              <TabsContent value="configuracao"><PontoConfiguracao /></TabsContent>
              <TabsContent value="meu-ponto">
                <div className="space-y-6">
                  <RegistroPonto />
                  <HistoricoPonto />
                </div>
              </TabsContent>
              <TabsContent value="meu-banco"><MeuBancoComponent /></TabsContent>
              <TabsContent value="minha-assinatura"><MinhaAssinatura /></TabsContent>
            </Tabs>
          ) : (
            <Tabs value={colabTab} onValueChange={setColabTab} className="w-full">
              <TabsList>
                <TabsTrigger value="registro">Registrar Ponto</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="meu-banco">{meuBancoLabel}</TabsTrigger>
                <TabsTrigger value="minha-assinatura">Minha Assinatura</TabsTrigger>
              </TabsList>
              <TabsContent value="registro"><RegistroPonto /></TabsContent>
              <TabsContent value="historico"><HistoricoPonto /></TabsContent>
              <TabsContent value="meu-banco"><MeuBancoComponent /></TabsContent>
              <TabsContent value="minha-assinatura"><MinhaAssinatura /></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
