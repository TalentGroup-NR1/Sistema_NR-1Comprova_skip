import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAplicacaoConcluida, isNaoConforme } from "./api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export function LaudoAep({ aplicacaoId, onBack }: { aplicacaoId: string, onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      const appData = await getAplicacaoConcluida(aplicacaoId);
      setData(appData);

      if (appData?.respostas) {
        // Obter URLs assinadas para fotos
        const urls: Record<string, string> = {};
        for (const resp of appData.respostas) {
          if (resp.fotos && resp.fotos.length > 0) {
            for (const f of resp.fotos) {
              const { data: urlData } = await supabase.storage
                .from("checklist-fotos")
                .createSignedUrl(f.url_foto, 3600);
              if (urlData?.signedUrl) {
                urls[f.id] = urlData.signedUrl;
              }
            }
          }
        }
        setSignedUrls(urls);
      }
      setLoading(false);
    }
    loadData();
  }, [aplicacaoId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div>Erro ao carregar o laudo.</div>;
  }

  const respostas = data.respostas || [];
  
  // Separar em conformes e não conformes
  const ncs = [];
  const conformes = [];

  for (const resp of respostas) {
    const isNC = isNaoConforme(
      resp.resposta_valor,
      resp.observacao_especifica,
      resp.pergunta?.tipo_resposta || 'C_NC_NA',
      resp.pergunta?.obrigatoria || false
    );
    if (isNC) ncs.push(resp);
    else conformes.push(resp);
  }

  const templateNome = respostas[0]?.pergunta?.secao?.template?.nome || "Checklist";

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white min-h-screen">
      {/* Header com botões - oculto na impressão */}
      <div className="print:hidden flex justify-between items-center mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={() => window.print()} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Printer className="mr-2 h-4 w-4" /> Imprimir Laudo
        </Button>
      </div>

      {/* Cabeçalho do Laudo */}
      <div className="border-b pb-6 mb-6">
        <h1 className="text-3xl font-bold mb-2 uppercase text-center text-slate-800">Laudo de Inspeção - AEP</h1>
        <h2 className="text-xl text-slate-500 text-center mb-6">{templateNome}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Data da Aplicação:</span>
            {format(new Date(data.created_at), "dd/MM/yyyy HH:mm")}
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Status:</span>
            <Badge variant="outline" className="uppercase">{data.status}</Badge>
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Tipo:</span>
            <span className="uppercase font-medium">{data.tipo_aplicacao}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Alvo Avaliado:</span>
            {data.tipo_aplicacao === "ghe" ? data.ghe_id : data.posto_trabalho}
          </div>
        </div>
      </div>

      {/* Resumo Quantitativo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-green-50 border-green-200 shadow-sm print:shadow-none">
          <CardHeader className="py-4">
            <CardTitle className="text-green-700 flex items-center text-lg">
              <CheckCircle className="mr-2 h-5 w-5" /> Itens Conformes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-green-700">{conformes.length}</span>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200 shadow-sm print:shadow-none">
          <CardHeader className="py-4">
            <CardTitle className="text-red-700 flex items-center text-lg">
              <AlertTriangle className="mr-2 h-5 w-5" /> Não-Conformidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-red-700">{ncs.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Desvios */}
      {ncs.length > 0 && (
        <div className="mb-8 print:break-inside-avoid">
          <h3 className="text-xl font-bold mb-4 flex items-center text-red-700 border-b border-red-200 pb-2">
            <AlertTriangle className="mr-2 h-5 w-5" /> Registro de Desvios (Não-Conformidades)
          </h3>
          
          <div className="space-y-6">
            {ncs.map((nc, idx) => (
              <Card key={nc.id} className="border-red-100 shadow-sm print:shadow-none print:border-gray-300">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Item {idx + 1} - Pergunta</span>
                        <p className="font-medium mt-1 text-slate-800">{nc.pergunta?.texto}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {nc.pergunta?.referencia_legal && (
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Ref. Legal</span>
                            <p className="text-sm mt-1 font-medium">{nc.pergunta.referencia_legal}</p>
                          </div>
                        )}
                        {nc.pergunta?.perigo && (
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Perigo / Risco</span>
                            <p className="text-sm mt-1 text-red-600 font-medium">
                              {nc.pergunta.perigo.nome} ({nc.pergunta.perigo.categoria})
                            </p>
                          </div>
                        )}
                      </div>

                      {nc.observacao_especifica && (
                        <div className="bg-orange-50 p-3 rounded-md text-sm border border-orange-100">
                          <span className="font-bold text-orange-800 block mb-1">Observação do Avaliador:</span>
                          <span className="text-orange-900">{nc.observacao_especifica}</span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-400 mb-2">Evidência Fotográfica</span>
                      {nc.fotos && nc.fotos.length > 0 && signedUrls[nc.fotos[0].id] ? (
                        <img 
                          src={signedUrls[nc.fotos[0].id]} 
                          alt="Evidência fotográfica da NC" 
                          className="max-h-36 w-full object-cover rounded-md border shadow-sm print:max-h-48"
                        />
                      ) : (
                        <div className="h-32 w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md">
                          <span className="text-sm text-slate-400 italic">Sem foto registrada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="mt-12 text-center text-sm text-slate-400 print:mt-16 print:border-t print:pt-4">
        Documento gerado eletronicamente pelo Sistema NR1 Pronto em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}.
      </div>
    </div>
  );
}
