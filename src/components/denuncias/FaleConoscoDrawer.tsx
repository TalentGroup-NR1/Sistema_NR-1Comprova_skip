import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
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
import { MessageSquareText, ShieldCheck, Lightbulb, HelpCircle } from "lucide-react";
import { useCriarDenuncia, type FaleConoscoTipo } from "@/hooks/useDenuncias";
import { cn } from "@/lib/utils";
import {
  CATEGORIA_OPTIONS,
  ORIGEM_OPTIONS,
  CIPA_AVISO_SIGILO,
  type CategoriaComportamento,
  type OrigemOfensa,
} from "@/lib/cipaCategorias";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z
  .object({
    tipo: z.enum(["denuncia", "sugestao", "duvida"]),
    titulo: z.string().trim().min(1, "Informe o título").max(200, "Máximo 200 caracteres"),
    mensagem: z.string().trim().min(1, "Descreva sua mensagem").max(5000, "Máximo 5000 caracteres"),
    anonimo: z.boolean(),
    categoria: z.string().nullable().optional(),
    origem: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.tipo !== "denuncia" || !!d.categoria,
    { message: "Selecione o tipo de comportamento ofensivo", path: ["categoria"] }
  )
  .refine(
    (d) => d.tipo !== "denuncia" || !!d.origem,
    { message: "Selecione a origem da ofensa", path: ["origem"] }
  );

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_OPTIONS: {
  value: FaleConoscoTipo;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  accent: string;
}[] = [
  {
    value: "denuncia",
    label: "Denúncia",
    description: "Sempre anônima e sigilosa",
    icon: ShieldCheck,
    accent: "text-destructive",
  },
  {
    value: "sugestao",
    label: "Sugestão",
    description: "Ideias e melhorias",
    icon: Lightbulb,
    accent: "text-emerald-600",
  },
  {
    value: "duvida",
    label: "Dúvida",
    description: "Perguntas ao RH",
    icon: HelpCircle,
    accent: "text-blue-600",
  },
];

export function FaleConoscoDrawer({ open, onOpenChange }: Props) {
  const [tipo, setTipo] = useState<FaleConoscoTipo>("denuncia");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [anonimo, setAnonimo] = useState(true);
  const [categoria, setCategoria] = useState<CategoriaComportamento | "">("");
  const [origem, setOrigem] = useState<OrigemOfensa | "">("");
  const criar = useCriarDenuncia();

  const isDenuncia = tipo === "denuncia";
  // Denúncia força anônimo (também no servidor).
  const effectiveAnonimo = isDenuncia ? true : anonimo;

  const reset = () => {
    setTipo("denuncia");
    setTitulo("");
    setMensagem("");
    setAnonimo(true);
    setCategoria("");
    setOrigem("");
  };

  const handleTipoChange = (value: string) => {
    const t = value as FaleConoscoTipo;
    setTipo(t);
    if (t === "denuncia") setAnonimo(true);
    else {
      setAnonimo(false);
      setCategoria("");
      setOrigem("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      tipo,
      titulo,
      mensagem,
      anonimo: effectiveAnonimo,
      categoria: categoria || null,
      origem: origem || null,
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
        categoria: parsed.data.categoria ?? null,
        origem: parsed.data.origem ?? null,
      });
      toast.success("Mensagem enviada com sucesso!", {
        description: effectiveAnonimo
          ? "Foi enviada de forma anônima — sua identidade não será revelada."
          : "O RH poderá entrar em contato com você, se necessário.",
        duration: 6000,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.message === "company_not_found"
          ? "Não foi possível identificar sua empresa. Contate o RH."
          : err?.message;
      toast.error("Erro ao enviar", { description: msg });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Fale Conosco
          </SheetTitle>
          <SheetDescription className="text-xs">
            Envie denúncias, sugestões ou dúvidas ao RH. Você escolhe se quer se
            identificar — denúncias são sempre anônimas.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label>O que você deseja enviar?</Label>
              <RadioGroup
                value={tipo}
                onValueChange={handleTipoChange}
                className="grid grid-cols-1 gap-2"
              >
                {TIPO_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = tipo === opt.value;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={`tipo-${opt.value}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <RadioGroupItem id={`tipo-${opt.value}`} value={opt.value} />
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

            <div className="space-y-2">
              <Label htmlFor="fc-titulo">Título</Label>
              <Input
                id="fc-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Resumo do assunto"
              />
            </div>

            {isDenuncia && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fc-categoria">
                    Tipo de Comportamento Ofensivo <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Qual foi a natureza da situação vivenciada ou presenciada?
                  </p>
                  <Select
                    value={categoria}
                    onValueChange={(v) => setCategoria(v as CategoriaComportamento)}
                  >
                    <SelectTrigger id="fc-categoria">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fc-origem">
                    Origem da Ofensa <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Por parte de quem ocorreu o comportamento?
                  </p>
                  <Select
                    value={origem}
                    onValueChange={(v) => setOrigem(v as OrigemOfensa)}
                  >
                    <SelectTrigger id="fc-origem">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGEM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="fc-mensagem">Mensagem</Label>
              <Textarea
                id="fc-mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={5000}
                placeholder={
                  isDenuncia
                    ? "Descreva os fatos com o máximo de detalhes possível (datas, local, pessoas envolvidas)."
                    : "Escreva sua mensagem ao RH"
                }
                className="min-h-[140px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {mensagem.length}/5000
              </p>
            </div>

            <div
              className={cn(
                "flex items-start justify-between gap-4 rounded-lg border border-border p-3",
                isDenuncia ? "bg-destructive/5" : "bg-muted/30"
              )}
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor="fc-anonimo"
                  className={cn("font-medium", isDenuncia && "text-destructive")}
                >
                  Enviar como anônimo
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isDenuncia
                    ? "Denúncias são sempre anônimas — sua identidade é totalmente protegida."
                    : anonimo
                    ? "Sua identidade não será exibida ao RH."
                    : "Seu nome ficará visível para o RH."}
                </p>
              </div>
              <Switch
                id="fc-anonimo"
                checked={effectiveAnonimo}
                disabled={isDenuncia}
                onCheckedChange={setAnonimo}
              />
            </div>

            {isDenuncia && (
              <p className="text-[11px] leading-relaxed text-muted-foreground border-l-2 border-destructive/40 pl-3 italic">
                {CIPA_AVISO_SIGILO}
              </p>
            )}
          </div>

          <div className="border-t border-border p-4 bg-background">
            <Button type="submit" className="w-full" disabled={criar.isPending}>
              {criar.isPending ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
