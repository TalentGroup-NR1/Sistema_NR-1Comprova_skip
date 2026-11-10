import { Component, ReactNode, useState, useEffect, useMemo } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCompanyTheme } from "@/hooks/useCompanyTheme";
import { useTaskReminderWatcher } from "@/hooks/useTaskReminderWatcher";
import { GlobalBlockerModal } from "@/components/comunicados/GlobalBlockerModal";
import { PulseBlockerModal } from "@/components/cuidar-mais/pulso/PulseBlockerModal";
import { PontoAssinaturaBlockerModal } from "@/components/ponto/PontoAssinaturaBlockerModal";
import { useBranding } from "@/hooks/useBranding";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";
import { TermsReacceptanceModal } from "@/components/auth/TermsReacceptanceModal";
import { GestorAlertBanner } from "./GestorAlertBanner";
import { CompanySuspendedBanner } from "./CompanySuspendedBanner";



interface MainLayoutProps {
  children: ReactNode;
}

class LayoutModalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[LayoutModalErrorBoundary] erro em modal global:", error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function MainLayout({ children }: MainLayoutProps) {
  useCompanyTheme();
  useTaskReminderWatcher();
  const branding = useBranding();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Verifica de forma determinística e síncrona se existe cache para o usuário atual
  const hasCache = useMemo(() => {
    try {
      let currentUserId: string | null = null;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const authKey = `sb-${projectRef}-auth-token`;
        const tokenStr = localStorage.getItem(authKey);
        if (tokenStr) {
          const tokenData = JSON.parse(tokenStr);
          currentUserId = tokenData?.user?.id || null;
        }
      }
      if (currentUserId) {
        const cachedColor = localStorage.getItem(`nr1_branding_${currentUserId}`);
        return !!(cachedColor && /^#([0-9A-F]{3}){1,2}$/i.test(cachedColor));
      }
    } catch (e) {
      // Ignorar erros
    }
    return false;
  }, []);

  // Inicia o gate aberto se o cache existe (pula o loading)
  const [gateOpen, setGateOpen] = useState(hasCache);

  useEffect(() => {
    // Se o gate já abriu pelo cache, não precisamos re-abrir
    if (gateOpen) return;

    if (!branding.isLoading) {
      setGateOpen(true);
      return;
    }
    
    // Timeout de segurança: 800ms
    const timer = setTimeout(() => {
      console.warn("[MainLayout] Timeout do Branding Loading Gate estourou (800ms). Liberando UI forçadamente.");
      setGateOpen(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [branding.isLoading, gateOpen]);

  if (!gateOpen) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-400 animate-spin" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Carregando ambiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden h-14 flex items-center gap-2 px-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px] max-w-[85vw]">
              <div onClick={() => setMobileNavOpen(false)}>
                <Sidebar />
              </div>
            </SheetContent>
          </Sheet>
          <BrandLogo
            logoUrl={branding.logoUrl}
            brandName={branding.brandName}
            className="h-9 w-auto object-contain"
          />
        </div>

        <Header />
        <CompanySuspendedBanner />
        <GestorAlertBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <LayoutModalErrorBoundary>
        <GlobalBlockerModal />
      </LayoutModalErrorBoundary>
      <LayoutModalErrorBoundary>
        <PulseBlockerModal />
      </LayoutModalErrorBoundary>
      <LayoutModalErrorBoundary>
        <PontoAssinaturaBlockerModal />
      </LayoutModalErrorBoundary>
      <LayoutModalErrorBoundary>
        <WelcomeWizard />
      </LayoutModalErrorBoundary>
      <LayoutModalErrorBoundary>
        <TermsReacceptanceModal />
      </LayoutModalErrorBoundary>


    </div>
  );
}
