import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EvidenciaRecord {
  id: string;
  hash: string;
  emitido_em: string;
  pgr_importacoes: {
    arquivo_nome: string;
  } | null;
  companies: {
    name: string;
    cnpj: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

export default function Evidencias() {
  const [searchParams] = useSearchParams();
  const verificarId = searchParams.get("verificar");
  
  const [loading, setLoading] = useState(true);
  const [registro, setRegistro] = useState<EvidenciaRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validarEvidencia() {
      if (!verificarId) {
        setLoading(false);
        return;
      }

      // O QR payload é: TALENT-EVID|PGR_EXEC|${docId}|${hashCurto}|${baseUrl}/evidencias?verificar=${docId}
      try {
        const { data, error } = await supabase
          .from("pgr_relatorio_evidencias")
          .select(`
            id, hash, emitido_em,
            pgr_importacoes ( arquivo_nome ),
            companies ( name, cnpj ),
            profiles:emitido_por ( full_name )
          `)
          .eq("doc_id", verificarId)
          .single();

        if (error || !data) {
          setError(error?.message || "Registro não encontrado");
        } else {
          setRegistro(data as unknown as EvidenciaRecord);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    validarEvidencia();
  }, [verificarId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Validação de Evidência PGR</CardTitle>
          <CardDescription>Consulta pública de autenticidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex flex-col items-center text-center">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : error ? (
            <>
              <XCircle className="w-16 h-16 text-red-500 mb-2" />
              <p className="text-red-700 font-medium">Documento não encontrado ou inválido</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : registro ? (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-2" />
              <p className="text-emerald-700 font-medium">Documento Autêntico e Íntegro</p>
              
              <div className="text-left w-full space-y-2 mt-4 text-sm bg-muted p-4 rounded-md">
                <p><strong>Empresa:</strong> {registro.companies?.name}</p>
                <p><strong>CNPJ:</strong> {registro.companies?.cnpj}</p>
                <p><strong>Arquivo PGR:</strong> {registro.pgr_importacoes?.arquivo_nome}</p>
                <p><strong>Emitido em:</strong> {format(new Date(registro.emitido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                <p><strong>Emitido por:</strong> {registro.profiles?.full_name}</p>
                <p className="break-all mt-2 text-xs text-muted-foreground"><strong>Hash:</strong><br/>{registro.hash}</p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Forneça um ID ou Hash válido na URL para verificação.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
