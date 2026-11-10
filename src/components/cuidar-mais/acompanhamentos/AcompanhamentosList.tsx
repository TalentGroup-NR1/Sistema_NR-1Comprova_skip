import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Plus, Calendar, User } from "lucide-react";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Tipos
import { AcompanhamentoForm } from "./AcompanhamentoForm";

export type AcompanhamentoStatus = 'novo' | 'em_andamento' | 'aguardando_retorno' | 'concluido' | 'arquivado';

interface Acompanhamento {
  id: string;
  status: AcompanhamentoStatus;
  created_at: string;
  proximo_contato_em: string | null;
  objetivo: string | null;
  acoes: string[];
  anotacoes: string | null;
  resultado: string | null;
  colaborador_id: string;
  resposta_id: string | null;
  colaboradores: {
    full_name: string;
    job_title: string | null;
    department: string | null;
  } | null;
  responsavel_id: string;
}

const STATUS_CONFIG: Record<AcompanhamentoStatus, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  aguardando_retorno: { label: 'Aguardando', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800 border-green-200' },
  arquivado: { label: 'Arquivado', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export function AcompanhamentosList() {
  const companyId = useEffectiveCompanyId();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAcomp, setSelectedAcomp] = useState<Acompanhamento | null>(null);

  const { data: acompanhamentos, isLoading, refetch } = useQuery({
    queryKey: ["pulse-acompanhamentos", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("pulse_acompanhamentos")
        .select(`
          id, status, created_at, proximo_contato_em, responsavel_id,
          objetivo, acoes, anotacoes, resultado, colaborador_id, resposta_id,
          colaboradores (full_name, job_title, department)
        `)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Erro ao buscar acompanhamentos:", error);
        throw error;
      }
      return (data as any[]) || [];
    },
    enabled: !!companyId,
  });

  const filteredData = acompanhamentos?.filter((item) => {
    const matchesSearch = item.colaboradores?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenNew = () => {
    setSelectedAcomp(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (acomp: Acompanhamento) => {
    setSelectedAcomp(acomp);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar colaborador..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="aguardando_retorno">Aguardando</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2" onClick={handleOpenNew}>
              <Plus className="h-4 w-4" />
              Novo acompanhamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAcomp ? "Editar Acompanhamento" : "Novo Acompanhamento"}</DialogTitle>
            </DialogHeader>
            <AcompanhamentoForm 
              initialData={selectedAcomp} 
              onSuccess={handleSuccess} 
              onCancel={() => setIsDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredData?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhum acompanhamento encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Nenhum acompanhamento ainda — crie o primeiro a partir de uma resposta de pulso ou utilize o botão "Novo acompanhamento".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredData?.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status as AcompanhamentoStatus] || STATUS_CONFIG.novo;
            return (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => handleOpenEdit(item)}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {item.colaboradores?.full_name || "Colaborador desconhecido"}
                      </span>
                      <Badge variant="outline" className={cn(statusConfig.color, "border font-normal")}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>{item.colaboradores?.job_title || "-"}</span>
                      <span>{item.colaboradores?.department || "-"}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end justify-center text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Criado em: {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </span>
                    </div>
                    {item.proximo_contato_em && (
                      <div className="flex items-center gap-1.5 text-primary/80 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Próx. Contato: {item.proximo_contato_em ? format(new Date(item.proximo_contato_em), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
