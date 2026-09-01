import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useMeusBeneficios } from "@/hooks/useBeneficios";
import { useNavigate } from "react-router-dom";
import { BeneficioCardMini } from "./BeneficioCardMini";

export function BeneficiosDestaque() {
  const { data, isLoading } = useMeusBeneficios();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allBeneficios = [
    ...(data?.individual || []),
    ...(data?.departamento || []),
  ].filter((item: any) => item && item.beneficio).slice(0, 6); // Limitar a 6 para o destaque

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Largura aproximada de um card + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-64 h-36 flex-shrink-0 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allBeneficios.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Meus Benefícios
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/beneficios")}
          className="text-primary"
        >
          Ver Catálogo
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="relative">
        {/* Botões de navegação */}
        {allBeneficios.length > 3 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Carrossel */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {allBeneficios.map((item: any) => (
            <div key={item.id} className="flex-shrink-0 snap-start">
              <BeneficioCardMini 
                beneficio={item.beneficio}
                onClick={() => navigate("/beneficios")}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
