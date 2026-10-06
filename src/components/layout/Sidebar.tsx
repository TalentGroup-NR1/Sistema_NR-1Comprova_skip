import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserMinus, Calendar, FileText, BarChart3, Settings, Bell, ChevronLeft, ChevronRight, ChevronDown, Building2, ClipboardList, GraduationCap, Heart, Shield, ShieldAlert, MessageSquare, Briefcase, TrendingUp, Megaphone, UserSearch, Clock, Plane, ListChecks, ShieldCheck, LogOut, Palette, User, Network, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { FaleConoscoDrawer } from "@/components/denuncias/FaleConoscoDrawer";
import { PerfilDialog } from "./PerfilDialog";
import { PreferenciasDialog } from "./PreferenciasDialog";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useDenunciasMonitor } from "@/hooks/useDenuncias";
import { useToast } from "@/hooks/use-toast";
import { useMyPulseStatus } from "@/hooks/usePulseSurvey";
import { useBranding } from "@/hooks/useBranding";


interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  roles?: AppRole[];
}

const dashboardItem: NavItem = { icon: LayoutDashboard, label: "Dashboard", href: "/" };

const departamentoPessoalItems: NavItem[] = [
  { icon: Users, label: "Colaboradores", href: "/colaboradores", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
  { icon: Calendar, label: "Férias", href: "/ferias", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
  { icon: Plane, label: "Minhas Férias", href: "/minhas-ferias", roles: ['colaborador'] },
  { icon: UserMinus, label: "Demissões", href: "/demissoes", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
  { icon: Briefcase, label: "Benefícios", href: "/beneficios" },
  { icon: Clock, label: "Ponto Eletrônico", href: "/ponto-eletronico" },
  { icon: ListChecks, label: "Minhas Tarefas", href: "/minhas-tarefas" },
  // [HIDDEN-FOR-PRESENTATION] Revert: remove comment from the line below to restore
  // { icon: ClipboardList, label: "Minhas Atividades", href: "/minhas-atividades" },
  { icon: Megaphone, label: "Comunicados", href: "/comunicados" },
];

const desenvolvimentoItems: NavItem[] = [
  // [HIDDEN-FOR-PRESENTATION] Revert: remove comment from the line below to restore
  // { icon: UserSearch, label: "Análise de Perfil", href: "/analise-perfil", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
  { icon: FileText, label: "Diário de Bordo", href: "/diario-bordo" },
  { icon: ClipboardList, label: "Avaliação", href: "/avaliacoes" },
  { icon: MessageSquare, label: "Feedback", href: "/feedback-gestao", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
  { icon: GraduationCap, label: "Treinamento", href: "/treinamentos" },
  { icon: Heart, label: "Cuidar+", href: "/cuidar-mais" },
  { icon: ShieldAlert, label: "Mapa de Riscos NR1", href: "/mapa-riscos-nr1" },
  { icon: Network, label: "Estrutura Organizacional", href: "/estrutura-organizacional", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
];

const configuracoesItems: NavItem[] = [
  { icon: Settings, label: "Configurações da Empresa", href: "/configuracoes-empresa", roles: ['admin_empresa'] },
  { icon: Building2, label: "Cadastro de Empresa", href: "/empresas", roles: ['admin_master'] },
  { icon: BarChart3, label: "Relatórios", href: "/relatorios", roles: ['admin_master', 'admin_empresa'] },
  { icon: FileText, label: "Relatórios Executivos", href: "/relatorios-executivos", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
  { icon: Shield, label: "Gerenciar Usuários", href: "/acessos", roles: ['admin_master', 'admin_empresa'] },
  { icon: ShieldCheck, label: "Fale Conosco", href: "/denuncias", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
  { icon: ShieldAlert, label: "Comportamentos Ofensivos", href: "/comportamentos-ofensivos", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
];

const roleLabels: Record<string, string> = {
  admin_master: "Admin Master",
  admin_empresa: "Admin Empresa",
  analista_rh: "Analista RH",
  gestor_departamento: "Gestor",
  colaborador: "Colaborador",
};

let savedScrollPos = 0;

export function Sidebar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = savedScrollPos;
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    savedScrollPos = e.currentTarget.scrollTop;
  };
  const branding = useBranding();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [denunciasOpen, setDenunciasOpen] = useState(false);
  const unreadCount = useUnreadCount();
  const { data: adminNotifications } = useAdminNotifications();
  const totalUnread = unreadCount + (adminNotifications ?? []).filter((n) => !n.is_read).length;
  const { denunciasNovas, faleConoscoNovos } = useDenunciasMonitor();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    departamentoPessoal: true,
    desenvolvimento: true,
    configuracoes: false,
  });
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [preferenciasOpen, setPreferenciasOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, isAuthenticated, user, signOut, isSuperAdmin } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const { data: companies } = useCompanies();

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);
  const isFriday = new Date().getDay() === 5;
  const { data: pulseStatus } = useMyPulseStatus();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error && !error.message?.toLowerCase().includes('session')) {
      toast({ variant: "destructive", title: "Erro ao sair", description: error.message });
      return;
    }
    navigate("/auth");
  };

  const filterByRole = (items: NavItem[]) => {
    if (!isAuthenticated) return [];
    if (role === null) return items.filter(item => !item.roles);
    return items.filter(item => !item.roles || item.roles.includes(role));
  };


  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isGroupActive = (items: NavItem[]) => items.some(item => location.pathname === item.href);

  const addDynamicBadges = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (item.href === '/cuidar-mais' && isFriday && role === 'colaborador' && pulseStatus && !pulseStatus.hasResponded) {
        return { ...item, badge: 1 };
      }
      if (item.href === '/avaliacoes' && role === 'colaborador') {
        return { ...item, label: 'Avaliações e PDI' };
      }
      return item;
    });
  };

  const visibleDepartamentoPessoalItems = filterByRole(departamentoPessoalItems);
  const visibleDesenvolvimentoItems = addDynamicBadges(filterByRole(desenvolvimentoItems));
  const visibleConfiguracoesItems = [
    ...(isSuperAdmin
      ? [
        { icon: Server, label: "Plataforma", href: "/admin-plataforma" } as NavItem,
        { icon: Building2, label: "Cadastro de Empresa", href: "/cadastro-empresa" } as NavItem,
        { icon: Building2, label: "Listar Empresas", href: "/empresas" } as NavItem,
      ]
      : []),
    ...filterByRole(configuracoesItems),
  ].map(item => {
    if (item.href === "/denuncias" && faleConoscoNovos > 0) {
      return { ...item, badge: faleConoscoNovos };
    }
    if (item.href === "/comportamentos-ofensivos" && denunciasNovas > 0) {
      return { ...item, badge: denunciasNovas };
    }
    return item;
  });

  const userName = user?.email?.split("@")[0] ?? "usuário";
  const roleLabel = role ? roleLabels[role] ?? "Usuário" : "Usuário";
  const userInitial = userName.substring(0, 1).toUpperCase();

  const NavLinkItem = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative font-medium text-[14px]",
          isActive
            ? "bg-[hsl(var(--sidebar-active))] text-sidebar-foreground"
            : "text-sidebar-foreground hover:bg-[hsl(var(--sidebar-hover))]"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[hsl(var(--sidebar-primary))] transition-all duration-200 origin-left",
            isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
          )}
        />
        <Icon
          className={cn(
            "h-[18px] w-[18px] flex-shrink-0 transition-colors",
            isActive ? "text-[hsl(var(--sidebar-primary))]" : "text-[hsl(var(--sidebar-icon))] group-hover:text-sidebar-foreground"
          )}
        />
        {!collapsed && (
          <>
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-[#DC2626] text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[9px] font-semibold w-4 h-4 flex items-center justify-center rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border border-border shadow-md">
            {item.label}
            {item.badge && <span className="ml-2 text-primary">({item.badge})</span>}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linkContent;
  };

  const NavGroupComponent = ({
    groupKey, label, items,
  }: { groupKey: string; label: string; items: NavItem[] }) => {
    if (items.length === 0) return null;
    const isOpen = openGroups[groupKey];
    const hasActiveItem = isGroupActive(items);

    if (collapsed) {
      return <div className="space-y-1">{items.map(item => <NavLinkItem key={item.href} item={item} />)}</div>;
    }

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleGroup(groupKey)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 w-full text-left group transition-all duration-200",
              hasActiveItem ? "text-sidebar-foreground" : "text-[hsl(var(--sidebar-muted))] hover:text-sidebar-foreground"
            )}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold flex-1">{label}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-1 pl-4">
          {items.map(item => <NavLinkItem key={item.href} item={item} />)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 relative",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-5">
        <Link to="/" className="flex items-center justify-center">
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className={collapsed ? "h-9 w-9 object-contain" : "h-12 w-auto max-w-full object-contain"}
          />
        </Link>
      </div>



      {/* Navigation */}
      <nav 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto"
      >
        <div className="space-y-0.5">
          <NavLinkItem item={dashboardItem} />
        </div>

        {visibleDepartamentoPessoalItems.length > 0 && (
          <div>
            <NavGroupComponent groupKey="departamentoPessoal" label="Departamento Pessoal" items={visibleDepartamentoPessoalItems} />
          </div>
        )}

        {visibleDesenvolvimentoItems.length > 0 && (
          <div>
            <NavGroupComponent groupKey="desenvolvimento" label="Desenvolvimento" items={visibleDesenvolvimentoItems} />
          </div>
        )}

        {visibleConfiguracoesItems.length > 0 && (
          <div>
            <NavGroupComponent groupKey="configuracoes" label="Configurações" items={visibleConfiguracoesItems} />
          </div>
        )}
      </nav>

      {/* Notifications */}
      <div className="p-3 border-t border-sidebar-border">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative w-full text-sidebar-foreground hover:bg-[hsl(var(--sidebar-hover))] text-[14px] font-medium"
            >
              <Bell className="h-[18px] w-[18px] flex-shrink-0 text-[hsl(var(--sidebar-icon))] group-hover:text-sidebar-foreground" />
              {!collapsed && (
                <>
                  <span>Notificações</span>
                  {totalUnread > 0 && (
                    <span className="ml-auto bg-[#DC2626] text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </>
              )}
              {collapsed && totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[9px] font-semibold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalUnread}
                </span>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border border-border shadow-md">
              Notificações
              {totalUnread > 0 && <span className="ml-2 text-primary">({totalUnread})</span>}
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Fale Conosco (logo abaixo de Notificações) */}
      <div className="px-3 pb-3">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setDenunciasOpen(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative w-full text-sidebar-foreground hover:bg-[hsl(var(--sidebar-hover))] text-[14px] font-medium"
            >
              <ShieldCheck className="h-[18px] w-[18px] flex-shrink-0 text-[hsl(var(--sidebar-icon))] group-hover:text-sidebar-foreground" />
              {!collapsed && <span>Fale Conosco</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border border-border shadow-md">
              Fale Conosco
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* User menu (fixo no rodapé da sidebar) */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full rounded-md transition-all duration-200 text-sidebar-foreground hover:bg-[hsl(var(--sidebar-hover))]",
                collapsed ? "justify-center p-2" : "px-2 py-2"
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="text-left min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{userName}</p>
                  <p className="text-[11px] text-[hsl(var(--sidebar-muted))] truncate">{roleLabel}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPerfilOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPreferenciasOpen(true)}>
              <Palette className="mr-2 h-4 w-4" />
              Preferências
            </DropdownMenuItem>
            {role === 'admin_empresa' && (
              <DropdownMenuItem onClick={() => navigate('/configuracoes-empresa')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações da Empresa
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
      <PreferenciasDialog open={preferenciasOpen} onOpenChange={setPreferenciasOpen} />
      <NotificationsDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />

      <FaleConoscoDrawer open={denunciasOpen} onOpenChange={setDenunciasOpen} />

      <Button
        variant="outline"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border-sidebar-border bg-card shadow-sm hover:bg-secondary"
      >
        {collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </Button>
    </aside>
  );
}
