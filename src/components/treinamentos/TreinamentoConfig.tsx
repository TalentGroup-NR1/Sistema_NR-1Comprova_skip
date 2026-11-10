import { useState } from "react";
import { ArrowLeft, Save, Eye, Settings, FileQuestion, FileText, CheckCircle, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Treinamento, usePublicarTreinamento, useUpdateTreinamento } from "@/hooks/useTreinamentos";
import { TreinamentoConteudoTab } from "./config/TreinamentoConteudoTab";
import { TreinamentoConfiguracoesTab } from "./config/TreinamentoConfiguracoesTab";
import { TreinamentoQuizTab } from "./config/TreinamentoQuizTab";
import { CurriculoManager } from "./config/CurriculoManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  publicado: { label: "Publicado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  arquivado: { label: "Arquivado", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

interface TreinamentoConfigProps {
  treinamento: Treinamento;
  onBack: () => void;
}

export function TreinamentoConfig({ treinamento, onBack }: TreinamentoConfigProps) {
  const [activeTab, setActiveTab] = useState("conteudo");
  const publicarTreinamento = usePublicarTreinamento();
  const updateTreinamento = useUpdateTreinamento();

  const statusInfo = statusConfig[treinamento.status];

  const handlePublicar = async () => {
    await publicarTreinamento.mutateAsync(treinamento.id);
  };

  const handleArquivar = async () => {
    await updateTreinamento.mutateAsync({
      id: treinamento.id,
      status: 'arquivado',
    });
  };

  const handleDesarquivar = async () => {
    await updateTreinamento.mutateAsync({
      id: treinamento.id,
      status: 'rascunho',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{treinamento.titulo}</h1>
              <Badge className={statusInfo.className} variant="outline">
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {treinamento.categoria?.nome || "Sem categoria"} • Criado em {format(new Date(treinamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {treinamento.status === 'arquivado' ? (
            <Button variant="outline" onClick={handleDesarquivar}>
              Desarquivar
            </Button>
          ) : treinamento.status === 'publicado' ? (
            <Button variant="outline" onClick={handleArquivar}>
              Arquivar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleArquivar}>
                Arquivar
              </Button>
              <Button onClick={handlePublicar} disabled={publicarTreinamento.isPending}>
                <Eye className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conteudo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="curriculo" className="flex items-center gap-2">
            <LayoutList className="h-4 w-4" />
            Currículo
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Quiz
            {treinamento.quiz_obrigatorio && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="mt-6">
          <TreinamentoConteudoTab treinamento={treinamento} />
        </TabsContent>

        <TabsContent value="curriculo" className="mt-6">
          <CurriculoManager treinamento={treinamento} />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          <TreinamentoConfiguracoesTab treinamento={treinamento} />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <TreinamentoQuizTab treinamento={treinamento} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
