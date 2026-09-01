import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { useBranding } from '@/hooks/useBranding';

export default function Auth() {
  const { isAuthenticated, loading } = useAuth();
  const branding = useBranding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(220 50% 12%) 0%, hsl(220 45% 18%) 40%, hsl(210 40% 24%) 100%)',
        }}
      >
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: 'linear-gradient(180deg, hsl(38 45% 55%) 0%, hsl(38 50% 65%) 50%, hsl(38 45% 55%) 100%)' }} />

        <div className="relative z-10 max-w-lg px-16 text-center">
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="h-24 mx-auto mb-10 drop-shadow-2xl"
          />
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight mb-4">
            {branding.brandName}
          </h1>
          <div className="w-16 h-1 mx-auto mb-6 rounded-full" style={{ background: 'hsl(38 45% 60%)' }} />
          <p className="text-lg leading-relaxed" style={{ color: 'hsl(220 20% 72%)' }}>
            Plataforma completa para gestão estratégica de pessoas, desenvolvimento de talentos e performance organizacional.
          </p>

          {/* Bottom decorative badges */}
          <div className="mt-12 flex items-center justify-center gap-6">
            {['Desempenho', 'Desenvolvimento', 'Bem-estar'].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(38 45% 60%)' }} />
                <span className="text-sm font-medium" style={{ color: 'hsl(220 20% 65%)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to top, hsl(220 50% 8% / 0.5), transparent)' }} />
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              className="h-16 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-foreground">{branding.brandName}</h2>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-1">
              Acesse sua conta para continuar
            </p>
          </div>

          <AuthForm />


          <p className="text-xs text-muted-foreground text-center mt-8">
            © {new Date().getFullYear()} Talent Group. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
