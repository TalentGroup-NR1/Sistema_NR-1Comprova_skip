import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/empresas/ColorPicker";
import { formatCNPJ } from "@/lib/validators/company";
import { formatCEP, isCepComplete, fetchAddressByCep } from "@/lib/cep";
import { supabase } from "@/integrations/supabase/client";
import { validateLogoFile } from "@/hooks/useCompanyLogo";
import { DEFAULT_BRANDING } from "@/hooks/useBranding";

const SEGMENTOS = [
  "Agronegócio",
  "Tecnologia",
  "Construção Civil",
  "Serviços Financeiros",
  "Energias",
  "Saúde",
  "Outros",
] as const;

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const schema = z
  .object({
    razao_social: z.string().trim().min(2, "Informe a razão social").max(255),
    cnpj: z.string().trim().regex(cnpjRegex, "CNPJ no formato XX.XXX.XXX/XXXX-XX"),
    brand_name: z.string().trim().min(2, "Informe o nome da marca").max(120),
    brand_primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida"),
    telefone: z.string().trim().min(8, "Informe o telefone").max(30),
    segmento: z.enum(SEGMENTOS, { required_error: "Selecione o segmento" }),
    cep: z.string().trim().regex(/^\d{5}-\d{3}$/, "CEP no formato 00000-000"),
    logradouro: z.string().trim().min(2, "Informe o logradouro").max(255),
    numero: z.string().trim().min(1, "Informe o número").max(20),
    complemento: z.string().trim().max(120).optional().or(z.literal("")),
    bairro: z.string().trim().min(2, "Informe o bairro").max(120),
    cidade: z.string().trim().min(2, "Informe a cidade").max(120),
    estado: z.string().trim().regex(/^[A-Za-z]{2}$/, "UF com 2 letras"),
    admin_nome: z.string().trim().min(2, "Informe o nome completo").max(200),
    admin_email: z.string().trim().email("E-mail inválido").max(255),
    admin_senha: z.string().min(8, "Mínimo de 8 caracteres").max(200),
    confirmar_senha: z.string(),
    aceite_termos: z.boolean(),
  })
  .refine((d) => d.admin_senha === d.confirmar_senha, {
    path: ["confirmar_senha"],
    message: "As senhas não conferem",
  })
  .refine((d) => d.aceite_termos, {
    path: ["aceite_termos"],
    message: "É necessário aceitar os termos",
  });

type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: [
    "razao_social",
    "cnpj",
    "brand_name",
    "brand_primary_color",
    "telefone",
    "segmento",
    "cep",
    "logradouro",
    "numero",
    "bairro",
    "cidade",
    "estado",
  ],
  2: ["admin_nome", "admin_email", "admin_senha", "confirmar_senha"],
  3: ["aceite_termos"],
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function CadastroEmpresa() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      razao_social: "",
      cnpj: "",
      brand_name: "",
      brand_primary_color: DEFAULT_BRANDING.primaryColor,
      telefone: "",
      segmento: undefined,
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      admin_nome: "",
      admin_email: "",
      admin_senha: "",
      confirmar_senha: "",
      aceite_termos: false,
    },
  });

  const {
    register,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
    trigger,
    handleSubmit,
  } = form;
  const values = watch();

  const goNext = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };

  const handleCepChange = async (raw: string) => {
    const masked = formatCEP(raw);
    setValue("cep", masked, { shouldValidate: true });
    if (!isCepComplete(masked)) return;

    setBuscandoCep(true);
    const address = await fetchAddressByCep(masked);
    setBuscandoCep(false);

    if (!address) {
      setError("cep", { message: "CEP não encontrado. Preencha o endereço manualmente." });
      return;
    }
    clearErrors("cep");
    setValue("logradouro", address.logradouro, { shouldValidate: true });
    setValue("bairro", address.bairro, { shouldValidate: true });
    setValue("cidade", address.cidade, { shouldValidate: true });
    setValue("estado", address.estado, { shouldValidate: true });
  };

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      return;
    }
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    setLogoFile(file);
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      let logo: { filename: string; content_type: string; base64: string } | null = null;
      if (logoFile) {
        logo = {
          filename: logoFile.name,
          content_type: logoFile.type,
          base64: await fileToBase64(logoFile),
        };
      }

      const { data: result, error } = await supabase.functions.invoke("register-company", {
        body: {
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          brand_name: data.brand_name,
          brand_primary_color: data.brand_primary_color,
          telefone: data.telefone,
          segmento: data.segmento,
          cep: data.cep,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento || "",
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado.toUpperCase(),
          admin_nome: data.admin_nome,
          admin_email: data.admin_email,
          admin_senha: data.admin_senha,
          aceite_termos: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          logo,
        },
      });

      if (error || !result?.success) {
        const message =
          (result as { error?: string } | null)?.error ??
          "Não foi possível concluir o cadastro. Tente novamente.";
        toast.error(message);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.admin_email.trim().toLowerCase(),
        password: data.admin_senha,
      });
      if (signInError) {
        toast.success("Conta criada! Faça login para continuar.");
        navigate("/auth");
        return;
      }

      toast.success("Empresa cadastrada com sucesso!");
      navigate("/");
    } catch (e) {
      toast.error((e as Error).message || "Erro inesperado no cadastro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastre sua empresa</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie sua conta e comece a usar a plataforma em minutos.
          </p>
        </header>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`w-10 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 1 && "Dados da empresa"}
              {step === 2 && "Dados do administrador"}
              {step === 3 && "Confirmação"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Informações institucionais e identidade visual."}
              {step === 2 && "Esta será a conta de acesso principal."}
              {step === 3 && "Revise os dados antes de criar a conta."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="razao_social">Razão social *</Label>
                    <Input id="razao_social" {...register("razao_social")} />
                    {errors.razao_social && (
                      <p className="text-sm text-destructive">{errors.razao_social.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={values.cnpj}
                        onChange={(e) =>
                          setValue("cnpj", formatCNPJ(e.target.value), { shouldValidate: true })
                        }
                        placeholder="00.000.000/0000-00"
                      />
                      {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input id="telefone" {...register("telefone")} placeholder="(00) 00000-0000" />
                      {errors.telefone && (
                        <p className="text-sm text-destructive">{errors.telefone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="brand_name">Nome da marca *</Label>
                      <Input id="brand_name" {...register("brand_name")} />
                      {errors.brand_name && (
                        <p className="text-sm text-destructive">{errors.brand_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Segmento *</Label>
                      <Select
                        value={values.segmento}
                        onValueChange={(v) =>
                          setValue("segmento", v as FormValues["segmento"], { shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEGMENTOS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.segmento && (
                        <p className="text-sm text-destructive">{errors.segmento.message}</p>
                      )}
                    </div>
                  </div>

                  <ColorPicker
                    label="Cor da marca"
                    value={values.brand_primary_color}
                    onChange={(c) => setValue("brand_primary_color", c, { shouldValidate: true })}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo da marca (opcional)</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou SVG até 5MB. Sem logo, usamos o nome da marca em texto.
                    </p>
                  </div>

                  <div className="pt-2 border-t space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Endereço</h3>
                      <p className="text-xs text-muted-foreground">
                        Usado em documentos oficiais (PGR, relatórios e certificados).
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cep" className="flex items-center gap-2">
                          CEP *
                          {buscandoCep && <Loader2 className="w-3 h-3 animate-spin" />}
                        </Label>
                        <Input
                          id="cep"
                          value={values.cep}
                          maxLength={9}
                          placeholder="00000-000"
                          onChange={(e) => handleCepChange(e.target.value)}
                        />
                        {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="numero">Número *</Label>
                        <Input id="numero" {...register("numero")} placeholder="123" />
                        {errors.numero && (
                          <p className="text-sm text-destructive">{errors.numero.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logradouro">Logradouro *</Label>
                      <Input id="logradouro" {...register("logradouro")} placeholder="Rua, avenida..." />
                      {errors.logradouro && (
                        <p className="text-sm text-destructive">{errors.logradouro.message}</p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="complemento">Complemento</Label>
                        <Input id="complemento" {...register("complemento")} placeholder="Sala, bloco..." />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bairro">Bairro *</Label>
                        <Input id="bairro" {...register("bairro")} />
                        {errors.bairro && (
                          <p className="text-sm text-destructive">{errors.bairro.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                      <div className="space-y-2">
                        <Label htmlFor="cidade">Cidade *</Label>
                        <Input id="cidade" {...register("cidade")} />
                        {errors.cidade && (
                          <p className="text-sm text-destructive">{errors.cidade.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estado">UF *</Label>
                        <Input
                          id="estado"
                          maxLength={2}
                          placeholder="SP"
                          value={values.estado}
                          onChange={(e) =>
                            setValue("estado", e.target.value.toUpperCase(), { shouldValidate: true })
                          }
                        />
                        {errors.estado && (
                          <p className="text-sm text-destructive">{errors.estado.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="admin_nome">Nome completo *</Label>
                    <Input id="admin_nome" {...register("admin_nome")} />
                    {errors.admin_nome && (
                      <p className="text-sm text-destructive">{errors.admin_nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin_email">E-mail (será o login) *</Label>
                    <Input id="admin_email" type="email" autoComplete="email" {...register("admin_email")} />
                    {errors.admin_email && (
                      <p className="text-sm text-destructive">{errors.admin_email.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="admin_senha">Senha *</Label>
                      <Input
                        id="admin_senha"
                        type="password"
                        autoComplete="new-password"
                        {...register("admin_senha")}
                      />
                      {errors.admin_senha && (
                        <p className="text-sm text-destructive">{errors.admin_senha.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmar_senha">Confirmar senha *</Label>
                      <Input
                        id="confirmar_senha"
                        type="password"
                        autoComplete="new-password"
                        {...register("confirmar_senha")}
                      />
                      {errors.confirmar_senha && (
                        <p className="text-sm text-destructive">{errors.confirmar_senha.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <dl className="rounded-lg border divide-y text-sm">
                    {[
                      ["Razão social", values.razao_social],
                      ["CNPJ", values.cnpj],
                      ["Nome da marca", values.brand_name],
                      ["Segmento", values.segmento],
                      ["Telefone", values.telefone],
                      [
                        "Endereço",
                        values.logradouro
                          ? `${values.logradouro}, ${values.numero}${
                              values.complemento ? ` - ${values.complemento}` : ""
                            } - ${values.bairro}, ${values.cidade}/${values.estado} - CEP ${values.cep}`
                          : "",
                      ],
                      ["Logo", logoFile ? logoFile.name : "Não enviado"],
                      ["Administrador", values.admin_nome],
                      ["E-mail de acesso", values.admin_email],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between gap-4 px-4 py-2.5">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium text-right">{value || "—"}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <dt className="text-muted-foreground">Cor da marca</dt>
                      <dd className="flex items-center gap-2 font-medium">
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: values.brand_primary_color }}
                        />
                        {values.brand_primary_color}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="aceite_termos"
                      checked={values.aceite_termos}
                      onCheckedChange={(c) =>
                        setValue("aceite_termos", c === true, { shouldValidate: true })
                      }
                    />
                    <Label htmlFor="aceite_termos" className="text-sm font-normal leading-snug">
                      Aceito os{" "}
                      <a
                        href="/termos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-4"
                      >
                        Termos de Uso
                      </a>{" "}
                      e a{" "}
                      <a
                        href="/privacidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-4"
                      >
                        Política de Privacidade
                      </a>{" "}
                      (LGPD).
                    </Label>
                  </div>
                  {errors.aceite_termos && (
                    <p className="text-sm text-destructive">{errors.aceite_termos.message}</p>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" asChild>
                    <Link to="/auth">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Já tenho conta
                    </Link>
                  </Button>
                )}

                {step < 3 ? (
                  <Button type="button" onClick={goNext}>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Criar minha conta
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
