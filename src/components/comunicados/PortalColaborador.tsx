import { sanitizeRichText } from "@/lib/sanitize";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  usePublishedComunicados, 
  type ComunicadoWithAnexos 
} from "@/hooks/useComunicados";
import { 
  Pin,
  Calendar,
  FileText,
  Loader2,
  ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ComunicadoFlyerDetail } from "./ComunicadoFlyerDetail";

interface PortalColaboradorProps {
  colaboradorDepartment?: string;
  colaboradorJobTitle?: string;
}

export function PortalColaborador({ colaboradorDepartment, colaboradorJobTitle }: PortalColaboradorProps) {
  const { data: comunicados, isLoading } = usePublishedComunicados(colaboradorDepartment, colaboradorJobTitle);
  const [selectedComunicado, setSelectedComunicado] = useState<ComunicadoWithAnexos | null>(null);

  const pinnedComunicados = comunicados?.filter(c => c.is_pinned) || [];
  const regularComunicados = comunicados?.filter(c => !c.is_pinned) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pinned Section */}
      {pinnedComunicados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Pin className="h-4 w-4" />
            IMPORTANTES
          </h2>
          <div className="grid gap-4">
            {pinnedComunicados.map((comunicado) => (
              <ComunicadoCardPortal
                key={comunicado.id}
                comunicado={comunicado}
                onClick={() => setSelectedComunicado(comunicado)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Comunicados */}
      <div className="space-y-3">
        {pinnedComunicados.length > 0 && (
          <h2 className="text-sm font-semibold text-muted-foreground">RECENTES</h2>
        )}
        <div className="grid gap-4">
          {regularComunicados.map((comunicado) => (
            <ComunicadoCardPortal
              key={comunicado.id}
              comunicado={comunicado}
              onClick={() => setSelectedComunicado(comunicado)}
            />
          ))}
        </div>
        {comunicados?.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum comunicado disponível</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Flyer Detail Dialog */}
      <Dialog open={!!selectedComunicado} onOpenChange={() => setSelectedComunicado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedComunicado && (
            <ComunicadoFlyerDetail comunicado={selectedComunicado} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ComunicadoCardPortalProps {
  comunicado: ComunicadoWithAnexos;
  onClick: () => void;
}

function ComunicadoCardPortal({ comunicado, onClick }: ComunicadoCardPortalProps) {
  const formattedDate = comunicado.data_publicacao 
    ? format(new Date(comunicado.data_publicacao), "dd/MM/yyyy", { locale: ptBR })
    : '';

  return (
    <Card 
      className={`shadow-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${comunicado.is_pinned ? 'border-l-4 border-l-warning' : ''}`}
      onClick={onClick}
    >
      {comunicado.image_url && (
        <div className="w-full h-40 overflow-hidden">
          <SignedComunicadoImg
            src={comunicado.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {comunicado.is_pinned && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <Pin className="h-3 w-3 mr-1" />
                  Importante
                </Badge>
              )}
              {comunicado.comunicados_anexos && comunicado.comunicados_anexos.length > 0 && (
                <Badge variant="outline">
                  {comunicado.comunicados_anexos.length} anexo(s)
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-2">{comunicado.titulo}</h3>
            <div 
              className="text-sm text-muted-foreground mb-3 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(comunicado.conteudo) }}
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {comunicado.autor_nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {comunicado.autor_nome}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
