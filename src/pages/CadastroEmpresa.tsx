import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("register-company", {
        body: {
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          admin_nome: data.admin_nome,
          admin_email: data.admin_email,
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

      if (result?.is_branch) {
        if (isSuperAdminUser) {
          toast.success(
            `Filial ${data.razao_social} cadastrada e vinculada a ${data.admin_email} com sucesso!`,
            { duration: 6000 }
          );
          navigate("/empresas");
        } else {
          toast.success(
            `Filial ${data.razao_social} cadastrada e vinculada à sua conta com sucesso!`,
            { duration: 6000 }
          );
          navigate("/");
        }
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
                {/* 3. Nome do Administrador */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin_nome">Nome completo do administrador *</Label>
                  <Input
                    id="admin_nome"
                    placeholder="Ex: Maria da Silva"
                    {...register("admin_nome")}
                  />
                  {errors.admin_nome && (
                    <p className="text-sm text-destructive">{errors.admin_nome.message}</p>
                  )}
                </div>

                {/* 4. E-mail do Administrador */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin_email">E-mail do administrador *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@empresa.com.br"
                    {...register("admin_email")}
                  />
                  {errors.admin_email && (
                    <p className="text-sm text-destructive">{errors.admin_email.message}</p>
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
                disabled={submitting}
                className="w-full gradient-primary text-primary-foreground shadow-md hover:shadow-lg transition-all mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando e enviando convite...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {isFilialFlow ? "Cadastrar Filial" : "Cadastrar Empresa e Enviar Convite"}
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
