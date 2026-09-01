import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { RiskMatrixSection } from "@/components/landing/RiskMatrixSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { MethodologiesSection } from "@/components/landing/MethodologiesSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { InsightsSection } from "@/components/landing/InsightsSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Landing = () => (
  <div className="min-h-screen bg-background font-brand">
    <LandingHeader />
    <main>
      <HeroSection />
      <PainSection />
      <RiskMatrixSection />
      <FeaturesSection />
      <MethodologiesSection />
      <StepsSection />
      <TestimonialsSection />
      <FaqSection />
      <ContactSection />
      <InsightsSection />
    </main>
    <LandingFooter />
  </div>
);

export default Landing;
