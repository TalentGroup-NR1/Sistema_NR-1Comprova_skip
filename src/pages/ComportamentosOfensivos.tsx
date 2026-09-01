import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";
import {
  DenunciaStatus,
  useDenunciasAdmin,
} from "@/hooks/useDenuncias";
import { DenunciaDetailDialog } from "@/components/denuncias/DenunciaDetailDialog";
import { CategoriaOrigemBadges } from "@/components/denuncias/CategoriaOrigemBadges";
import { AlertaLegalCIPACModal } from "@/components/denuncias/AlertaLegalCIPACModal";
import {
  CATEGORIA_LABEL,
  CATEGORIA_OPTIONS,
  ORIGEM_LABEL,
  ORIGEM_OPTIONS,
} from "@/lib/cipaCategorias";

const STATUS_LABEL: Record<DenunciaStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
};

const STATUS_VARIANT: Record<DenunciaStatus, "default" | "secondary" | "outline"> = {
  novo: "default",
  em_analise: "secondary",
  concluido: "outline",
};

export default function ComportamentosOfensivos() {
  const { data, isLoading } = useDenunciasAdmin();
  const [statusFiltro, setStatusFiltro] = useState<DenunciaStatus | "todos">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<string>("todos");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const denuncias = useMemo(
    () => (data ?? []).filter((d) => d.tipo === "denuncia"),
    [data]
  );

  const lista = useMemo(() => {
    return denuncias.filter((d) => {
      if (statusFiltro !== "todos" && d.status !== statusFiltro) return false;
      if (categoriaFiltro !== "todos" && d.categoria_comportamento !== categoriaFiltro)
        return false;
      if (origemFiltro !== "todos" && d.origem_ofensa !== origemFiltro) return false;
      return true;
    });
  }, [denuncias, statusFiltro, categoriaFiltro, origemFiltro]);

  const selected = useMemo(
    () => denuncias.find((d) => d.id === selectedId) ?? null,
    [denuncias, selectedId]
  );

  const totaisCategoria = useMemo(() => {
    const m = new Map<string, number>();
    denuncias.forEach((d) => {
      const k = d.categoria_comportamento ?? "nao_informado";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [denuncias]);

  const totaisOrigem = useMemo(() => {
    const m = new Map<string, number>();
    denuncias.forEach((d) => {
      const k = d.origem_ofensa ?? "nao_informado";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [denuncias]);

  const handleRowClick = (id: string) => {
    const key = `cipa_alerta_ciente:${id}`;
    if (sessionStorage.getItem(key) === "1") {
      setSelectedId(id);
    } else {
      setPendingId(id);
    }
  };

  const handleCiente = () => {
    if (pendingId) {
      sessionStorage.setItem(`cipa_alerta_ciente:${pendingId}`, "1");
      setSelectedId(pendingId);
      setPendingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Relatório de Comportamentos Ofensivos</h1>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Aba isolada, restrita ao Comitê CIPA+A / RH. Reúne denúncias classificadas
              segundo COPSOQ II (Lei nº 14.457/2022). Os dados aqui não são misturados
              com clima organizacional, Diário de Bordo ou Fale Conosco geral.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Por tipo de comportamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CATEGORIA_OPTIONS.map((o) => (
                <div key={o.value} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{o.label}</span>
                  <Badge variant="outline">{totaisCategoria.get(o.value) ?? 0}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Por origem da ofensa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ORIGEM_OPTIONS.map((o) => (
                <div key={o.value} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{o.label}</span>
                  <Badge variant="outline">{totaisOrigem.get(o.value) ?? 0}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle>Relatos recebidos</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {CATEGORIA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as origens</SelectItem>
                  {ORIGEM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFiltro}
                onValueChange={(v) => setStatusFiltro(v as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lista.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum relato encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(d.id)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(d.criado_em), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.categoria_comportamento
                          ? CATEGORIA_LABEL[d.categoria_comportamento as keyof typeof CATEGORIA_LABEL] ?? "—"
                          : <span className="text-muted-foreground italic">Não informado</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.origem_ofensa
                          ? ORIGEM_LABEL[d.origem_ofensa as keyof typeof ORIGEM_LABEL] ?? "—"
                          : <span className="text-muted-foreground italic">Não informado</span>}
                      </TableCell>
                      <TableCell className="font-medium">{d.titulo}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.status]}>
                          {STATUS_LABEL[d.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DenunciaDetailDialog
          denuncia={selected}
          onOpenChange={(o) => !o && setSelectedId(null)}
          extraHeader={
            selected ? (
              <CategoriaOrigemBadges
                categoria={selected.categoria_comportamento}
                origem={selected.origem_ofensa}
              />
            ) : null
          }
        />

        <AlertaLegalCIPACModal open={!!pendingId} onCiente={handleCiente} />
      </div>
    </MainLayout>
  );
}
