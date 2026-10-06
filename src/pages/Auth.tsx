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
    <div className="min-h-screen flex font-['Inter',sans-serif]">
      {/* Left panel - Branding (60%) */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden items-center justify-start p-16"
        style={{
          background: 'linear-gradient(135deg, hsl(211 53% 11%) 0%, hsl(216 64% 18%) 100%)',
        }}
      >
        {/* Graphic elements: Crosses pattern & abstract shapes */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19 19V5h2v14h14v2H21v14h-2V21H5v-2h14z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Abstract circles */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-[hsl(216_64%_48%)]/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl px-8 xl:px-16 animate-fade-up flex flex-col items-center text-center -mt-12" style={{ animationDuration: '0.8s' }}>
          <div className="mb-6 animate-elegant-float w-full max-w-[16rem] sm:max-w-xs mx-auto">
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              className="w-full h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] object-contain"
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.3] mb-6 drop-shadow-lg max-w-xl mx-auto">
            A plataforma de gestão de pessoas que dá vida ao seu PGR.
          </h1>
          
          {/* Badges moved to directly below the title */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
            {['Gestão Viva', 'Trabalho Real', 'PGR Inteligente'].map((label) => (
              <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 shadow-sm transition-colors hover:bg-white/20">
                <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(216 64% 48%)' }} />
                <span className="text-sm font-semibold text-white/95 tracking-wide">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-base sm:text-lg font-light leading-[1.6] tracking-wide max-w-lg mx-auto" style={{ color: 'hsl(220 20% 80%)' }}>
            Conectamos a rotina real dos colaboradores à conformidade da NR-1, transformando dados operacionais e a escuta de riscos psicossociais em uma gestão preventiva viva, inteligente e auditável.
          </p>
        </div>
      </div>

      {/* Right panel - Login form (40%) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-14 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 sm:p-14 relative overflow-hidden border border-slate-100">
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
            © {new Date().getFullYear()} NR-1Comprova. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
