import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlataformaMetrics } from '@/hooks/usePlataforma';
import { Building2, Home, Briefcase, Users, TrendingUp, Ban } from 'lucide-react';

export function PlataformaMetricsCards() {
  const { data, isLoading } = usePlataformaMetrics();

  const cards = [
    { label: 'Empresas ativas', value: data?.empresas_ativas, icon: Building2 },
    { label: 'Empresas internas', value: data?.empresas_internas, icon: Home },
    { label: 'Empresas externas', value: data?.empresas_externas, icon: Briefcase },
    { label: 'Usuários na plataforma', value: data?.total_usuarios, icon: Users },
    { label: 'Novos cadastros (30d)', value: data?.novos_30_dias, icon: TrendingUp },
    { label: 'Empresas suspensas', value: data?.empresas_suspensas, icon: Ban },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold">{value ?? 0}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
