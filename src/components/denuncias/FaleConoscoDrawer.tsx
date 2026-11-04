import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquareText,
  Lightbulb,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  useCriarFaleConosco,
  type FaleConoscoItemTipo,
} from "@/hooks/useFaleConosco";
import { cn } from "@/lib/utils";
import { CanalDenunciaModal } from "./CanalDenunciaModal";

const schema = z.object({
  tipo: z.enum(["sugestao", "duvida"]),
  titulo: z.string().trim().min(3, "Informe um título com no mínimo 3 caracteres").max(200, "Máximo 200 caracteres"),
  mensagem: z.string().trim().min(10, "Descreva sua mensagem com no mínimo 10 caracteres").max(5000, "Máximo 5000 caracteres"),
  anonimo: z.boolean(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_OPTIONS: {
  value: FaleConoscoItemTipo;
  label: string;
  description: string;
  icon: typeof Lightbulb;
  accent: string;
}[] = [
  {
    value: "sugestao",
    label: "Sugestão",
    description: "Ideias e melhorias para a empresa",
    icon: Lightbulb,
    accent: "text-emerald-600",
  },
  {
    value: "duvida",
    label: "Dúvida",
    description: "Perguntas de rotina ou processos ao RH",
    icon: HelpCircle,
    accent: "text-blue-600",
  },
];

export function FaleConoscoDrawer({ open, onOpenChange }: Props) {
  const [tipo, setTipo] = useState<FaleConoscoItemTipo>("sugestao");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [denunciaModalOpen, setDenunciaModalOpen] = useState(false);

  const criar = useCriarFaleConosco();

  const reset = () => {
    setTipo("sugestao");
    setTitulo("");
    setMensagem("");
    setAnonimo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      tipo,
      titulo,
      mensagem,
      anonimo,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    try {
      await criar.mutateAsync({
        tipo: parsed.data.tipo,
        titulo: parsed.data.titulo,
        mensagem: parsed.data.mensagem,
        anonimo: parsed.data.anonimo,
      });

      reset();
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.message === "company_not_found"
          ? "Não foi possível identificar sua empresa. Contate o RH."
          : err?.message;
      toast.error("Erro ao enviar mensagem", { description: msg });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Fale Conosco — Sugestões e Dúvidas
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed">
              Envie ideias, melhorias ou perguntas ao RH. Sua mensagem não é uma denúncia.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Tipo de Mensagem</Label>
                <RadioGroup
                  value={tipo}
                  onValueChange={(v) => setTipo(v as FaleConoscoItemTipo)}
                  className="grid grid-cols-1 gap-2"
                >
                  {TIPO_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = tipo === opt.value;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={`fc-tipo-${opt.value}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <RadioGroupItem id={`fc-tipo-${opt.value}`} value={opt.value} />
                        <Icon className={cn("h-4 w-4", opt.accent)} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {opt.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fc-titulo" className="text-xs font-semibold">
                  Título da Mensagem <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fc-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={200}
                  placeholder="Resumo do assunto"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fc-mensagem" className="text-xs font-semibold">
                  Mensagem <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="fc-mensagem"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  maxLength={5000}
                  placeholder="Escreva sua sugestão ou dúvida para o time de RH..."
                  className="min-h-[140px] text-xs resize-none"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Mínimo de 10 caracteres</span>
                  <span>{mensagem.length}/5000</span>
                </div>
              </div>

              {/* Anonimato opcional (padrão desligado) */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="fc-anonimo" className="text-xs font-medium">
                      Enviar como anônimo
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {anonimo
                        ? "Sua identidade não será compartilhada com o RH."
                        : "Seu nome e e-mail estarão visíveis para que o RH possa responder diretamente a você."}
                    </p>
                  </div>
                  <Switch
                    id="fc-anonimo"
                    checked={anonimo}
                    onCheckedChange={setAnonimo}
                  />
                </div>

                {anonimo && (
                  <Alert className="border-amber-300 dark:border-amber-700 bg-amber-500/10 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-[11px] text-amber-800 dark:text-amber-300">
                      Se você enviar anônimo, não poderemos responder diretamente a você.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Banner de separação para o Canal de Denúncias */}
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      Precisa relatar assédio ou conduta imprópria?
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Para assédio sexual, moral, discriminação ou violência no trabalho, utilize o canal sigiloso previsto na Lei nº 14.457/2022.
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        onOpenChange(false);
                        setDenunciaModalOpen(true);
                      }}
                      className="p-0 h-auto text-xs text-destructive hover:underline font-semibold"
                    >
                      Abrir Canal de Denúncias ➔
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-background space-y-2">
              <Button type="submit" className="w-full text-xs" disabled={criar.isPending}>
                {criar.isPending ? "Enviando..." : "Enviar Mensagem ao RH"}
              </Button>
              <div className="text-center">
                <Link
                  to="/fale-conosco/minhas"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver minhas mensagens enviadas
                </Link>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Modal separado para canal de denúncias */}
      <CanalDenunciaModal
        open={denunciaModalOpen}
        onOpenChange={setDenunciaModalOpen}
      />
    </>
  );
}
