import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CiclosList } from "@/components/avaliacoes/CiclosList";
import { CicloFormDialog } from "@/components/avaliacoes/CicloFormDialog";
import { CicloConfig } from "@/components/avaliacoes/CicloConfig";
import { MinhasAvaliacoes } from "@/components/avaliacoes/MinhasAvaliacoes";
import { MinhasAvaliacoesGestor } from "@/components/avaliacoes/MinhasAvaliacoesGestor";
import { CicloAvaliacao } from "@/hooks/useAvaliacoes";
import { useAuth } from "@/hooks/useAuth";

export default function Avaliacoes() {
  const { role } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCiclo, setSelectedCiclo] = useState<CicloAvaliacao | null>(null);

  // Only admin/RH can manage evaluations (gestor excluded)
  const isAdmin = ['admin_master', 'admin_empresa', 'analista_rh'].includes(role || '');
  const isGestor = role === 'gestor_departamento';

  // Gestor view - team evaluations to respond
  if (isGestor) {
    return <MinhasAvaliacoesGestor />;
  }

  // Colaborador view - simplified evaluations page
  if (!isAdmin) {
    return <MinhasAvaliacoes />;
  }

  // Admin/RH view - full management interface
  const handleConfigureClick = (ciclo: CicloAvaliacao) => {
    setSelectedCiclo(ciclo);
  };

  const handleBack = () => {
    setSelectedCiclo(null);
  };

  return (
    <MainLayout>
      <div className="container mx-auto">
        {selectedCiclo ? (
          <CicloConfig ciclo={selectedCiclo} onBack={handleBack} />
        ) : (
          <>
            <CiclosList
              onCreateClick={() => setCreateDialogOpen(true)}
              onConfigureClick={handleConfigureClick}
            />
            <CicloFormDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
