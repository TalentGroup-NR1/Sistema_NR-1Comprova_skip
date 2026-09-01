import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  CONSENT_LABELS,
  useConsentimentos,
  useToggleConsentimento,
  type ConsentType,
} from '@/hooks/useLgpd';

const TIPOS: ConsentType[] = ['rh_data', 'feedback', 'training', 'communications'];

interface Props {
  colaboradorId: string;
}

export function ConsentimentosLgpd({ colaboradorId }: Props) {
  const { data: consents = [], isLoading } = useConsentimentos(colaboradorId);
  const toggle = useToggleConsentimento();

  const byType = (t: ConsentType) => consents.find(c => c.consent_type === t);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">Consentimentos LGPD</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && TIPOS.map(tipo => {
          const c = byType(tipo);
          const ativo = c?.consent_given ?? true;
          const obrigatorio = tipo === 'rh_data';
          return (
            <div key={tipo} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {CONSENT_LABELS[tipo]}
                  {obrigatorio && (
                    <Badge variant="secondary" className="ml-2 font-normal">Obrigatório</Badge>
                  )}
                  {!ativo && (
                    <Badge variant="destructive" className="ml-2 font-normal">Consentimento revogado</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ativo
                    ? `Consentido em ${c ? new Date(c.consent_date).toLocaleDateString('pt-BR') : '—'}`
                    : `Revogado em ${c?.revoked_date ? new Date(c.revoked_date).toLocaleDateString('pt-BR') : '—'}`}
                </p>
              </div>
              <Switch
                checked={ativo}
                disabled={obrigatorio || toggle.isPending}
                onCheckedChange={(v) =>
                  toggle.mutate({ colaboradorId, tipo, conceder: v })
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
