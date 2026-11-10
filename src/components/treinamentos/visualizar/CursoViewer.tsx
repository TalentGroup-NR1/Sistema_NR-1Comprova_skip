import { Treinamento } from "@/hooks/useTreinamentos";
import { ModuloTreinamento } from "@/hooks/useProgressoAula";
import { TreinamentoViewer } from "./TreinamentoViewer";

interface CursoViewerProps {
  treinamento: Treinamento;
  modulos: ModuloTreinamento[];
}

export function CursoViewer({ treinamento, modulos }: CursoViewerProps) {
  return <TreinamentoViewer treinamento={treinamento} modulos={modulos} />;
}
