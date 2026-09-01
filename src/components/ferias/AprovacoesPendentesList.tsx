import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, Calendar as CalendarIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeriasPendentesAprovacao, useAprovarFeriasGozo } from "@/hooks/useFerias";
import { RecusarFeriasDialog } from "./RecusarFeriasDialog";

export function AprovacoesPendentesList() {
  const { data, isLoading } = useFeriasPendentesAprovacao();
  const aprovar = useAprovarFeriasGozo();
  const [recusarId, setRecusarId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Aprovações Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma solicitação pendente de aprovação</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.colaborador?.full_name}</TableCell>
                  <TableCell>{g.colaborador?.job_title}</TableCell>
                  <TableCell>{g.colaborador?.department}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(g.data_inicio_gozo), "dd/MM/yyyy", { locale: ptBR })} – {format(parseISO(g.data_fim_gozo), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{g.dias_gozados}</TableCell>
                  <TableCell>{format(parseISO(g.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(parseISO(g.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => aprovar.mutate(g.id)}
                        disabled={aprovar.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecusarId(g.id)}
                      >
                        <X className="h-4 w-4 mr-1 text-destructive" /> Recusar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <RecusarFeriasDialog open={!!recusarId} onOpenChange={(o) => !o && setRecusarId(null)} gozoId={recusarId} />
      </CardContent>
    </Card>
  );
}
