import { Component, ReactNode, useState } from "react";
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
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";


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
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="h-9 w-auto object-contain"
          />
        </div>

        <Header />
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

    </div>
  );
}
