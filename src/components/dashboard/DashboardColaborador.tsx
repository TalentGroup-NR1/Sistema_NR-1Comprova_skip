import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BirthdaysList } from "@/components/dashboard/BirthdaysList";
import { WorkAnniversaries } from "@/components/dashboard/WorkAnniversaries";
import { MeusDiariosPendentes } from "@/components/dashboard/MeusDiariosPendentes";
import { MinhasAvaliacoesPendentes } from "@/components/dashboard/MinhasAvaliacoesPendentes";
import { BeneficiosDestaque } from "@/components/beneficios/catalogo";
import { useAniversariantesGlobais } from "@/hooks/useAniversariantesGlobais";
import { useMyColaborador } from "@/hooks/useMyFeedbackCycles";
import { PartyPopper, ArrowRight, Coffee, Leaf, Megaphone } from "lucide-react";

import { BirthdayGreetingModal } from "@/components/dashboard/BirthdayGreetingModal";
import { useCompanies } from "@/hooks/useCompanies";
import { parseISODate } from "@/lib/validators/colaborador";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RegistroPonto } from "@/components/ponto/RegistroPonto";
import { usePodeAcessarPonto } from "@/hooks/usePodeAcessarPonto";
import { MinhasPendenciasCard } from "@/components/dashboard/MinhasPendenciasCard";
import { CuidarMaisQuickCard } from "@/components/dashboard/CuidarMaisQuickCard";
import { UltimoComunicadoCard } from "@/components/dashboard/UltimoComunicadoCard";
import { CampanhasAtivasCarousel } from "@/components/dashboard/CampanhasAtivasCarousel";
import { ProximasFeriasCard } from "@/components/dashboard/ProximasFeriasCard";
import { differenceInYears } from "date-fns";

/** Saudação humanizada conforme horário do dia. */
function useSaudacao() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Cabeçalho de boas-vindas — humano e leve. */
function GreetingHeader() {
  const { data: colaborador } = useMyColaborador();
  const saudacao = useSaudacao();
  const firstName = colaborador?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-1">
      <h1 className="font-display text-[26px] md:text-[28px] font-bold leading-tight text-[#0F172A]">
        {saudacao}
        {firstName ? `, ${firstName}` : ""}.{" "}
        <span className="font-semibold text-foreground/90">
          Que bom ver você por aqui! <span aria-hidden>👋</span>
        </span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Confira seu panorama de hoje e o que importa para você.
      </p>
    </div>
  );
}

/** Wrapper visual do card de Meu Ponto — apenas apresentação. Lógica intacta no RegistroPonto. */
function MeuPontoCard() {
  return (
    <Card className="h-full border-border shadow-sm overflow-hidden">
      <CardContent className="p-5 md:p-6 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="font-display text-[20px] font-semibold text-foreground leading-tight">
              Meu Ponto
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tudo certinho com os seus registros de hoje.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50">
            <Link to="/ponto-eletronico">
              Ver histórico
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative flex-1">
          {/* Ilustração decorativa — café + planta */}
          <div className="pointer-events-none absolute top-1 right-1 hidden md:flex items-center gap-2 opacity-60">
            <Coffee className="h-9 w-9 text-[#C5A572]" strokeWidth={1.25} />
            <Leaf className="h-7 w-7 text-emerald-600/70" strokeWidth={1.25} />
          </div>
          <div className="[&>div]:!space-y-3 [&>div>div]:!border-0 [&>div>div]:!p-0">
            <RegistroPonto compact />
          </div>
        </div>

        <p className="mt-3 text-[11px] italic text-muted-foreground text-center">
          Lembre-se de respirar fundo e tomar um café. ☕
        </p>
      </CardContent>
    </Card>
  );
}

/** Wrapper visual do bloco de Campanhas — mantém o componente original. */
function CampanhasSection() {
  return (
    <Card className="h-full border-border shadow-sm">
      <CardContent className="p-5 md:p-6 h-full flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-[18px] font-semibold text-foreground leading-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Campanhas Ativas
          </h2>
          <Button asChild size="sm" variant="ghost" className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50">
            <Link to="/comunicados">
              Ver todas as campanhas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex-1 [&>*]:h-full">
          <CampanhasAtivasCarousel />
        </div>
      </CardContent>
    </Card>
  );
}

/** Faixa celebrativa de aniversário de empresa, exibida apenas no dia. */
function AniversarioEmpresaBanner() {
  const { data: colaborador } = useMyColaborador();

  const anosCompletos = useMemo(() => {
    if (!colaborador?.admission_date) return null;
    const today = new Date();
    const ad = parseISODate(colaborador.admission_date);
    const isAniversarioHoje =
      ad.getDate() === today.getDate() && ad.getMonth() === today.getMonth();
    if (!isAniversarioHoje) return null;
    const anos = differenceInYears(today, ad);
    return anos >= 1 ? anos : null;
  }, [colaborador?.admission_date]);

  if (!anosCompletos) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="flex items-center gap-4 py-5">
        <div className="rounded-full bg-primary/15 p-3">
          <PartyPopper className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Hoje você completa {anosCompletos} {anosCompletos === 1 ? "ano" : "anos"} de Talent —
            a gente celebra com você!
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Obrigado por caminhar com a gente. Que venham muitos outros!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardColaborador() {
  const { data: aniversariantesGlobais, isLoading } = useAniversariantesGlobais();
  const { data: colaborador } = useMyColaborador();
  const { data: companies } = useCompanies();
  const { data: podeAcessarPonto } = usePodeAcessarPonto();
  const [greetingOpen, setGreetingOpen] = useState(false);
  const [greetingState, setGreetingState] = useState({
    isBirthday: false,
    isWorkAnniversary: false,
    yearsAtCompany: 0,
    year: new Date().getFullYear(),
    type: "birthday" as "birthday" | "work_anniversary",
    eventDate: null as Date | null,
  });


  const company = companies?.find((c) => c.id === colaborador?.company_id);

  useEffect(() => {
    if (!colaborador?.id) return;

    let cancelled = false;

    const run = async () => {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();
      const todayYear = today.getFullYear();

      let pendingType: "birthday" | "work_anniversary" | null = null;
      let yearsAtCompany = 0;
      let eventDate: Date | null = null;
      const occurrenceYear = todayYear;

      if (colaborador.birth_date) {
        const bd = parseISODate(colaborador.birth_date);
        const occurrence = new Date(todayYear, bd.getMonth(), bd.getDate());
        if (occurrence.getTime() <= new Date(todayYear, todayMonth, todayDay).getTime()) {
          pendingType = "birthday";
          eventDate = occurrence;
        }
      }

      if (!pendingType && colaborador.admission_date) {
        const ad = parseISODate(colaborador.admission_date);
        const occurrence = new Date(todayYear, ad.getMonth(), ad.getDate());
        if (occurrence.getTime() <= new Date(todayYear, todayMonth, todayDay).getTime()) {
          const years = todayYear - ad.getFullYear();
          if (years >= 1) {
            pendingType = "work_anniversary";
            yearsAtCompany = years;
            eventDate = occurrence;
          }
        }
      }

      if (!pendingType) return;

      const { data: ack } = await supabase
        .from("birthday_greeting_acknowledgments")
        .select("id")
        .eq("year", occurrenceYear)
        .eq("greeting_type", pendingType)
        .maybeSingle();

      if (cancelled || ack) return;

      setGreetingState({
        isBirthday: pendingType === "birthday",
        isWorkAnniversary: pendingType === "work_anniversary",
        yearsAtCompany,
        year: occurrenceYear,
        type: pendingType,
        eventDate,
      });
      setGreetingOpen(true);
    };


    run();
    return () => {
      cancelled = true;
    };
  }, [colaborador?.id, colaborador?.birth_date, colaborador?.admission_date]);

  const handleGreetingAck = async (open: boolean) => {
    if (!open && greetingOpen && colaborador?.id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("birthday_greeting_acknowledgments").insert({
          user_id: user.id,
          year: greetingState.year,
          greeting_type: greetingState.type,
        });
      }
    }
    setGreetingOpen(open);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <BirthdayGreetingModal
        open={greetingOpen}
        onOpenChange={handleGreetingAck}
        colaboradorName={colaborador?.full_name || ""}
        isBirthday={greetingState.isBirthday}
        isWorkAnniversary={greetingState.isWorkAnniversary}
        yearsAtCompany={greetingState.yearsAtCompany}
        companyName="TALENT GROUP"
        companyLogo={company?.logo_url}
        eventDate={greetingState.eventDate}
      />


      {/* Saudação humanizada */}
      <GreetingHeader />

      {/* Aniversário de empresa (apenas no dia) */}
      <AniversarioEmpresaBanner />

      {/* Benefícios em destaque */}
      <BeneficiosDestaque />

      {/* Área nobre: Meu Ponto (esq) + Campanhas Ativas (dir) — 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {podeAcessarPonto ? <MeuPontoCard /> : <ProximasFeriasCard />}
        <CampanhasSection />
      </div>

      {/* Seção de Comunicados Oficiais — largura total */}
      <UltimoComunicadoCard />

      {/* Linha de apoio: Férias · Pendências · Cuidar+ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {podeAcessarPonto && <ProximasFeriasCard />}
        <MinhasPendenciasCard />
        <CuidarMaisQuickCard />
      </div>

      {/* Conteúdos secundários — mantidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="h-full [&>*]:h-full">
          <MinhasAvaliacoesPendentes />
        </div>
        <div className="h-full [&>*]:h-full">
          <MeusDiariosPendentes />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BirthdaysList
          aniversariantes={aniversariantesGlobais?.nascimentos ?? []}
          isLoading={isLoading}
          delay={100}
        />
        <WorkAnniversaries
          aniversarios={aniversariantesGlobais?.empresa ?? []}
          isLoading={isLoading}
          delay={200}
        />
      </div>
    </div>
  );
}
