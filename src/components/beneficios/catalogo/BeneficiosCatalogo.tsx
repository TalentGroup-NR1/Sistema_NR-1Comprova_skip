import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Search, Utensils, Heart, Car, Smile, GraduationCap } from "lucide-react";
import { useMeusBeneficios } from "@/hooks/useBeneficios";
import { BeneficioCard } from "./BeneficioCard";
import { BeneficioDetailModal } from "./BeneficioDetailModal";

const CATEGORIAS = [
  { value: 'all', label: 'Todos', icon: Gift },
  { value: 'alimentacao', label: 'Alimentação', icon: Utensils },
  { value: 'saude', label: 'Saúde', icon: Heart },
  { value: 'odontologico', label: 'Odontológico', icon: Smile },
  { value: 'seguros', label: 'Seguros', icon: Heart },
  { value: 'transporte', label: 'Transporte', icon: Car },
  { value: 'lazer', label: 'Lazer', icon: Smile },
  { value: 'educacao', label: 'Educação', icon: GraduationCap },
  { value: 'clube_descontos', label: 'Clube de Descontos', icon: Gift },
  { value: 'outros', label: 'Outros', icon: Gift },
];

export function BeneficiosCatalogo() {
  const { data, isLoading } = useMeusBeneficios();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("all");
  const [selectedBeneficio, setSelectedBeneficio] = useState<any>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<any>(null);

  const allBeneficios = [
    ...(data?.individual || []),
    ...(data?.departamento || []),
    ...((data as any)?.tipoContrato || []),
    ...((data as any)?.empresaCliente || []),
  ];


  // Pinned benefit (sempre primeiro): Sistema RH+ Honest
  const isPinned = (b: any) => {
    const nome = (b?.nome || "").toLowerCase();
    return nome.includes("rh+") || nome.includes("rh +") || (nome.includes("honest") && nome.includes("rh"));
  };

  // Filtrar por categoria e busca
  const filteredBeneficios = allBeneficios
    .filter((item: any) => {
      const beneficio = item.beneficio;
      const matchesSearch = beneficio?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            beneficio?.empresa?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria = selectedCategoria === 'all' || 
                               (beneficio?.categoria || 'outros') === selectedCategoria;
      return matchesSearch && matchesCategoria;
    })
    .sort((a: any, b: any) => {
      const ap = isPinned(a.beneficio) ? 0 : 1;
      const bp = isPinned(b.beneficio) ? 0 : 1;
      return ap - bp;
    });

  const handleCardClick = (item: any) => {
    setSelectedBeneficio(item.beneficio);
    setSelectedAtribuicao({
      numero_cartao: item.numero_cartao,
      data_inicio: item.data_inicio,
      status: item.status,
      tipo_atribuicao: item.tipo_atribuicao,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-24" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-[16/10] rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (allBeneficios.length === 0) {
    return (
      <div className="text-center py-16">
        <Gift className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
        <h3 className="text-xl font-semibold mb-2">Nenhum benefício disponível</h3>
        <p className="text-muted-foreground">
          Você não possui benefícios atribuídos no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar benefício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categorias */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategoria === cat.value;
            return (
              <Badge 
                key={cat.value}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer transition-all ${isActive ? '' : 'hover:bg-muted'}`}
                onClick={() => setSelectedCategoria(cat.value)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {cat.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Grid de benefícios */}
      {filteredBeneficios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBeneficios.map((item: any) => (
            <BeneficioCard 
              key={item.id}
              beneficio={item.beneficio}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Nenhum benefício encontrado com os filtros selecionados.
          </p>
        </div>
      )}

      {/* Modal de detalhes */}
      <BeneficioDetailModal 
        open={!!selectedBeneficio}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBeneficio(null);
            setSelectedAtribuicao(null);
          }
        }}
        beneficio={selectedBeneficio}
        atribuicao={selectedAtribuicao}
      />
    </div>
  );
}
