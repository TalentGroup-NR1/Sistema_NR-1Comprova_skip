import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TERMS_VERSION, PRIVACY_VERSION, getClientIp } from '@/lib/legal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


const schema = z
  .object({
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100),
    confirmPassword: z.string(),
    aceiteTermos: z.boolean().refine((val) => val === true, {
      message: 'É obrigatório aceitar os Termos de Uso',
    }),
    aceitePrivacidade: z.boolean().refine((val) => val === true, {
      message: 'É obrigatório aceitar a Política de Privacidade',
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function AtualizarSenha() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isRequestingNewLink, setIsRequestingNewLink] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
      aceiteTermos: false,
      aceitePrivacidade: false,
    },
  });

  const [aceiteTermos, aceitePrivacidade] = form.watch(['aceiteTermos', 'aceitePrivacidade']);
  const canSubmit = Boolean(aceiteTermos && aceitePrivacidade);

  useEffect(() => {
    let recoveryDetected = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryDetected = true;
        setLinkError(null);
        setHasSession(true);
        setIsReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Recovery token auto-signs in — allow password change
        setLinkError(null);
        setHasSession(true);
        setIsReady(true);
      }
    });

    const hash = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.slice(1))
      : new URLSearchParams();
    const query = new URLSearchParams(window.location.search);

    // 1) Error returned by the auth verification endpoint (expired / already used link)
    const errorCode = hash.get('error_code') || query.get('error_code');
    const errorParam = hash.get('error') || query.get('error');
    if (errorCode || errorParam) {
      setLinkError(
        errorCode === 'otp_expired'
          ? 'Este link expirou ou já foi utilizado. Solicite um novo e-mail ao RH.'
          : 'Link inválido. Solicite um novo e-mail de definição de senha ao RH.'
      );
      setIsReady(true);
      return () => subscription.unsubscribe();
    }

    // 2) Legacy hash tokens (type=recovery)
    if (hash.get('type') === 'recovery' || hash.get('access_token')) {
      recoveryDetected = true;
      setIsReady(true);
    }

    // 3) Newer formats: ?code= (PKCE) or ?token_hash=&type=recovery
    const code = query.get('code');
    const tokenHash = query.get('token_hash');
    if (code) {
      recoveryDetected = true;
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setLinkError('Este link expirou ou já foi utilizado. Solicite um novo e-mail ao RH.');
        } else {
          setHasSession(true);
        }
        setIsReady(true);
      });
    } else if (tokenHash) {
      recoveryDetected = true;
      supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }).then(({ error }) => {
        if (error) {
          setLinkError('Este link expirou ou já foi utilizado. Solicite um novo e-mail ao RH.');
        } else {
          setHasSession(true);
        }
        setIsReady(true);
      });
    }

    // Fallback: session already established (token processed before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
        setIsReady(true);
      } else if (!recoveryDetected) {
        setTimeout(() => {
          setIsReady(true);
          setHasSession((current) => {
            if (!current) {
              setLinkError('Abra esta página pelo link enviado no e-mail para definir sua senha.');
            }
            return current;
          });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const onSubmit = async (values: FormValues) => {
    if (!hasSession) {
      toast({
        variant: 'destructive',
        title: 'Link inválido',
        description: 'Use o link enviado por e-mail para redefinir sua senha.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Atualizar a senha no Supabase Auth
      const { error: pwdError } = await supabase.auth.updateUser({ password: values.password });
      if (pwdError) {
        toast({ variant: 'destructive', title: 'Erro', description: pwdError.message });
        return;
      }

      // 2. Gravar o aceite legítimo via RPC accept_company_terms com os dados do cliente
      try {
        const clientIp = await getClientIp();
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
        const { error: rpcError } = await supabase.rpc('accept_company_terms', {
          p_terms_version: TERMS_VERSION,
          p_privacy_version: PRIVACY_VERSION,
          p_ip_address: clientIp,
          p_user_agent: userAgent,
        });

        if (rpcError) {
          console.error('[AtualizarSenha] Falha ao registrar aceite de termos via RPC:', rpcError);
          toast({
            variant: 'destructive',
            title: 'Aviso sobre registro de termos',
            description:
              'Sua senha foi definida com sucesso, mas houve uma instabilidade momentânea ao registrar o aceite dos termos. Por favor, confirme o aceite no painel posteriormente.',
          });
        }
      } catch (termsErr) {
        console.error('[AtualizarSenha] Erro inesperado ao registrar termos:', termsErr);
      }

      // 3. Concluir processo e redirecionar
      await supabase.auth.signOut();
      toast({ title: 'Senha atualizada com sucesso', description: 'Faça login com sua nova senha.' });
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNewLink = async () => {
    if (!resendEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'E-mail obrigatório',
        description: 'Digite seu e-mail cadastrado.',
      });
      return;
    }

    setIsRequestingNewLink(true);
    try {
      // Dispara o fluxo seguro de recuperação de senha do Supabase para o e-mail informado
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível solicitar o link',
          description: error.message,
        });
      } else {
        toast({
          title: 'Link de acesso enviado',
          description: 'Se o e-mail estiver cadastrado, você receberá um novo link de definição de senha.',
        });
        setRequestDialogOpen(false);
        setResendEmail('');
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Tente novamente ou solicite o reenvio ao administrador.',
      });
    } finally {
      setIsRequestingNewLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary">NR-1Comprova</h2>
          <p className="text-muted-foreground">Sistema de Gestão de RH</p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Definir Senha</h1>
            <p className="text-muted-foreground mt-2">
              Crie uma senha segura para acessar o sistema pela primeira vez.
            </p>
          </div>

          {linkError ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{linkError}</p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  className="w-full gap-2"
                  onClick={() => setRequestDialogOpen(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Solicitar novo link
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                  Ir para o login
                </Button>
              </div>
            </div>
          ) : !isReady ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <Form {...form}>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="••••••"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirm(!showConfirm)}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkboxes de consentimento LGPD granular */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <FormField
                  control={form.control}
                  name="aceiteTermos"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="aceiteTermos"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor="aceiteTermos"
                          className="text-xs font-normal leading-relaxed text-muted-foreground cursor-pointer"
                        >
                          Li e aceito os{' '}
                          <a
                            href="/termos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground underline underline-offset-2"
                          >
                            Termos de Uso
                          </a>
                          .
                        </Label>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aceitePrivacidade"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="aceitePrivacidade"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor="aceitePrivacidade"
                          className="text-xs font-normal leading-relaxed text-muted-foreground cursor-pointer"
                        >
                          Li e aceito a{' '}
                          <a
                            href="/privacidade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground underline underline-offset-2"
                          >
                            Política de Privacidade (LGPD)
                          </a>
                          .
                        </Label>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {!canSubmit && (
                <p className="text-xs text-muted-foreground text-center">
                  É necessário aceitar os Termos de Uso e a Política de Privacidade para prosseguir.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Definir Senha e Acessar
              </Button>
            </form>
          </Form>
          )}
        </div>

        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Solicitar novo link de acesso
              </DialogTitle>
              <DialogDescription>
                Informe seu e-mail para receber um novo link de definição de senha.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <Input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRequestNewLink();
                  }
                }}
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRequestDialogOpen(false);
                  setResendEmail('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRequestNewLink}
                disabled={isRequestingNewLink}
              >
                {isRequestingNewLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar novo link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
