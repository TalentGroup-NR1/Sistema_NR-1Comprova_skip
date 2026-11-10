import { Card } from "@/components/ui/card";
import { 
  Utensils, 
  Heart, 
  Car, 
  Smile, 
  GraduationCap, 
  Gift,
  Building2 
} from "lucide-react";

const CATEGORIA_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  alimentacao: { icon: Utensils, color: "bg-orange-500" },
  saude: { icon: Heart, color: "bg-red-500" },
  transporte: { icon: Car, color: "bg-blue-500" },
  lazer: { icon: Smile, color: "bg-purple-500" },
  educacao: { icon: GraduationCap, color: "bg-green-500" },
  outros: { icon: Gift, color: "bg-gray-500" },
};

interface BeneficioCardMiniProps {
  beneficio: {
    id: string;
    nome: string;
    empresa?: string | null;
    imagem_capa?: string | null;
    categoria?: string | null;
  };
  onClick: () => void;
}

export function BeneficioCardMini({ beneficio, onClick }: BeneficioCardMiniProps) {
  if (!beneficio) return null;
  const categoria = beneficio.categoria || 'outros';
  const config = CATEGORIA_CONFIG[categoria] || CATEGORIA_CONFIG.outros;
  const Icon = config.icon;

  return (
    <Card 
      className="group w-64 h-36 relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg border-0"
      onClick={onClick}
    >
      {/* Imagem de capa ou placeholder */}
      <div className="absolute inset-0">
        {beneficio.imagem_capa ? (
          <img 
            src={beneficio.imagem_capa} 
            alt={beneficio.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full ${config.color} flex items-center justify-center`}>
            <Icon className="h-12 w-12 text-white/70" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h4 className="font-semibold text-sm line-clamp-2 mb-0.5">
          {beneficio.nome}
        </h4>
        {beneficio.empresa && (
          <p className="text-xs text-white/70 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {beneficio.empresa}
          </p>
        )}
      </div>
    </Card>
  );
}
