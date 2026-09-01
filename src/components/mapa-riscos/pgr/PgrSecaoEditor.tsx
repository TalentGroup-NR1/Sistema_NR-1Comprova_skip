import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/comunicados/RichTextEditor";
import { RotateCcw } from "lucide-react";
import { PGR_TEXTO_PADRAO } from "@/lib/pgrTextoPadrao";
import { PGR_TEXTO_PSICOSSOCIAL } from "@/lib/pgrTextoPsicossocial";
import type { PgrSecao } from "@/hooks/usePgrSecoes";

interface Props {
  secao: PgrSecao;
  onChange: (patch: Partial<PgrSecao>) => void;
}

function textoPadraoDe(numero: string | null): string | null {
  if (!numero) return null;
  const base =
    PGR_TEXTO_PADRAO.find((t) => t.numero === numero) ??
    PGR_TEXTO_PSICOSSOCIAL.find((t) => t.numero === numero);
  return base?.conteudo ?? null;
}

export function PgrSecaoEditor({ secao, onChange }: Props) {
  const [key, setKey] = useState(0);

  useEffect(() => setKey((k) => k + 1), [secao.id]);

  const padrao = textoPadraoDe(secao.numero);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1">
          <Label>Número</Label>
          <Input value={secao.numero ?? ""} onChange={(e) => onChange({ numero: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Título</Label>
          <Input value={secao.titulo} onChange={(e) => onChange({ titulo: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Conteúdo</Label>
          {padrao && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ conteudo: padrao });
                setKey((k) => k + 1);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Restaurar texto padrão
            </Button>
          )}
        </div>
        <RichTextEditor
          key={`${secao.id}-${key}`}
          content={secao.conteudo ?? ""}
          onChange={(html) => onChange({ conteudo: html })}
        />
      </div>
    </div>
  );
}
