import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserMinus, Calendar, FileText, Settings, Bell, ChevronLeft, ChevronRight, ChevronDown, Building2, ClipboardList, GraduationCap, Heart, Shield, ShieldAlert, MessageSquare, Briefcase, TrendingUp, Megaphone, UserSearch, Clock, Plane, ListChecks, ShieldCheck, LogOut, Palette, User, Network, Server } from "lucide-react";
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
import { useDenunciasMonitor, useIsResponsavelDenuncia } from "@/hooks/useDenuncias";
import { useToast } from "@/hooks/use-toast";
import { useMyPulseStatus } from "@/hooks/usePulseSurvey";
import { useBranding } from "@/hooks/useBranding";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useVisibleModules, useIsModuleVisible } from "@/hooks/useVisibleModules";
import { resolverModuloPai, isModuloBase, obterModuloPorRota } from "@/lib/modulosContrataveis";
import { ROLE_LABELS } from "@/lib/constants";


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
  { icon: ClipboardList, label: "Avaliação de Desempenho", href: "/avaliacoes" },
  { icon: MessageSquare, label: "Feedback", href: "/feedback-gestao", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
  { icon: GraduationCap, label: "Treinamento", href: "/treinamentos" },
  { icon: Heart, label: "Cuidar+", href: "/cuidar-mais" },
  { icon: ShieldAlert, label: "Mapa de Riscos NR1", href: "/mapa-riscos-nr1" },
  { icon: Network, label: "Estrutura Organizacional", href: "/estrutura-organizacional", roles: ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'] },
];

const configuracoesItems: NavItem[] = [
  { icon: Settings, label: "Configurações da Empresa", href: "/configuracoes-empresa", roles: ['admin_empresa'] },
  { icon: Building2, label: "Cadastro de Empresa", href: "/empresas", roles: ['admin_master'] },
  { icon: FileText, label: "Relatórios Executivos", href: "/relatorios-executivos", roles: ['admin_master', 'admin_empresa', 'analista_rh'] },
  { icon: Shield, label: "Gerenciar Usuários", href: "/acessos", roles: ['admin_master', 'admin_empresa'] },
  { icon: ShieldCheck, label: "Fale Conosco", href: "/denuncias" },
  { icon: ShieldAlert, label: "Comportamentos Ofensivos", href: "/comportamentos-ofensivos" },
];

const roleLabels: Record<string, string> = ROLE_LABELS;

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
  const { data: isResponsavel } = useIsResponsavelDenuncia();
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
  const { role, activeRole, availableRoles = [], switchActiveRole, isAuthenticated, user, signOut, isSuperAdmin } = useAuth();
  const effectiveRole = activeRole ?? role;

  const MANAGEMENT_ROLES: AppRole[] = ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'];
  const primaryManagementRole = MANAGEMENT_ROLES.find(mRole => availableRoles.includes(mRole));
  const hasManagementRole = !!primaryManagementRole;
  const hasColaboradorRole = availableRoles.includes('colaborador');
  const isMultiPerfil = hasManagementRole && hasColaboradorRole;

  const isMeuPerfil = effectiveRole === 'colaborador';
  const isPerfilEmpresa = !isMeuPerfil;

  const handleSwitchProfile = async (targetRole: AppRole) => {
    if (targetRole === effectiveRole) return;
    if (!switchActiveRole) return;
    const { error } = await switchActiveRole(targetRole);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao alternar perfil",
        description: error,
      });
      return;
    }
    toast({
      title: "Perfil alternado",
      description: targetRole === 'colaborador' 
        ? "Visualização alterada para: Meu Perfil (Pessoal)" 
        : "Visualização alterada para: Perfil da Empresa (Gestão)",
    });

    if (targetRole === 'colaborador') {
      const adminExclusiveRoutes = [
        '/colaboradores',
        '/ferias',
        '/demissoes',
        '/acessos',
        '/configuracoes-empresa',
        '/empresas',
        '/relatorios-executivos',
        '/estrutura-organizacional',
      ];
      if (adminExclusiveRoutes.some(route => location.pathname.startsWith(route))) {
        navigate('/');
      }
    } else {
      if (location.pathname === '/minhas-ferias') {
        navigate('/');
      }
    }
  };

  const { selectedCompanyId } = useCompanyContext();
  const { data: companies } = useCompanies();

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);
  const isFriday = new Date().getDay() === 5;
  const { data: pulseStatus } = useMyPulseStatus();
  const { data: visibleModules, isLoading: isLoadingModules, isError: isModulesError } = useVisibleModules();
  const { isVisible: isDenunciasVisible } = useIsModuleVisible('/denuncias');

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
    
    // First, filter by role (using effective active role)
    let roleFiltered = items;
    if (effectiveRole !== null) {
      roleFiltered = items.filter(item => !item.roles || item.roles.includes(effectiveRole));
    } else {
      roleFiltered = items.filter(item => !item.roles);
    }
    
    // Super Admin sem empresa selecionada: visão irrestrita da plataforma (bypass explícito)
    if (isSuperAdmin && !selectedCompanyId) {
      return roleFiltered;
    }

    // Fail-Closed durante carregamento inicial sem cache: apenas recursos base ou Dashboard
    if (isLoadingModules && (!visibleModules || visibleModules.length === 0)) {
      return roleFiltered.filter(item => item.href === '/' || isModuloBase(item.href));
    }

    // Fail-Closed em erro de RPC persistente: oculta módulos contratáveis (apenas base)
    if (isModulesError) {
      return roleFiltered.filter(item => item.href === '/' || isModuloBase(item.href));
    }

    // Filtragem comercial baseada na resposta da RPC
    if (visibleModules && visibleModules.length > 0) {
      return roleFiltered.filter(item => {
        // Módulo base (/colaboradores) e dashboard sempre visíveis
        const moduloPai = resolverModuloPai(item.href);
        if (isModuloBase(moduloPai) || item.href === '/') {
          return true;
        }

        const config = visibleModules.find(
          v => v.module_key === item.href || v.module_key === moduloPai
        );
        if (config) {
          return config.visible === true;
        }

        // Se for um módulo do catálogo comercial mas não retornado como true: ocultar (fail-closed)
        const ehModuloContratavel = obterModuloPorRota(item.href);
        if (ehModuloContratavel) {
          return false;
        }

        return true;
      });
    }

    // Fallback restritivo de segurança para usuários de empresa (apenas base)
    return roleFiltered.filter(item => item.href === '/' || isModuloBase(item.href));
  };


  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isGroupActive = (items: NavItem[]) => items.some(item => location.pathname === item.href);

  const addDynamicBadges = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (item.href === '/cuidar-mais' && isFriday && effectiveRole === 'colaborador' && pulseStatus && !pulseStatus.hasResponded) {
        return { ...item, badge: 1 };
      }
      if (item.href === '/avaliacoes' && effectiveRole === 'colaborador') {
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
  ].filter(item => {
    if (item.href === "/denuncias" || item.href === "/comportamentos-ofensivos") {
      return isResponsavel === true;
    }
    return true;
  }).map(item => {
    if (item.href === "/denuncias" && faleConoscoNovos > 0) {
      return { ...item, badge: faleConoscoNovos };
    }
    if (item.href === "/comportamentos-ofensivos" && denunciasNovas > 0) {
      return { ...item, badge: denunciasNovas };
    }
    return item;
  });

  const userName = user?.email?.split("@")[0] ?? "usuário";
  const roleLabel = effectiveRole ? roleLabels[effectiveRole] ?? "Usuário" : "Usuário";
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
          <BrandLogo
            logoUrl={branding.logoUrl}
            brandName={branding.brandName}
            className={collapsed ? "h-9 w-9 object-contain" : "h-12 w-auto max-w-full object-contain"}
          />
        </Link>
      </div>

      {/* Seletor de Perfil Ativo (Estilo Flash) */}
      {!collapsed ? (
        <div className="px-3 pb-3">
          {isMultiPerfil ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="profile-switcher-trigger"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-sidebar-border bg-[hsl(var(--sidebar-accent))]/40 hover:bg-[hsl(var(--sidebar-accent))]/80 transition-all duration-200 text-left group focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-xs cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                      isPerfilEmpresa
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    )}
                  >
                    {isPerfilEmpresa ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-sidebar-foreground truncate" data-testid="active-profile-title">
                        {isPerfilEmpresa ? "Perfil da Empresa" : "Meu Perfil"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-transform duration-200 shrink-0" />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">
                      {isPerfilEmpresa ? "Painel administrativo" : "Painel pessoal"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[230px] p-1.5 shadow-lg">
                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1">
                  Alternar Perfil
                </DropdownMenuLabel>
                <DropdownMenuItem
                  data-testid="profile-option-empresa"
                  onClick={() => handleSwitchProfile(primaryManagementRole || 'admin_empresa')}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors",
                    isPerfilEmpresa ? "bg-accent/80 font-medium" : "hover:bg-accent/50"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground">Perfil da Empresa</span>
                      {isPerfilEmpresa && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Painel administrativo, gestão de equipe e relatórios
                    </p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="profile-option-pessoal"
                  onClick={() => handleSwitchProfile('colaborador')}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors mt-1",
                    isMeuPerfil ? "bg-accent/80 font-medium" : "hover:bg-accent/50"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground">Meu Perfil</span>
                      {isMeuPerfil && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Minhas férias, minhas tarefas, avaliações
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              data-testid="profile-fixed-badge"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-sidebar-border/40 bg-[hsl(var(--sidebar-accent))]/20 select-none"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0",
                  isPerfilEmpresa
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                )}
              >
                {isPerfilEmpresa ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-sidebar-foreground truncate block">
                  {isPerfilEmpresa ? "Perfil da Empresa" : "Meu Perfil"}
                </span>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">
                  {isPerfilEmpresa ? "Painel administrativo" : "Painel pessoal"}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 pb-3 flex justify-center">
          {isMultiPerfil ? (
            <DropdownMenu>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid="profile-switcher-collapsed-trigger"
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-colors border cursor-pointer",
                        isPerfilEmpresa
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                      )}
                    >
                      {isPerfilEmpresa ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isPerfilEmpresa ? "Perfil da Empresa (Clique para alternar)" : "Meu Perfil (Clique para alternar)"}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" className="w-[230px] p-1.5 shadow-lg">
                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1">
                  Alternar Perfil
                </DropdownMenuLabel>
                <DropdownMenuItem
                  data-testid="profile-collapsed-option-empresa"
                  onClick={() => handleSwitchProfile(primaryManagementRole || 'admin_empresa')}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors",
                    isPerfilEmpresa ? "bg-accent/80 font-medium" : "hover:bg-accent/50"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground">Perfil da Empresa</span>
                      {isPerfilEmpresa && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Painel administrativo, gestão de equipe e relatórios
                    </p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="profile-collapsed-option-pessoal"
                  onClick={() => handleSwitchProfile('colaborador')}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors mt-1",
                    isMeuPerfil ? "bg-accent/80 font-medium" : "hover:bg-accent/50"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground">Meu Perfil</span>
                      {isMeuPerfil && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Minhas férias, minhas tarefas, avaliações
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  data-testid="profile-collapsed-fixed-badge"
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border",
                    isPerfilEmpresa
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  )}
                >
                  {isPerfilEmpresa ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isPerfilEmpresa ? "Perfil da Empresa" : "Meu Perfil"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

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
      {isDenunciasVisible && (
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
      )}

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
