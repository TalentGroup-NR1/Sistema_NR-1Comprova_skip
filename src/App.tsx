import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingDocumentEffect } from "@/components/layout/BrandingDocumentEffect";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import { HomeRoute } from "@/components/landing/HomeRoute";
import Auth from "./pages/Auth";
import CadastroEmpresa from "./pages/CadastroEmpresa";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Colaboradores from "./pages/Colaboradores";
import DiarioBordo from "./pages/DiarioBordo";
import CuidarMais from "./pages/CuidarMais";
import MapaRiscosNR1 from "./pages/MapaRiscosNR1";
import EstruturaOrganizacional from "./pages/EstruturaOrganizacional";
import Comunicados from "./pages/Comunicados";
import Campanhas from "./pages/Campanhas";
import Organograma from "./pages/Organograma";
import GerenciamentoAcessos from "./pages/GerenciamentoAcessos";
import Empresas from "./pages/Empresas";
import FeedbackForm from "./pages/FeedbackForm";
import CuidarMaisForm from "./pages/CuidarMaisForm";
import Ferias from "./pages/Ferias";
import MinhasFerias from "./pages/MinhasFerias";
import MinhasTarefas from "./pages/MinhasTarefas";
import MinhasAtividades from "./pages/MinhasAtividades";
import FeedbackGestao from "./pages/FeedbackGestao";
import Avaliacoes from "./pages/Avaliacoes";
import AvaliacaoPreenchimento from "./pages/AvaliacaoPreenchimento";
import AvaliacaoResultado from "./pages/AvaliacaoResultado";
import PDIDetail from "./pages/PDIDetail";
import AlterarSenha from "./pages/AlterarSenha";
import Treinamentos from "./pages/Treinamentos";
import TreinamentoView from "./pages/TreinamentoView";
import Demissoes from "./pages/Demissoes";
import Relatorios from "./pages/Relatorios";
import ValidarCertificado from "./pages/ValidarCertificado";
import Beneficios from "./pages/Beneficios";
import Notificacoes from "./pages/Notificacoes";
import FichaProfissional from "./pages/FichaProfissional";
import RelatoriosExecutivos from "./pages/RelatoriosExecutivos";
import AtualizarSenha from "./pages/AtualizarSenha";
import Unsubscribe from "./pages/Unsubscribe";
import AnalisePerfil from "./pages/AnalisePerfil";
import PontoEletronico from "./pages/PontoEletronico";
import Denuncias from "./pages/Denuncias";
import ComportamentosOfensivos from "./pages/ComportamentosOfensivos";
import AdminPlataforma from "./pages/AdminPlataforma";
import NotFound from "./pages/NotFound";
import LaudoAepPage from "./pages/LaudoAepPage";
import ConfiguracoesEmpresa from "./pages/ConfiguracoesEmpresa";
import Evidencias from "./pages/Evidencias";

const queryClient = new QueryClient();

export { PUBLIC_ROUTES } from '@/lib/publicRoutes';


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyProvider>
        <TooltipProvider>
          <BrandingDocumentEffect />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/cadastro-empresa" element={
                <ProtectedRoute requireSuperAdmin unauthenticatedRedirect="/">
                  <CadastroEmpresa />
                </ProtectedRoute>
              } />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/atualizar-senha" element={<AtualizarSenha />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/alterar-senha" element={<ProtectedRoute><AlterarSenha /></ProtectedRoute>} />
              <Route path="/" element={<HomeRoute />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/colaboradores" element={<ProtectedRoute><Colaboradores /></ProtectedRoute>} />
              <Route path="/diario-bordo" element={<ProtectedRoute><DiarioBordo /></ProtectedRoute>} />
              <Route path="/cuidar-mais" element={<ProtectedRoute><CuidarMais /></ProtectedRoute>} />
              <Route path="/mapa-riscos-nr1" element={<ProtectedRoute><MapaRiscosNR1 /></ProtectedRoute>} />
              <Route path="/laudo/:aplicacaoId" element={<ProtectedRoute><LaudoAepPage /></ProtectedRoute>} />
              <Route path="/estrutura-organizacional" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento']}>
                  <EstruturaOrganizacional />
                </ProtectedRoute>
              } />
              <Route path="/comunicados" element={<ProtectedRoute><Comunicados /></ProtectedRoute>} />
              <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
              <Route path="/organograma" element={<ProtectedRoute><Organograma /></ProtectedRoute>} />
              <Route path="/ferias" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento']}>
                  <Ferias />
                </ProtectedRoute>
              } />
              <Route path="/minhas-ferias" element={
                <ProtectedRoute>
                  <MinhasFerias />
                </ProtectedRoute>
              } />
              <Route path="/minhas-atividades" element={
                <ProtectedRoute>
                  <MinhasAtividades />
                </ProtectedRoute>
              } />
              <Route path="/minhas-tarefas" element={
                <ProtectedRoute>
                  <MinhasTarefas />
                </ProtectedRoute>
              } />
              <Route path="/demissoes" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <Demissoes />
                </ProtectedRoute>
              } />
              <Route path="/feedback-gestao" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento']}>
                  <FeedbackGestao />
                </ProtectedRoute>
              } />
              <Route path="/acessos" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa']}>
                  <GerenciamentoAcessos />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes-empresa" element={
                <ProtectedRoute allowedRoles={['admin_empresa']}>
                  <ConfiguracoesEmpresa />
                </ProtectedRoute>
              } />
              <Route path="/empresas" element={
                <ProtectedRoute allowedRoles={['admin_master']}>
                  <Empresas />
                </ProtectedRoute>
              } />
              <Route path="/avaliacoes" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']}>
                  <Avaliacoes />
                </ProtectedRoute>
              } />
              <Route path="/feedback/:token" element={<FeedbackForm />} />
              <Route path="/feedback/:slug/:token" element={<FeedbackForm />} />
              <Route path="/cuidar-mais-form/:token" element={<CuidarMaisForm />} />
              <Route path="/avaliacao/preencher/:token" element={<AvaliacaoPreenchimento />} />
              <Route path="/avaliacao/resultado/:avaliacaoId" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento']}>
                  <AvaliacaoResultado />
                </ProtectedRoute>
              } />
              <Route path="/pdi/:pdiId" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']}>
                  <PDIDetail />
                </ProtectedRoute>
              } />
              <Route path="/treinamentos" element={<ProtectedRoute><Treinamentos /></ProtectedRoute>} />
              <Route path="/treinamento/:id" element={<ProtectedRoute><TreinamentoView /></ProtectedRoute>} />
              <Route path="/beneficios" element={<ProtectedRoute><Beneficios /></ProtectedRoute>} />
              <Route path="/relatorios" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <Relatorios />
                </ProtectedRoute>
              } />
              <Route path="/validar-certificado" element={<ValidarCertificado />} />
              <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
              <Route path="/ficha-profissional/:colaboradorId" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento']}>
                  <FichaProfissional />
                </ProtectedRoute>
              } />
              <Route path="/relatorios-executivos" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <RelatoriosExecutivos />
                </ProtectedRoute>
              } />
              <Route path="/analise-perfil" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <AnalisePerfil />
                </ProtectedRoute>
              } />
              <Route path="/ponto-eletronico" element={
                <ProtectedRoute>
                  <PontoEletronico />
                </ProtectedRoute>
              } />
              <Route path="/denuncias" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <Denuncias />
                </ProtectedRoute>
              } />
              <Route path="/comportamentos-ofensivos" element={
                <ProtectedRoute allowedRoles={['admin_master', 'admin_empresa', 'analista_rh']}>
                  <ComportamentosOfensivos />
                </ProtectedRoute>
              } />
              <Route path="/admin-plataforma" element={
                <ProtectedRoute requireSuperAdmin>
                  <AdminPlataforma />
                </ProtectedRoute>
              } />
              <Route path="/evidencias" element={<Evidencias />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
