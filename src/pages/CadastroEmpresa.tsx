import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, Send, CheckCircle2, UserCheck, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCNPJ } from "@/lib/validators/company";
import { supabase } from "@/integrations/supabase/client";

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const schema = z.object({
  razao_social: z.string().trim().min(2, "Informe a razão social").max(255),
  cnpj: z.string().trim().regex(cnpjRegex, "CNPJ no formato XX.XXX.XXX/XXXX-XX"),
  admin_nome: z.string().trim().min(2, "Informe o nome completo").max(200),
  admin_email: z.string().trim().email("E-mail inválido").max(255),
});

type FormValues = z.infer<typeof schema>;

export default function CadastroEmpresa() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [adminMode, setAdminMode] = useState<"novo" | "existente">("novo");
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingAdminProfile, setExistingAdminProfile] = useState<{
    user_id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [existingAdminError, setExistingAdminError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      razao_social: "",
      cnpj: "",
      admin_nome: "",
      admin_email: "",
    },
  });

  const { user, isAuthenticated, isAdminEmpresa, isAdminMaster, isSuperAdmin } = useAuth();
  const isSuperAdminUser = isAdminMaster || isSuperAdmin;
  const isFilialFlow = isAuthenticated && isAdminEmpresa && !isSuperAdminUser;

  const {
    register,
    setValue,
    watch,
    formState: { errors },
    handleSubmit,
  } = form;
  const values = watch();

  // Se o usuário logado for admin de empresa (fluxo filial), pré-preenche seus dados para facilitar o cadastro da filial
  useEffect(() => {
    if (isFilialFlow && user) {
      const nome = (user.user_metadata?.full_name as string) || "";
      const email = user.email || "";
      if (nome && !form.getValues("admin_nome")) {
        form.setValue("admin_nome", nome, { shouldValidate: true });
      }
      if (email && !form.getValues("admin_email")) {
        form.setValue("admin_email", email, { shouldValidate: true });
      }
    }
  }, [isFilialFlow, user, form]);

  const handleAdminEmailBlur = async (emailValue: string) => {
    const trimmed = (emailValue || "").trim().toLowerCase();
    if (adminMode !== "existente") return;

    if (!trimmed || !trimmed.includes("@")) {
      setExistingAdminProfile(null);
      setExistingAdminError(null);
      return;
    }

    setCheckingExisting(true);
    setExistingAdminError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .ilike("email", trimmed)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar perfil:", error.message);
        setExistingAdminProfile(null);
        setExistingAdminError("Erro ao validar conta. Verifique sua conexão e tente novamente.");
        return;
      }

      if (data && data.user_id) {
        const resolvedName = data.full_name || "Administrador Cadastrado";
        setExistingAdminProfile({
          user_id: data.user_id,
          full_name: resolvedName,
          email: data.email || trimmed,
        });
        setExistingAdminError(null);
        form.setValue("admin_nome", resolvedName, { shouldValidate: true });
      } else {
        setExistingAdminProfile(null);
        setExistingAdminError(
          "Nenhuma conta encontrada com este e-mail. Use o modo 'Novo administrador' para convidar."
        );
        form.setValue("admin_nome", "");
      }
    } catch (err: any) {
      setExistingAdminProfile(null);
      setExistingAdminError("Erro inesperado ao consultar conta existente.");
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleModeChange = (mode: "novo" | "existente") => {
    setAdminMode(mode);
    setExistingAdminError(null);
    if (mode === "novo") {
      setExistingAdminProfile(null);
    } else {
      const currentEmail = form.getValues("admin_email");
      if (currentEmail) {
        handleAdminEmailBlur(currentEmail);
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (adminMode === "existente" && !existingAdminProfile) {
      toast.error("Informe um e-mail válido de administrador já cadastrado na plataforma.");
      return;
    }

    setSubmitting(true);
    try {
      const isSkipInvite = adminMode === "existente";
      const { data: result, error } = await supabase.functions.invoke("register-company", {
        body: {
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          admin_nome: data.admin_nome,
          admin_email: data.admin_email,
          skip_invite: isSkipInvite,
          // TODO Etapa 2: remover após ajuste da Edge Function
          aceite_termos: true,
        },
      });

      let errorMessage: string | null = null;
      if (error) {
        try {
          const body = await (error as any)?.context?.json?.();
          errorMessage = body?.error || body?.message || error.message;
        } catch {
          errorMessage = error.message;
        }
      } else if (!result?.success) {
        errorMessage = (result as { error?: string } | null)?.error ?? null;
      }

      if (errorMessage || !result?.success) {
        toast.error(errorMessage ?? "Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }

      // Se for modo skip_invite ou filial vinculada
      if (isSkipInvite || result?.is_branch) {
        toast.success(
          isFilialFlow
            ? `Filial ${data.razao_social} cadastrada e vinculada à sua conta com sucesso!`
            : `Empresa ${data.razao_social} cadastrada e vinculada a ${data.admin_email} com sucesso!`,
          { duration: 6000 }
        );
        navigate(isSuperAdminUser ? "/empresas" : "/");
        return;
      }

      // Fluxo de convite (nova empresa cliente)
      const hasInviteError =
        result?.invite_sent === false || Boolean((result as { email_convite_erro?: string })?.email_convite_erro);

      if (hasInviteError) {
        const errorDetail = (result as { email_convite_erro?: string })?.email_convite_erro;
        toast.error(
          errorDetail
            ? `Empresa cadastrada, mas houve falha ao enviar o convite para ${data.admin_email}: ${errorDetail}`
            : `Empresa cadastrada, mas não foi possível enviar o convite para ${data.admin_email}. Verifique a configuração ou reenvie o acesso posteriormente.`
        );
        return;
      }

      toast.success(
        `Empresa cadastrada com sucesso! O convite de acesso foi gerado e enviado para ${data.admin_email}. Se não chegar em alguns minutos, verifique a caixa de spam ou lixo eletrônico.`,
        { duration: 8000 }
      );
      navigate("/empresas");
    } catch (e) {
      toast.error((e as Error).message || "Erro inesperado no cadastro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isFilialFlow ? "Adicionar filial / nova empresa" : "Cadastrar nova empresa"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isFilialFlow
              ? `Cadastre uma nova empresa vinculada à sua conta atual de administrador (${user?.email}).`
              : "Preencha os dados essenciais abaixo para enviar o convite ao administrador."}
          </p>
        </header>

        <Card className="rounded-xl shadow-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Dados da Empresa e Administrador</CardTitle>
            <CardDescription>
              Apenas os dados essenciais para identificação jurídica e envio do convite de acesso.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 1. Razão Social */}
              <div className="space-y-1.5">
                <Label htmlFor="razao_social">Razão social / Nome da empresa *</Label>
                <Input
                  id="razao_social"
                  placeholder="Ex: Empresa Exemplo Serviços Ltda"
                  {...register("razao_social")}
                />
                {errors.razao_social && (
                  <p className="text-sm text-destructive">{errors.razao_social.message}</p>
                )}
              </div>

              {/* 2. CNPJ */}
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={values.cnpj}
                  onChange={(e) =>
                    setValue("cnpj", formatCNPJ(e.target.value), { shouldValidate: true })
                  }
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
              </div>

              <div className="pt-2 border-t border-border/50 space-y-4">
                {/* Seleção do modo de Administrador (apenas quando não for fluxo restrito de filial) */}
                {!isFilialFlow && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Administrador *</Label>
                    <RadioGroup
                      value={adminMode}
                      onValueChange={(val) => handleModeChange(val as "novo" | "existente")}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <div
                        className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${adminMode === "novo"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                        onClick={() => handleModeChange("novo")}
                      >
                        <RadioGroupItem value="novo" id="mode-novo" className="mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="mode-novo" className="font-semibold cursor-pointer">
                            Novo administrador
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Cria conta e envia convite de acesso por e-mail.
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${adminMode === "existente"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                        onClick={() => handleModeChange("existente")}
                      >
                        <RadioGroupItem value="existente" id="mode-existente" className="mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="mode-existente" className="font-semibold cursor-pointer">
                            Administrador já cadastrado
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Vincula conta existente sem enviar e-mail.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* 3. E-mail do Administrador (no modo existente vem primeiro para validação prévia) */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin_email">E-mail do administrador *</Label>
                  <div className="relative">
                    <Input
                      id="admin_email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@empresa.com.br"
                      {...register("admin_email")}
                      onBlur={(e) => {
                        register("admin_email").onBlur(e);
                        if (adminMode === "existente") {
                          handleAdminEmailBlur(e.target.value);
                        }
                      }}
                    />
                    {checkingExisting && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {errors.admin_email && (
                    <p className="text-sm text-destructive">{errors.admin_email.message}</p>
                  )}
                  {existingAdminError && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{existingAdminError}</span>
                    </div>
                  )}
                </div>

                {/* Card de confirmação do perfil encontrado no modo existente */}
                {adminMode === "existente" && existingAdminProfile && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-950">
                          {existingAdminProfile.full_name}
                        </p>
                        <p className="text-emerald-700">{existingAdminProfile.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-white">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      Administrador Ativo
                    </Badge>
                  </div>
                )}

                {/* 4. Nome do Administrador (desabilitado se modo existente) */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin_nome">Nome completo do administrador *</Label>
                  <Input
                    id="admin_nome"
                    placeholder="Ex: Maria da Silva"
                    disabled={adminMode === "existente"}
                    className={adminMode === "existente" ? "bg-muted cursor-not-allowed" : ""}
                    {...register("admin_nome")}
                  />
                  {errors.admin_nome && (
                    <p className="text-sm text-destructive">{errors.admin_nome.message}</p>
                  )}
                </div>
              </div>

              {/* Aviso explicativo */}
              {isFilialFlow ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                  <p className="font-semibold mb-0.5">🏢 Vínculo direto à sua conta</p>
                  <p>
                    Esta filial será vinculada imediatamente à sua conta (<strong>{user?.email}</strong>) com o papel de <strong>Administrador da Empresa</strong>.
                  </p>
                </div>
              ) : adminMode === "existente" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                  <p className="font-semibold mb-0.5">🔗 Vínculo direto sem disparo de e-mail</p>
                  <p>
                    Esta empresa será vinculada diretamente à conta existente, sem envio de e-mail e sem alteração de senha.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-800">
                  <p className="font-semibold mb-0.5">📧 Convite por e-mail e perfil posterior</p>
                  <p>
                    O administrador receberá um convite para criar sua senha. Ao acessar, poderá completar a identidade visual (logo, cor) e endereço em Configurações.
                  </p>
                </div>
              )}

              {/* Botão de Envio */}
              <Button
                type="submit"
                disabled={submitting || (adminMode === "existente" && !existingAdminProfile)}
                className="w-full gradient-primary text-primary-foreground shadow-md hover:shadow-lg transition-all mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {adminMode === "existente"
                      ? "Cadastrando e vinculando administrador..."
                      : "Cadastrando e enviando convite..."}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {isFilialFlow
                      ? "Cadastrar Filial"
                      : adminMode === "existente"
                        ? "Cadastrar Empresa e Vincular Administrador"
                        : "Cadastrar Empresa e Enviar Convite"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
