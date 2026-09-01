import { useState } from "react";
import { sanitizeRichText } from "@/lib/sanitize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useComunicados,
  type ComunicadoWithAnexos 
} from "@/hooks/useComunicados";
import { useColaboradores } from "@/hooks/useColaboradores";
import { 
  Send,
  MessageCircle,
  Mail,
  Users,
  Copy,
  ExternalLink,
  Loader2,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getShareBaseUrl } from '@/lib/appUrl';

export function EnvioComunicados() {
  const { data: comunicados, isLoading: loadingComunicados } = useComunicados();
  const { data: colaboradores, isLoading: loadingColaboradores } = useColaboradores();
  const { toast } = useToast();
  
  const [selectedComunicadoId, setSelectedComunicadoId] = useState<string>("");
  const [whatsappLinks, setWhatsappLinks] = useState<{ nome: string; telefone: string; link: string }[]>([]);

  const publishedComunicados = comunicados?.filter(c => c.status === 'publicado') || [];
  const selectedComunicado = publishedComunicados.find(c => c.id === selectedComunicadoId);

  const getTargetColaboradores = () => {
    if (!selectedComunicado || !colaboradores) return [];
    
    return colaboradores.filter(c => {
      if (c.status !== 'ATIVO') return false;
      if (selectedComunicado.publico_alvo_tipo === 'todos') return true;
      if (selectedComunicado.publico_alvo_tipo === 'departamento') {
        return c.department === selectedComunicado.publico_alvo_valor;
      }
      if (selectedComunicado.publico_alvo_tipo === 'cargo') {
        return c.job_title === selectedComunicado.publico_alvo_valor;
      }
      return false;
    });
  };

  const targetColaboradores = getTargetColaboradores();

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const generateWhatsAppLinks = () => {
    if (!selectedComunicado) return;
    
    const baseUrl = getShareBaseUrl();
    const comunicadoUrl = `${baseUrl}/comunicados/${selectedComunicado.id}`;
    const plainContent = stripHtml(selectedComunicado.conteudo).substring(0, 200);
    
    const links = targetColaboradores
      .filter(c => c.phone)
      .map(c => {
        const phone = c.phone?.replace(/\D/g, '') || '';
        const message = encodeURIComponent(
          `📢 *${selectedComunicado.titulo}*\n\n${plainContent}...\n\n🔗 Leia mais: ${comunicadoUrl}`
        );
        return {
          nome: c.full_name,
          telefone: c.phone || '',
          link: `https://wa.me/55${phone}?text=${message}`,
        };
      });

    setWhatsappLinks(links);
    toast({
      title: `${links.length} links gerados`,
      description: "Links do WhatsApp prontos para envio",
    });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!" });
  };

  const copyAllLinks = () => {
    const text = whatsappLinks.map(l => `${l.nome}: ${l.link}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Todos os links copiados!" });
  };

  const isLoading = loadingComunicados || loadingColaboradores;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Comunicado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione o comunicado</label>
            <Select value={selectedComunicadoId} onValueChange={setSelectedComunicadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um comunicado publicado" />
              </SelectTrigger>
              <SelectContent>
                {publishedComunicados.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedComunicado && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedComunicado.titulo}</h3>
                <div 
                  className="text-sm text-muted-foreground line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(selectedComunicado.conteudo) }}
                />
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {targetColaboradores.length} destinatários
                  </Badge>
                  <Badge variant="outline">
                    {selectedComunicado.publico_alvo_tipo === 'todos' 
                      ? 'Todos os colaboradores' 
                      : `${selectedComunicado.publico_alvo_tipo}: ${selectedComunicado.publico_alvo_valor}`}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-success/10">
                        <MessageCircle className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold">WhatsApp</h4>
                        <p className="text-xs text-muted-foreground">Gerar links individuais</p>
                      </div>
                    </div>
                    <Button 
                      onClick={generateWhatsAppLinks} 
                      className="w-full"
                      variant="outline"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Gerar Links WhatsApp
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">E-mail</h4>
                        <p className="text-xs text-muted-foreground">Envio automático</p>
                      </div>
                    </div>
                    <Button className="w-full" disabled>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar por E-mail
                      <Badge variant="secondary" className="ml-2 text-xs">Em breve</Badge>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {whatsappLinks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              Links do WhatsApp ({whatsappLinks.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={copyAllLinks}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {whatsappLinks.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.telefone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyLink(item.link)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(item.link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
