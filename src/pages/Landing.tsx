import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { MetricsSection } from "@/components/landing/MetricsSection";
import { PgrKanbanSection } from "@/components/landing/PgrKanbanSection";
import { EcosystemSection } from "@/components/landing/EcosystemSection";
import { RiskMatrixSection } from "@/components/landing/RiskMatrixSection";
import { InsightsSection } from "@/components/landing/InsightsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Landing = () => (
  <div className="min-h-screen bg-[#0B132B] font-brand">
    <LandingHeader />
    <main>
      {/* 1. Hero enterprise */}
      <HeroSection />
      {/* 2. Prova social & métricas */}
      <MetricsSection />
      {/* 3. Módulo estrela: Upload Inteligente do PGR + Kanban */}
      <PgrKanbanSection />
      {/* 5. Pilares do ecossistema (Bento Grid) */}
      <EcosystemSection />
      {/* 6. Simulador de risco — preservado */}
      <RiskMatrixSection />
      {/* 7. Insights — preservado */}
      <InsightsSection />
      {/* 8. CTA final */}
      <ContactSection />
    </main>
    <LandingFooter />
  </div>
);

export default Landing;
