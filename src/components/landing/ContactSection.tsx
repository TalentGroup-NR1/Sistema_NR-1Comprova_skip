import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
    <section id={CONTACT_SECTION_ID} className="landing-navy landing-diagonals font-brand">
      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 px-5 py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Pronto para transformar a gestão da sua empresa?
          </h2>
          <p className="mt-4 text-white/70">
            Solicite uma demonstração e nossa equipe entra em contato para entender sua
            necessidade e definir os próximos passos.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-xl">

          {success ? (
            <div className="flex flex-col items-start gap-3">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
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
                <Label htmlFor="contact-name">Nome</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-company">Empresa</Label>
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
                  <Label htmlFor="contact-email">E-mail</Label>
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
                  <Label htmlFor="contact-phone">Telefone</Label>
                  <Input
                    id="contact-phone"
                    value={form.phone}
                    maxLength={30}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Mensagem</Label>
                <Textarea
                  id="contact-message"
                  rows={4}
                  value={form.message}
                  maxLength={2000}
                  onChange={(e) => handleChange("message", e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-red text-white hover:bg-brand-red/90"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar Demonstração
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
