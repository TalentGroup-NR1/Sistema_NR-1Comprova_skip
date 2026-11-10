import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ErrorBoundary] capturou um erro na árvore:", error, errorInfo);
  }

  handleRetry = () => {
    try {
      this.setState({ hasError: false });
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = window.location.href;
      }
    }
  };

  render() {
    if (this.state.hasError) {
      try {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border shadow-sm m-4 md:m-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ops, algo deu errado!</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {this.props.fallbackMessage || "Ocorreu um erro ao carregar a página. Por favor, tente recarregar."}
            </p>
            <Button onClick={this.handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        );
      } catch (fallbackError) {
        console.error("[ErrorBoundary] erro fatal ao renderizar fallback:", fallbackError);
        return (
          <div style={{ padding: "32px", textAlign: "center", fontFamily: "sans-serif" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Ops, algo deu errado!</h2>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              {this.props.fallbackMessage || "Ocorreu um erro ao carregar a página. Por favor, tente recarregar."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        );
      }
    }
    return this.props.children;
  }
}
