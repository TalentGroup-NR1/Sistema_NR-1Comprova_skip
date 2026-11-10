import { useState, useMemo } from "react";
import { Copy, Check, Send, Users, LinkIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useColaboradores } from "@/hooks/useColaboradores";
import { getShareBaseUrl } from '@/lib/appUrl';
import { 
  useQuestionariosCuidarPlus,
  useEnviosCuidarPlus,
  useBulkCreateEnviosCuidarPlus,
} from "@/hooks/useCuidarMaisQuestionarios";

export function EnvioQuestionarios() {
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<string>("");
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: questionarios, isLoading: loadingQuestionarios } = useQuestionariosCuidarPlus();
  const { data: colaboradores, isLoading: loadingColaboradores } = useColaboradores();
  const { data: envios, isLoading: loadingEnvios } = useEnviosCuidarPlus(selectedQuestionarioId || null);
  const bulkCreateEnvios = useBulkCreateEnviosCuidarPlus();

  const activeQuestionarios = questionarios?.filter(q => q.is_active) || [];
  const activeColaboradores = colaboradores?.filter(c => c.status === 'ATIVO') || [];

  const filteredColaboradores = useMemo(() => {
    return activeColaboradores.filter(c => 
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.corporate_email.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeColaboradores, search]);

  const enviosMap = useMemo(() => {
    const map = new Map<string, { token: string; status: string }>();
    envios?.forEach(e => {
      map.set(e.colaborador_id, { token: e.token, status: e.status });
    });
    return map;
  }, [envios]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToSelect = filteredColaboradores
        .filter(c => !enviosMap.has(c.id))
        .map(c => c.id);
      setSelectedColaboradores(idsToSelect);
    } else {
      setSelectedColaboradores([]);
    }
  };

  const handleSelectOne = (colaboradorId: string, checked: boolean) => {
    if (checked) {
      setSelectedColaboradores([...selectedColaboradores, colaboradorId]);
    } else {
      setSelectedColaboradores(selectedColaboradores.filter(id => id !== colaboradorId));
    }
  };

  const handleGerarLinks = () => {
    if (!selectedQuestionarioId || selectedColaboradores.length === 0) return;
    
    bulkCreateEnvios.mutate({
      questionario_id: selectedQuestionarioId,
      colaborador_ids: selectedColaboradores,
    }, {
      onSuccess: () => {
        setSelectedColaboradores([]);
      },
    });
  };

  const handleCopyLink = async (token: string) => {
    const link = `${getShareBaseUrl()}/cuidar-mais-form/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const availableForSelection = filteredColaboradores.filter(c => !enviosMap.has(c.id));
  const allSelected = availableForSelection.length > 0 && 
    availableForSelection.every(c => selectedColaboradores.includes(c.id));

  if (loadingQuestionarios) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enviar Questionários</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Questionários
          </CardTitle>
          <CardDescription>
            Gere links únicos para cada colaborador preencher o questionário de forma anônima
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione o Questionário Ativo</label>
            <Select value={selectedQuestionarioId} onValueChange={setSelectedQuestionarioId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um questionário..." />
              </SelectTrigger>
              <SelectContent>
                {activeQuestionarios.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum questionário ativo
                  </SelectItem>
                ) : (
                  activeQuestionarios.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.titulo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedQuestionarioId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Colaboradores Ativos
              </CardTitle>
              <Button 
                onClick={handleGerarLinks}
                disabled={selectedColaboradores.length === 0 || bulkCreateEnvios.isPending}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Gerar Links ({selectedColaboradores.length})
              </Button>
            </div>
            <CardDescription>
              Selecione os colaboradores para gerar links de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaboradores..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loadingColaboradores || loadingEnvios ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={availableForSelection.length === 0}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((colaborador) => {
                    const envio = enviosMap.get(colaborador.id);
                    const hasLink = !!envio;
                    
                    return (
                      <TableRow key={colaborador.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedColaboradores.includes(colaborador.id)}
                            onCheckedChange={(checked) => handleSelectOne(colaborador.id, !!checked)}
                            disabled={hasLink}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{colaborador.full_name}</p>
                            <p className="text-sm text-muted-foreground">{colaborador.corporate_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{colaborador.department || "-"}</TableCell>
                        <TableCell>
                          {hasLink ? (
                            <Badge 
                              variant={envio.status === 'RESPONDIDO' ? 'default' : 'secondary'}
                            >
                              {envio.status === 'RESPONDIDO' ? 'Respondido' : 'Pendente'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem link</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(envio.token)}
                              disabled={envio.status === 'RESPONDIDO'}
                            >
                              {copiedToken === envio.token ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
