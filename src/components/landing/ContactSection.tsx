import { useState } from "react";
import { z } from "zod";
import { CalendarClock, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_SECTION_ID } from "@/lib/landing";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Informe seu nome." })
    .max(120, { message: "Nome muito longo." }),
  company: z
    .string()
    .trim()
    .min(2, { message: "Informe a empresa." })
    .max(150, { message: "Nome da empresa muito longo." }),
  email: z
    .string()
    .trim()
    .email({ message: "E-mail inválido." })
    .max(255, { message: "E-mail muito longo." }),
  phone: z.string().trim().max(30, { message: "Telefone muito longo." }).optional(),
  message: z.string().trim().max(2000, { message: "Mensagem muito longa." }).optional(),
});

const emptyForm = { name: "", company: "", email: "", phone: "", message: "" };

export function ContactSection() {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Honeypot: bots preenchem o campo oculto. Descarta sem gravar nada.
    if (honeypot.trim() !== "") {
      setSuccess(true);
      setForm(emptyForm);
      return;
    }

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Verifique os dados",
        description: parsed.error.issues[0]?.message ?? "Preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.functions.invoke("solicitar-demonstracao", {
      body: {
        name: parsed.data.name,
        company: parsed.data.company,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message || null,
      },
    });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Não foi possível enviar",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }

    setForm(emptyForm);
    setSuccess(true);
  }

  return (
    <section id={CONTACT_SECTION_ID} className="lp-dark relative font-brand">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
        <div className="lp-beam relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#101C40] via-[#0E1834] to-[#0B132B] shadow-[0_60px_160px_-50px_rgba(0,229,255,0.5)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#00E5FF]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#00E676]/15 blur-3xl"
          />
      <div className="relative z-10 grid gap-12 p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E5FF]">
            <Sparkles className="h-3.5 w-3.5" /> Demonstração executiva
          </span>
          <h2 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Pronto para transformar a gestão de pessoas e a{" "}
            <span className="lp-gradient-text">conformidade</span> da sua empresa?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/65 sm:text-lg">
            Esqueça os relatórios estáticos de gaveta. Agende uma demonstração executiva com
            nossos especialistas e veja o NR-1Comprova em ação.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            {[
              "Apresentação personalizada para o seu segmento",
              "Simulação com o PGR atual da sua empresa",
              "Retorno da equipe em até 1 dia útil",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00E676]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 inline-flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-3.5 w-3.5" /> Seus dados são tratados conforme a LGPD.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-2xl sm:p-8">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarClock className="h-4 w-4 text-[#00B8D4]" />
            Agende sua demonstração
          </p>

          {success ? (
            <div className="flex flex-col items-start gap-3">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">
                Recebemos sua solicitação! Nossa equipe entrará em contato em até 1 dia útil.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
                Enviar outra solicitação
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Honeypot anti-spam — invisível para pessoas */}
              <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Não preencha este campo</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-slate-700">Nome</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-company" className="text-slate-700">Empresa</Label>
                <Input
                  id="contact-company"
                  value={form.company}
                  maxLength={150}
                  onChange={(e) => handleChange("company", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-slate-700">E-mail</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    maxLength={255}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="text-slate-700">Telefone</Label>
                  <Input
                    id="contact-phone"
                    value={form.phone}
                    maxLength={30}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-slate-700">Mensagem</Label>
                <Textarea
                  id="contact-message"
                  rows={4}
                  value={form.message}
                  maxLength={2000}
                  onChange={(e) => handleChange("message", e.target.value)}
                />
              </div>

              <Button
                id="contact-submit"
                type="submit"
                className="lp-btn-glow h-12 w-full rounded-xl border-0 text-[15px] font-bold hover:opacity-100"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agendar Demonstração Personalizada
              </Button>
            </form>
          )}
        </div>
      </div>
        </div>
      </div>
    </section>
  );
}
