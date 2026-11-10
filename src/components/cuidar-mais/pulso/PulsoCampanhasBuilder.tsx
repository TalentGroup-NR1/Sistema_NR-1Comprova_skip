import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Settings,
  Trash2,
  Power,
  PowerOff,
  Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  usePulseCampaigns,
  useDeleteCampaign,
  useToggleCampaignActive,
  PulseCampaign,
} from "@/hooks/usePulseCampaigns";
import { PulsoCampanhaFormDialog } from "./PulsoCampanhaFormDialog";
import { InsightsCards } from "./InsightsCards";
import { useGerarCampanhasAno } from "@/hooks/useCuidarInsights";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export function PulsoCampanhasBuilder() {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PulseCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<PulseCampaign | null>(null);

  const { data: campaigns, isLoading, isError, error } = usePulseCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const toggleActive = useToggleCampaignActive();
  const gerarAno = useGerarCampanhasAno();
  const companyId = useEffectiveCompanyId();

  const filteredCampaigns = campaigns?.filter((c) =>
    c.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const getCampaignStatus = (campaign: PulseCampaign) => {
    const now = new Date();
    const inicio = parseISO(campaign.data_inicio);
    const fim = parseISO(campaign.data_fim);

    if (!campaign.ativo) {
      return { label: "Inativa", variant: "secondary" as const };
    }
    if (now < inicio) {
      return { label: "Agendada", variant: "outline" as const };
    }
    if (now > fim) {
      return { label: "Encerrada", variant: "secondary" as const };
    }
    return { label: "Ativa", variant: "default" as const };
  };

  const handleDelete = async () => {
    if (!deletingCampaign) return;
    await deleteCampaign.mutateAsync(deletingCampaign.id);
    setDeletingCampaign(null);
  };

  const handleToggleActive = async (campaign: PulseCampaign) => {
    await toggleActive.mutateAsync({ id: campaign.id, ativo: !campaign.ativo });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <PowerOff className="h-5 w-5" />
            Erro ao carregar campanhas
          </CardTitle>
          <CardDescription className="text-red-600/80">
            {error instanceof Error ? error.message : "Ocorreu um erro inesperado ao buscar as campanhas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            Pode haver um problema de conexão ou atualização pendente no banco de dados. 
            Contate o suporte técnico se o problema persistir.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
      <InsightsCards />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Campanhas de Pulso
              </CardTitle>
              <CardDescription>
                Crie e gerencie campanhas de pesquisa de clima organizacional
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!companyId || gerarAno.isPending}
                onClick={() => companyId && gerarAno.mutate({ companyId, ano: new Date().getFullYear() })}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Gerar calendário do ano
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanhas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          {!filteredCampaigns || filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma campanha encontrada.</p>
              <p className="text-sm">Crie sua primeira campanha de pulso!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Público-alvo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const status = getCampaignStatus(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.titulo}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(campaign.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          {" - "}
                          {format(parseISO(campaign.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {campaign.audiencia_tipo === 'todos' ? (
                          <Badge variant="secondary" className="font-normal text-slate-500">Toda a empresa</Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="font-normal bg-slate-50">
                                  {campaign.alvos?.length || 0} depart.
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px] flex flex-wrap gap-1 p-2">
                                {campaign.alvos?.map((a: string) => (
                                  <Badge key={a} variant="secondary" className="text-[10px] font-normal">{a}</Badge>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Configurar"
                            onClick={() => setEditingCampaign(campaign)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={campaign.ativo ? "Desativar" : "Ativar"}
                            onClick={() => handleToggleActive(campaign)}
                          >
                            {campaign.ativo ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => setDeletingCampaign(campaign)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>



      {/* Dialog: Criar/Editar Campanha */}
      <PulsoCampanhaFormDialog
        open={isCreating || !!editingCampaign}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingCampaign(null);
          }
        }}
        campaign={editingCampaign}
      />

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{deletingCampaign?.titulo}"?
              Esta ação não pode ser desfeita e todas as respostas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
