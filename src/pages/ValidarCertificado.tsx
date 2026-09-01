import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, CheckCircle, XCircle, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useValidateCertificate } from "@/hooks/useCertificates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ValidarCertificado() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  
  const [inputCode, setInputCode] = useState(codeFromUrl || "");
  const [searchCode, setSearchCode] = useState(codeFromUrl || "");

  const { data: validationResult, isLoading, isError } = useValidateCertificate(searchCode);

  useEffect(() => {
    if (codeFromUrl) {
      setInputCode(codeFromUrl);
      setSearchCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const handleSearch = () => {
    if (inputCode.trim()) {
      setSearchCode(inputCode.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Validação de Certificado</h1>
          <p className="text-slate-600 mt-2">
            Digite o código do certificado para verificar sua autenticidade
          </p>
        </div>

        {/* Search Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: CERT-2026-A1B2C3D4"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="font-mono"
              />
              <Button onClick={handleSearch} disabled={!inputCode.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Card */}
        {searchCode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resultado da Validação</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isError || !validationResult ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-700">Certificado não encontrado</h3>
                  <p className="text-slate-600 mt-2">
                    O código informado não corresponde a nenhum certificado válido em nosso sistema.
                  </p>
                </div>
              ) : validationResult.is_valid ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-700">Certificado Válido</h3>
                  </div>

                  <div className="space-y-4 bg-slate-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-slate-500">Colaborador</p>
                      <p className="font-semibold text-slate-900">{validationResult.colaborador_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Treinamento</p>
                      <p className="font-semibold text-slate-900">{validationResult.treinamento_titulo}</p>
                    </div>
                    {validationResult.carga_horaria > 0 && (
                      <div>
                        <p className="text-sm text-slate-500">Carga Horária</p>
                        <p className="font-semibold text-slate-900">
                          {validationResult.carga_horaria} hora{validationResult.carga_horaria > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-500">Data de Conclusão</p>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(validationResult.data_conclusao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Data de Emissão</p>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(validationResult.issue_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-700">Certificado Revogado</h3>
                  <p className="text-slate-600 mt-2">
                    Este certificado foi revogado e não é mais válido.
                  </p>
                  <Badge variant="outline" className="mt-4 bg-red-50 text-red-700 border-red-200">
                    Status: Revogado
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          Sistema de validação de certificados de treinamento
        </p>
      </div>
    </div>
  );
}
