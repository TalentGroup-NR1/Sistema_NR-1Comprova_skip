import { useParams, useNavigate } from "react-router-dom";
import { LaudoAep } from "@/components/mapa-riscos/aep/LaudoAep";
import { MainLayout } from "@/components/layout/MainLayout"; // Ensure this path is correct if they use one

export default function LaudoAepPage() {
  const { aplicacaoId } = useParams<{ aplicacaoId: string }>();
  const navigate = useNavigate();

  if (!aplicacaoId) return <div>ID inválido.</div>;

  return (
    <LaudoAep 
      aplicacaoId={aplicacaoId} 
      onBack={() => navigate(-1)} 
    />
  );
}
