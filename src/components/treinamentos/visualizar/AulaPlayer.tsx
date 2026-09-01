import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TreinamentoAula } from "@/hooks/useTreinamentoCurriculo";
import { getSignedUrlTreinamento, isStoragePath } from "@/hooks/useTreinamentoStorage";
import { Download, ExternalLink, FileType2, AlertTriangle } from "lucide-react";

interface Props {
  aula: TreinamentoAula;
}

export function AulaPlayer({ aula }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFile = isStoragePath(aula.url_conteudo);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSignedUrl(null);
      if (!isFile || !aula.url_conteudo) return;
      setLoading(true);
      const url = await getSignedUrlTreinamento(aula.url_conteudo);
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [aula.id, aula.url_conteudo, isFile]);

  if (aula.tipo === "texto") {
    return (
      <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-xl border bg-card p-6">
        {aula.url_conteudo || "Sem conteúdo."}
      </div>
    );
  }

  if (aula.tipo === "link") {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <p className="text-muted-foreground">Esta aula é um conteúdo externo.</p>
        <Button asChild>
          <a href={aula.url_conteudo || "#"} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Acessar conteúdo
          </a>
        </Button>
      </div>
    );
  }

  if (aula.tipo === "video") {
    if (isFile) {
      return (
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando vídeo...</div>
          ) : signedUrl ? (
            <video src={signedUrl} controls className="h-full w-full" controlsList="nodownload" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Não foi possível carregar o vídeo.
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-muted">
        <iframe
          src={(aula.url_conteudo || "").replace("watch?v=", "embed/")}
          className="h-full w-full"
          allowFullScreen
          title={aula.titulo}
        />
      </div>
    );
  }

  if (aula.tipo === "pdf") {
    return (
      <div className="space-y-3">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando documento...</div>
          ) : signedUrl ? (
            <iframe src={`${signedUrl}#toolbar=1`} className="h-full w-full" title={aula.titulo} />
          ) : aula.url_conteudo ? (
            <iframe src={aula.url_conteudo} className="h-full w-full" title={aula.titulo} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem documento.</div>
          )}
        </div>
        <Button variant="outline" onClick={() => window.open(signedUrl || aula.url_conteudo || "#", "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Baixar material
        </Button>
      </div>
    );
  }

  if (aula.tipo === "ppt") {
    return (
      <div className="rounded-xl border bg-muted/40 p-8 text-center space-y-3">
        <FileType2 className="mx-auto h-12 w-12 text-orange-500" />
        <p className="text-sm text-muted-foreground">{aula.nome_arquivo || "Apresentação"}</p>
        <Button onClick={() => window.open(signedUrl || aula.url_conteudo || "#", "_blank")} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Baixar apresentação
        </Button>
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>Tipo de conteúdo não suportado.</AlertDescription>
    </Alert>
  );
}
