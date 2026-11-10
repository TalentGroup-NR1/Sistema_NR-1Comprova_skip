import { useState } from "react";
import { Award, Search, Download, Eye, Ban, FileSpreadsheet, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCertificates, useRevokeCertificate, getCertificateSignedUrl } from "@/hooks/useCertificates";
import { useTreinamentos } from "@/hooks/useTreinamentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getShareBaseUrl } from '@/lib/appUrl';

export function CertificatesPanel() {
  const [treinamentoFilter, setTreinamentoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchColaborador, setSearchColaborador] = useState("");
  const [revokeDialog, setRevokeDialog] = useState<{ id: string; nome: string } | null>(null);
  const [revokeMotivo, setRevokeMotivo] = useState("");

  const { data: treinamentos } = useTreinamentos();
  const { data: certificates, isLoading } = useCertificates({
    treinamentoId: treinamentoFilter !== "all" ? treinamentoFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as 'ativo' | 'revogado') : undefined,
  });
  const revokeCertificate = useRevokeCertificate();

  const filteredCertificates = certificates?.filter(cert => {
    if (!searchColaborador) return true;
    return cert.colaborador_nome?.toLowerCase().includes(searchColaborador.toLowerCase()) ||
           cert.colaborador?.full_name?.toLowerCase().includes(searchColaborador.toLowerCase());
  });

  const handleDownload = async (filePath: string | null) => {
    if (!filePath) {
      toast.error("Arquivo não disponível");
      return;
    }

    try {
      const signedUrl = await getCertificateSignedUrl(filePath);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        throw new Error("URL não disponível");
      }
    } catch (error) {
      toast.error("Erro ao baixar certificado");
    }
  };

  const handleRevoke = async () => {
    if (!revokeDialog || !revokeMotivo.trim()) return;

    await revokeCertificate.mutateAsync({
      certificateId: revokeDialog.id,
      motivo: revokeMotivo,
    });

    setRevokeDialog(null);
    setRevokeMotivo("");
  };

  const handleExportCSV = () => {
    if (!filteredCertificates?.length) return;

    const headers = ["Colaborador", "Departamento", "Treinamento", "Carga Horária", "Data Conclusão", "Data Emissão", "Emitido Por", "Código", "Status"];
    const rows = filteredCertificates.map(cert => [
      cert.colaborador_nome,
      cert.colaborador?.department || "",
      cert.treinamento_titulo,
      `${cert.carga_horaria}h`,
      format(new Date(cert.data_conclusao), "dd/MM/yyyy"),
      format(new Date(cert.issue_date), "dd/MM/yyyy"),
      cert.issued_by_type === 'admin' ? 'Admin/RH' : 'Colaborador',
      cert.certificate_code,
      cert.status === 'ativo' ? 'Ativo' : 'Revogado',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `certificados_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const copyValidationLink = (code: string) => {
    const url = `${getShareBaseUrl()}/validar-certificado?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de validação copiado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificados Emitidos
              </CardTitle>
              <CardDescription>
                Gerencie os certificados de conclusão de treinamentos
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV} disabled={!filteredCertificates?.length}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchColaborador}
                onChange={(e) => setSearchColaborador(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={treinamentoFilter} onValueChange={setTreinamentoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Treinamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os treinamentos</SelectItem>
                {treinamentos?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="revogado">Revogado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredCertificates?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum certificado encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Data Conclusão</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Emitido Por</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cert.colaborador_nome}</p>
                        {cert.colaborador?.department && (
                          <p className="text-sm text-muted-foreground">{cert.colaborador.department}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cert.treinamento_titulo}</TableCell>
                    <TableCell>
                      {format(new Date(cert.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(cert.issue_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cert.issued_by_type === 'admin' ? 'bg-blue-50 text-blue-700' : ''}>
                        {cert.issued_by_type === 'admin' ? 'Admin/RH' : 'Colaborador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{cert.certificate_code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={cert.status === 'ativo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                      }>
                        {cert.status === 'ativo' ? 'Ativo' : 'Revogado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(cert.file_path)}
                          title="Visualizar PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyValidationLink(cert.certificate_code)}
                          title="Copiar link de validação"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {cert.status === 'ativo' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeDialog({ id: cert.id, nome: cert.colaborador_nome })}
                            title="Revogar certificado"
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Revogação */}
      <Dialog open={!!revokeDialog} onOpenChange={() => setRevokeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar Certificado</DialogTitle>
            <DialogDescription>
              Você está prestes a revogar o certificado de <strong>{revokeDialog?.nome}</strong>.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da revogação *</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo da revogação..."
                value={revokeMotivo}
                onChange={(e) => setRevokeMotivo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialog(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevoke}
              disabled={!revokeMotivo.trim() || revokeCertificate.isPending}
            >
              {revokeCertificate.isPending ? "Revogando..." : "Revogar Certificado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
