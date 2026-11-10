import React, { Component, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(
      `[SectionErrorBoundary${this.props.title ? ` - ${this.props.title}` : ""}] Erro isolado na seção:`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          data-testid="section-error-boundary-fallback"
          className="p-4 rounded-lg border border-border/60 bg-muted/30 text-muted-foreground text-sm flex items-center gap-3 my-2"
        >
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-medium text-foreground">
              {this.props.title
                ? `Não foi possível carregar ${this.props.title}`
                : "Não foi possível carregar esta seção"}
            </p>
            <p className="text-xs text-muted-foreground">
              Ocorreu uma instabilidade neste bloco. As demais áreas continuam funcionando normalmente.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
