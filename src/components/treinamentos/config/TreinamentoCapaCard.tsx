import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Treinamento, useUpdateTreinamento } from "@/hooks/useTreinamentos";
import { useUploadTreinamentoCapa } from "@/hooks/useTreinamentoStorage";
import { useCapaTreinamento, getFallbackGradient } from "../catalogo/capaUtils";

interface TreinamentoCapaCardProps {
  treinamento: Treinamento;
}

export function TreinamentoCapaCard({ treinamento }: TreinamentoCapaCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadCapa = useUploadTreinamentoCapa();
  const updateTreinamento = useUpdateTreinamento();
  const capaUrl = useCapaTreinamento(treinamento);
  const [destaque, setDestaque] = useState(treinamento.destaque);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const { filePath } = await uploadCapa.mutateAsync({ treinamentoId: treinamento.id, file });
    await updateTreinamento.mutateAsync({ id: treinamento.id, capa_path: filePath });
  };

  const handleRemover = async () => {
    await updateTreinamento.mutateAsync({ id: treinamento.id, capa_path: null });
  };

  const handleDestaque = async (value: boolean) => {
    setDestaque(value);
    await updateTreinamento.mutateAsync({ id: treinamento.id, destaque: value });
  };

  const isBusy = uploadCapa.isPending || updateTreinamento.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Capa e destaque
        </CardTitle>
        <CardDescription>
          A imagem de capa aparece no catálogo. Se não enviar, usamos a miniatura do YouTube (quando houver) ou um
          fundo colorido automático. JPG, PNG ou WEBP até 5MB — recomendado 1280x720.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted"
            style={!capaUrl ? { backgroundImage: getFallbackGradient(treinamento.id) } : undefined}
          >
            {capaUrl && (
              <img src={capaUrl} alt={`Capa atual de ${treinamento.titulo}`} className="h-full w-full object-cover" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {treinamento.capa_path ? "Trocar capa" : "Enviar capa"}
            </Button>
            {treinamento.capa_path && (
              <Button variant="ghost" onClick={handleRemover} disabled={isBusy}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover capa
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Exibir em destaque
            </Label>
            <p className="text-sm text-muted-foreground">
              Mostra este treinamento no banner principal do catálogo.
            </p>
          </div>
          <Switch checked={destaque} onCheckedChange={handleDestaque} disabled={isBusy} />
        </div>
      </CardContent>
    </Card>
  );
}
