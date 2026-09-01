import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardAdmin } from "@/components/dashboard/DashboardAdmin";
import { DashboardColaborador } from "@/components/dashboard/DashboardColaborador";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { role } = useAuth();
  
  // Check if user is admin/RH (can see full dashboard)
  const isAdmin = ['admin_master', 'admin_empresa', 'analista_rh'].includes(role || '');

  return (
    <MainLayout>
      {isAdmin ? <DashboardAdmin /> : <DashboardColaborador />}
    </MainLayout>
  );
};

export default Dashboard;