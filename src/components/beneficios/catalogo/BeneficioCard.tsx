import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Utensils, 
  Heart, 
  Car, 
  Smile, 
  GraduationCap, 
  Gift,
  Building2 
} from "lucide-react";

const CATEGORIA_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  alimentacao: { label: "Alimentação", icon: Utensils, color: "bg-orange-500" },
  saude: { label: "Saúde", icon: Heart, color: "bg-red-500" },
  transporte: { label: "Transporte", icon: Car, color: "bg-blue-500" },
  lazer: { label: "Lazer", icon: Smile, color: "bg-purple-500" },
  educacao: { label: "Educação", icon: GraduationCap, color: "bg-green-500" },
  outros: { label: "Outros", icon: Gift, color: "bg-gray-500" },
};

interface BeneficioCardProps {
  beneficio: {
    id: string;
    nome: string;
    empresa?: string | null;
    imagem_capa?: string | null;
    categoria?: string | null;
    valor_mensal?: number | null;
  };
  onClick: () => void;
}

export function BeneficioCard({ beneficio, onClick }: BeneficioCardProps) {
  const categoria = beneficio.categoria || 'outros';
  const config = CATEGORIA_CONFIG[categoria] || CATEGORIA_CONFIG.outros;
  const Icon = config.icon;

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0 bg-card"
      onClick={onClick}
    >
      {/* Imagem de capa ou placeholder */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {beneficio.imagem_capa ? (
          <img 
            src={beneficio.imagem_capa} 
            alt={beneficio.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full ${config.color} flex items-center justify-center`}>
            <Icon className="h-16 w-16 text-white/80" />
          </div>
        )}
        
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Badge de categoria */}
        <Badge 
          className={`absolute top-3 left-3 ${config.color} text-white border-0 shadow-lg`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>

        {/* Valor mensal */}
        {beneficio.valor_mensal && (
          <Badge 
            className="absolute top-3 right-3 bg-white/90 text-foreground border-0 shadow-lg font-semibold"
          >
            {formatCurrency(beneficio.valor_mensal)}/mês
          </Badge>
        )}
      </div>

      {/* Conteúdo do card */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold text-lg line-clamp-2 mb-1 group-hover:text-primary-foreground transition-colors">
          {beneficio.nome}
        </h3>
        {beneficio.empresa && (
          <p className="text-sm text-white/80 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {beneficio.empresa}
          </p>
        )}
      </div>

      {/* Borda inferior colorida */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${config.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </Card>
  );
}
