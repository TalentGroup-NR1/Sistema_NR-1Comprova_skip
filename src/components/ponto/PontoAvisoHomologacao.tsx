import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function PontoAvisoHomologacao() {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Módulo em homologação</AlertTitle>
      <AlertDescription>
        Este módulo está em fase de homologação e não substitui
        sistema oficial de registro de ponto eletrônico homologado
        pelo Ministério do Trabalho e Emprego (Portaria 671/2021).
        Os registros aqui gerados têm finalidade exclusivamente
        gerencial e não possuem valor legal como comprovação de
        jornada para fins trabalhistas.
      </AlertDescription>
    </Alert>
  );
}
