import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Info, 
  CreditCard, 
  ExternalLink, 
  FileText, 
  PlayCircle,
  Download,
  Building2,
  Wallet,
  BookOpen,
  Lightbulb,
  FileSpreadsheet,
  Video,
  Link as LinkIcon
} from "lucide-react";
import { useBeneficioMateriais, BeneficioMaterial } from "@/hooks/useBeneficioMateriais";
import { getSignedMaterialUrl } from "@/hooks/useBeneficioStorage";

interface BeneficioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficio: {
    id: string;
    nome: string;
    descricao?: string | null;
    empresa?: string | null;
    instrucoes?: string | null;
    importancia?: string | null;
    link_externo?: string | null;
    imagem_capa?: string | null;
    categoria?: string | null;
    valor_mensal?: number | null;
    operadora_fornecedor?: string | null;
  } | null;
  atribuicao?: {
    numero_cartao?: string | null;
    data_inicio?: string;
    status?: string;
    tipo_atribuicao?: string;
  } | null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function BeneficioDetailModal({ 
  open, 
  onOpenChange, 
  beneficio,
  atribuicao 
}: BeneficioDetailModalProps) {
  const { data: materiais, isLoading: loadingMateriais } = useBeneficioMateriais(beneficio?.id || null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (materiais && materiais.length > 0) {
      const loadUrls = async () => {
        const urls: Record<string, string> = {};
        const errors: Record<string, boolean> = {};
        for (const material of materiais) {
          if (material.arquivo_url) {
            const url = await getSignedMaterialUrl(material.arquivo_url);
            if (url) urls[material.id] = url;
            else errors[material.id] = true;
          }
        }
        setSignedUrls(urls);
        setUrlErrors(errors);
      };
      loadUrls();
    }
  }, [materiais]);


  if (!beneficio) return null;

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const videoMateriais = materiais?.filter(m => m.tipo === 'video') || [];
  const pdfMateriais = materiais?.filter(m => m.tipo === 'pdf') || [];
  const pptMateriais = materiais?.filter(m => m.tipo === 'ppt') || [];
  const linkMateriais = materiais?.filter(m => m.tipo === 'link') || [];

  const MaterialIcon = ({ tipo }: { tipo: string }) => {
    switch (tipo) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'ppt': return <FileSpreadsheet className="h-5 w-5 text-orange-500" />;
      case 'video': return <Video className="h-5 w-5 text-blue-500" />;
      case 'link': return <LinkIcon className="h-5 w-5 text-green-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header com imagem */}
        <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-t-lg">
          {beneficio.imagem_capa ? (
            <img 
              src={beneficio.imagem_capa} 
              alt={beneficio.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Building2 className="h-20 w-20 text-white/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl md:text-3xl font-bold text-white mb-1">
                {beneficio.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {beneficio.empresa && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <Building2 className="h-4 w-4" />
                  {beneficio.empresa}
                </span>
              )}
              {beneficio.valor_mensal && (
                <Badge className="bg-white/20 text-white border-0">
                  <Wallet className="h-3 w-3 mr-1" />
                  {formatCurrency(beneficio.valor_mensal)}/mês
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">Informações</span>
              </TabsTrigger>
              <TabsTrigger value="acessar" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Acessar</span>
              </TabsTrigger>
              <TabsTrigger value="materiais" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Materiais</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Informações */}
            <TabsContent value="info" className="space-y-6">
              {beneficio.descricao && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Sobre o Benefício
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{beneficio.descricao}</p>
                </div>
              )}
              
              {beneficio.instrucoes && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    Como Usar
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{beneficio.instrucoes}</p>
                </div>
              )}
              
              {beneficio.importancia && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Por que é Importante
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{beneficio.importancia}</p>
                </div>
              )}

              {!beneficio.descricao && !beneficio.instrucoes && !beneficio.importancia && (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma informação adicional disponível.</p>
                </div>
              )}
            </TabsContent>



            {/* Aba Acessar */}
            <TabsContent value="acessar" className="space-y-4">
              {beneficio.link_externo ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <ExternalLink className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground mb-4">
                      Acesse o portal do benefício para consultar saldo, extratos e mais.
                    </p>
                    <Button asChild className="w-full sm:w-auto">
                      <a href={beneficio.link_externo} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Acessar Portal
                      </a>
                    </Button>
                    {beneficio.operadora_fornecedor && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Portal operado por: {beneficio.operadora_fornecedor}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum link externo disponível para este benefício.</p>
                </div>
              )}
            </TabsContent>

            {/* Aba Materiais */}
            <TabsContent value="materiais" className="space-y-6">
              {loadingMateriais ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : materiais && materiais.length > 0 ? (
                <div className="space-y-6">
                  {/* Links externos / YouTube */}
                  {linkMateriais.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <LinkIcon className="h-4 w-4 text-green-500" />
                        Links Externos ({linkMateriais.length})
                      </h4>
                      <div className="grid gap-4">
                        {linkMateriais.map((material) => {
                          const youtubeUrl = material.link_externo ? getYoutubeEmbedUrl(material.link_externo) : null;
                          return (
                            <Card key={material.id}>
                              <CardContent className="p-4">
                                <p className="font-medium mb-2">{material.titulo}</p>
                                {material.descricao && (
                                  <p className="text-sm text-muted-foreground mb-3">{material.descricao}</p>
                                )}
                                {youtubeUrl ? (
                                  <div className="aspect-video rounded-lg overflow-hidden">
                                    <iframe
                                      src={youtubeUrl}
                                      title={material.titulo}
                                      className="w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : material.link_externo ? (
                                  <Button asChild variant="outline" size="sm">
                                    <a href={material.link_externo} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Abrir link
                                    </a>
                                  </Button>
                                ) : null}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vídeos */}
                  {videoMateriais.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                        Vídeos ({videoMateriais.length})
                      </h4>
                      <div className="grid gap-4">
                        {videoMateriais.map((material) => (
                          <Card key={material.id}>
                            <CardContent className="p-4">
                              <p className="font-medium mb-2">{material.titulo}</p>
                              {material.descricao && (
                                <p className="text-sm text-muted-foreground mb-3">{material.descricao}</p>
                              )}
                              {signedUrls[material.id] ? (
                                <video 
                                  controls 
                                  className="w-full max-h-64 rounded-lg bg-black"
                                  preload="metadata"
                                >
                                  <source src={signedUrls[material.id]} type="video/mp4" />
                                  Seu navegador não suporta vídeos.
                                </video>
                              ) : urlErrors[material.id] ? (
                                <p className="text-sm text-muted-foreground border rounded-lg p-4">
                                  Vídeo indisponível no momento. Peça ao RH para reenviar o arquivo.
                                </p>
                              ) : (
                                <Skeleton className="w-full h-48" />
                              )}

                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDFs */}
                  {pdfMateriais.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-red-500" />
                        Documentos PDF ({pdfMateriais.length})
                      </h4>
                      <div className="grid gap-3">
                        {pdfMateriais.map((material) => (
                          <Card key={material.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <MaterialIcon tipo={material.tipo} />
                                <div>
                                  <p className="font-medium">{material.titulo}</p>
                                  {material.descricao && (
                                    <p className="text-sm text-muted-foreground">{material.descricao}</p>
                                  )}
                                </div>
                              </div>
                              {signedUrls[material.id] ? (
                                <Button asChild variant="outline" size="sm">
                                  <a href={signedUrls[material.id]} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar
                                  </a>
                                </Button>
                              ) : urlErrors[material.id] ? (
                                <span className="text-xs text-muted-foreground">Indisponível</span>
                              ) : null}

                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PPTs */}
                  {pptMateriais.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                        Apresentações ({pptMateriais.length})
                      </h4>
                      <div className="grid gap-3">
                        {pptMateriais.map((material) => (
                          <Card key={material.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <MaterialIcon tipo={material.tipo} />
                                <div>
                                  <p className="font-medium">{material.titulo}</p>
                                  {material.descricao && (
                                    <p className="text-sm text-muted-foreground">{material.descricao}</p>
                                  )}
                                </div>
                              </div>
                              {signedUrls[material.id] ? (
                                <Button asChild variant="outline" size="sm">
                                  <a href={signedUrls[material.id]} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar
                                  </a>
                                </Button>
                              ) : urlErrors[material.id] ? (
                                <span className="text-xs text-muted-foreground">Indisponível</span>
                              ) : null}

                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum material educativo disponível.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
