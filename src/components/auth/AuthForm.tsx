import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { MfaChallenge } from '@/components/auth/MfaChallenge';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }).max(100),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const finishLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Acesso bloqueado',
          description: 'Colaborador desligado. Entre em contato com o RH.',
        });
        return;
      }

      // Empresa suspensa → bloqueia (usuários de plataforma não têm empresa vinculada)
      const { data: companyStatus } = await supabase.rpc('my_company_status' as never);
      if (companyStatus === 'suspended') {
        await supabase.auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Empresa suspensa',
          description: 'Empresa suspensa. Contate suporte@nr-1pronto.com.br',
        });
        return;
      }
    }
    toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
    navigate('/');
  };

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Erro de autenticação',
            description: 'Email ou senha incorretos.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: error.message,
          });
        }
        return;
      }
      
      // Check if MFA is required (AAL upgrade needed)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        setNeedsMfa(true);
        return;
      }

      await finishLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe o e-mail.' });
      return;
    }
    setForgotLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });
      toast({
        title: 'E-mail enviado',
        description: 'Se o e-mail existir, você receberá um link de recuperação.',
      });
      setShowForgotDialog(false);
      setForgotEmail('');
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar o e-mail.' });
    } finally {
      setForgotLoading(false);
    }
  };

  if (needsMfa) {
    return (
      <div className="w-full">
        <MfaChallenge
          onVerified={async () => {
            setNeedsMfa(false);
            await finishLogin();
          }}
          onCancel={() => {
            setNeedsMfa(false);
            form.reset();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-6">


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="seu@email.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
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

            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowForgotDialog(true)}
              >
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </Form>

      </div>

      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail para receber o link de recuperação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="forgot-email"
                placeholder="seu@email.com"
                className="pl-10"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForgotDialog(false)}>Cancelar</Button>
            <Button onClick={handleForgotPassword} disabled={forgotLoading}>
              {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
