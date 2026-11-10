import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Megaphone, TrendingUp, ClipboardList, Settings, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import { useAdminNotifications, useMarkAdminNotificationRead, useMarkAllAdminNotificationsRead } from "@/hooks/useAdminNotifications";
import { useMarkComunicadoAsRead } from "@/hooks/useDashboardComunicados";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  comunicado: Megaphone,
  promocao: TrendingUp,
  avaliacao: ClipboardList,
  sistema: Settings,
  contact_request: Inbox,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DrawerNotification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  priority: string;
  is_read: boolean;
  created_at: string;
  isAdmin?: boolean;
};

export function NotificationsDrawer({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const { data: adminNotifications } = useAdminNotifications();
  const userUnread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markAdminRead = useMarkAdminNotificationRead();
  const markAllAdminRead = useMarkAllAdminNotificationsRead();
  const markComunicadoRead = useMarkComunicadoAsRead();
  const [tab, setTab] = useState("todas");

  const all: DrawerNotification[] = useMemo(() => {
    const admin: DrawerNotification[] = (adminNotifications ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      action_url: "/admin-plataforma?tab=solicitacoes",
      priority: "high",
      is_read: n.is_read,
      created_at: n.created_at,
      isAdmin: true,
    }));
    return [...admin, ...((notifications ?? []) as DrawerNotification[])].sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [adminNotifications, notifications]);

  const adminUnread = (adminNotifications ?? []).filter((n) => !n.is_read).length;
  const unreadCount = userUnread + adminUnread;

  const filtered = tab === "nao_lidas" ? all.filter((n) => !n.is_read) : all;

  const handleMarkAll = () => {
    markAllRead.mutate();
    if (adminUnread > 0) markAllAdminRead.mutate();
  };

  const handleClick = (n: DrawerNotification) => {
    if (!n.is_read) {
      if (n.isAdmin) {
        markAdminRead.mutate(n.id);
      } else if (n.type === 'comunicado') {
        markComunicadoRead.mutate(n.id);
      } else {
        markRead.mutate(n.id);
      }
    }
    if (n.action_url) {
      navigate(n.action_url);
      onOpenChange(false);
    }
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg">Notificações</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={handleMarkAll}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="nao_lidas">
              Não lidas
              {unreadCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 mt-0 min-h-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma notificação</p>
                  <p className="text-xs mt-1">Você está em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map(n => {
                    const Icon = typeIcons[n.type] ?? Bell;
                    return (
                      <button
                        key={`${n.type}-${n.id}`}
                        onClick={() => handleClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-accent/50",
                          !n.is_read && "bg-accent/20"
                        )}
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          !n.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm truncate", !n.is_read && "font-semibold")}>
                              {n.title}
                            </p>
                            {n.priority === 'high' && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                Alta
                              </Badge>
                            )}
                          </div>
                          {n.message && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                            {n.action_url && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
