import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { ConsentimentosLgpd } from './ConsentimentosLgpd';
import { ExcluirDadosDialog } from './ExcluirDadosDialog';
import { useAuth } from '@/hooks/useAuth';
import { useExportarDadosLgpd, useLgpdAuditLogs } from '@/hooks/useLgpd';
import { exportToExcel, exportToJson, flattenExportPayload } from '@/lib/exportUtils';
import { toast } from '@/hooks/use-toast';

const ACTION_LABELS: Record<string, string> = {
  export: 'Exportação de dados',
  delete: 'Exclusão de dados',
  revoke_consent: 'Revogação de consentimento',
  grant_consent: 'Concessão de consentimento',
};

interface Props {
  colaboradorId: string;
  colaboradorNome: string;
  onDeleted?: () => void;
}

export function LgpdSection({ colaboradorId, colaboradorNome, onDeleted }: Props) {
  const { isAdminMaster, isAdminEmpresa, role, activeRole } = useAuth();
  const currentRole = activeRole ?? role;
  const podeExportar = isAdminMaster || isAdminEmpresa || currentRole === 'analista_rh';
  const podeExcluir = isAdminMaster || isAdminEmpresa;

  const [excluirOpen, setExcluirOpen] = useState(false);
  const exportar = useExportarDadosLgpd();
  const { data: logs = [] } = useLgpdAuditLogs(colaboradorId);

  const slug = colaboradorNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '_').toLowerCase();

  const handleExport = async () => {
    try {
      const payload = await exportar.mutateAsync(colaboradorId);
      exportToJson(payload, `lgpd_${slug}`);
      exportToExcel(flattenExportPayload(payload), `lgpd_${slug}`);
      toast({ title: 'Dados exportados', description: 'Arquivos JSON e CSV baixados.' });
    } catch {
      /* erro já tratado no hook */
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Direitos do titular (LGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {podeExportar && (
            <Button type="button" variant="outline" onClick={handleExport} disabled={exportar.isPending}>
              {exportar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar Dados (LGPD)
            </Button>
          )}
          {podeExcluir && (
            <Button type="button" variant="destructive" onClick={() => setExcluirOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Dados (LGPD)
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">
            Exportar gera arquivos JSON e CSV com todos os dados pessoais. Excluir remove permanentemente
            todos os registros vinculados — diferente de apenas desativar o colaborador.
          </p>
        </CardContent>
      </Card>

      <ConsentimentosLgpd colaboradorId={colaboradorId} />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Histórico de ações LGPD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>}
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between border-b py-1.5 text-sm last:border-0">
              <span>{ACTION_LABELS[log.action] ?? log.action}</span>
              <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <ExcluirDadosDialog
        open={excluirOpen}
        onOpenChange={setExcluirOpen}
        colaboradorId={colaboradorId}
        colaboradorNome={colaboradorNome}
        onDeleted={onDeleted}
      />
    </div>
  );
}
