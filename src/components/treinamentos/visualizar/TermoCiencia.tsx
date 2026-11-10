import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, FileText } from "lucide-react";
import { useAceitarTermo, TreinamentoProgresso } from "@/hooks/useTreinamentoProgresso";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TermoCienciaProps {
  progressoId: string;
  treinamentoId: string;
  progresso: TreinamentoProgresso;
  textoTermo?: string | null;
  onTermoAceito: () => void;
}

const TEXTO_TERMO_PADRAO = `Declaro que li integralmente o conteúdo deste treinamento, compreendi as informações apresentadas e estou ciente das minhas responsabilidades e obrigações relacionadas ao tema abordado.

Assumo o compromisso de aplicar os conhecimentos adquiridos em minhas atividades profissionais e de buscar esclarecimentos adicionais junto ao meu gestor ou ao departamento de Recursos Humanos, caso necessário.

Reconheço que este registro serve como evidência de minha participação e conclusão do treinamento para fins de auditoria e compliance.`;

export function TermoCiencia({ 
  progressoId, 
  treinamentoId, 
  progresso, 
  textoTermo,
  onTermoAceito 
}: TermoCienciaProps) {
  const [aceito, setAceito] = useState(false);
  const aceitarTermo = useAceitarTermo();

  const textoExibir = textoTermo || TEXTO_TERMO_PADRAO;

  // Se já aceitou o termo
  if (progresso.termo_aceito) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Termo de ciência aceito</p>
              <p className="text-sm text-green-600">
                Aceito em: {progresso.termo_aceito_em 
                  ? format(new Date(progresso.termo_aceito_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Data não registrada"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAceitarTermo = async () => {
    if (!aceito) return;

    try {
      await aceitarTermo.mutateAsync({
        progressoId,
        treinamentoId,
      });
      onTermoAceito();
    } catch (error) {
      console.error("Erro ao aceitar termo:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Termo de Ciência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
          <p className="text-sm whitespace-pre-line">{textoExibir}</p>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg bg-background">
          <Checkbox 
            id="termo-aceite" 
            checked={aceito}
            onCheckedChange={(checked) => setAceito(checked === true)}
          />
          <Label 
            htmlFor="termo-aceite" 
            className="text-sm leading-relaxed cursor-pointer"
          >
            Li e compreendi o conteúdo deste treinamento. Concordo com os termos acima e confirmo minha ciência sobre as informações apresentadas.
          </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAceitarTermo}
          disabled={!aceito || aceitarTermo.isPending}
          className="w-full"
        >
          {aceitarTermo.isPending ? "Registrando..." : "Confirmar Aceite"}
        </Button>
      </CardFooter>
    </Card>
  );
}
