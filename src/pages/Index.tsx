import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardAdmin } from "@/components/dashboard/DashboardAdmin";
import { DashboardColaborador } from "@/components/dashboard/DashboardColaborador";
import { DashboardGestor } from "@/components/dashboard/DashboardGestor";
import { AlertaDenunciasCard } from "@/components/dashboard/AlertaDenunciasCard";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { role } = useAuth();

  // Check if user is admin/RH (can see full dashboard)
  const isAdmin = ['admin_master', 'admin_empresa', 'analista_rh'].includes(role || '');
  const isGestor = role === 'gestor_departamento';

  return (
    <MainLayout>
      <div className="space-y-6">
        <AlertaDenunciasCard />
        {isAdmin ? <DashboardAdmin /> : isGestor ? <DashboardGestor /> : <DashboardColaborador />}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
