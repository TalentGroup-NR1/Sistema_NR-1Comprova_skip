import { Link } from "react-router-dom";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalPageProps {
  title: string;
  version: string;
  sections: LegalSection[];
}

export function LegalPage({ title, version, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            NR1 Pronto
          </span>
          <Link
            to="/auth"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versão {version} · Última atualização em {LEGAL_LAST_UPDATED}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-2 space-y-3">
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t pt-6 text-xs text-muted-foreground">
          Conteúdo provisório, sujeito a substituição pela versão jurídica definitiva.
        </footer>
      </main>
    </div>
  );
}
