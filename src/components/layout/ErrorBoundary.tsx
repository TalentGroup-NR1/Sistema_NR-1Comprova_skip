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

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border shadow-sm m-4 md:m-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ops, algo deu errado!</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {this.props.fallbackMessage || "Ocorreu um erro inesperado ao carregar esta seção. Nossa equipe já foi notificada."}
          </p>
          <Button onClick={() => this.setState({ hasError: false })} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
