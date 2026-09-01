import { Badge } from "@/components/ui/badge";
import {
  CATEGORIA_LABEL,
  ORIGEM_LABEL,
  type CategoriaComportamento,
  type OrigemOfensa,
} from "@/lib/cipaCategorias";

interface Props {
  categoria?: string | null;
  origem?: string | null;
}

export function CategoriaOrigemBadges({ categoria, origem }: Props) {
  if (!categoria && !origem) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {categoria && (
        <Badge variant="destructive" className="font-normal">
          {CATEGORIA_LABEL[categoria as CategoriaComportamento] ?? categoria}
        </Badge>
      )}
      {origem && (
        <Badge variant="secondary" className="font-normal">
          Origem: {ORIGEM_LABEL[origem as OrigemOfensa] ?? origem}
        </Badge>
      )}
    </div>
  );
}
