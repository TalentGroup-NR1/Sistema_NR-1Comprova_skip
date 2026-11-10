import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalysisHeaderProps {
  colaboradorName: string;
  jobTitle?: string;
  admissionDate?: string;
  gestorName?: string;
  milestone?: string;
  avatarUrl?: string;
  status?: {
    label: string;
    emoji: string;
  };
  showLogo?: boolean;
}

function calculateTenure(admissionDate: string): string {
  const admission = new Date(admissionDate);
  const today = new Date();
  
  const totalDays = differenceInDays(today, admission);
  const months = differenceInMonths(today, admission);
  const remainingDays = totalDays - (months * 30);
  
  if (months === 0) {
    return `${totalDays} dia${totalDays !== 1 ? 's' : ''}`;
  }
  
  if (remainingDays <= 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  
  return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} dia${remainingDays !== 1 ? 's' : ''}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AnalysisHeader({
  colaboradorName,
  jobTitle,
  admissionDate,
  gestorName,
  milestone,
  avatarUrl,
  status,
  showLogo = true,
}: AnalysisHeaderProps) {
  const formattedAdmission = admissionDate 
    ? format(new Date(admissionDate), 'dd/MM/yyyy', { locale: ptBR })
    : '-';

  const tenure = admissionDate ? calculateTenure(admissionDate) : '-';

  const getStatusBadgeClass = (label: string) => {
    if (label.includes('Ascensão') || label.includes('Excelente')) {
      return 'bg-executive-success text-white';
    }
    if (label.includes('Estável') || label.includes('Adaptando') || label.includes('Atenção')) {
      return 'bg-executive-warning text-white';
    }
    if (label.includes('Risco') || label.includes('Crítico')) {
      return 'bg-executive-danger text-white';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="identity-card bg-card rounded-lg p-6 mb-6 shadow-executive print:p-3 print:mb-3 print:shadow-none print-no-break">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-4 print:gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-border shadow-sm print:h-14 print:w-14 print:shadow-none">
            <AvatarImage src={avatarUrl} alt={colaboradorName} />
            <AvatarFallback className="text-base font-semibold bg-secondary text-secondary-foreground print:text-sm">
              {getInitials(colaboradorName)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-lg font-bold text-navy-900 print:text-base">
              {colaboradorName}
            </h2>
            {jobTitle && (
              <p className="text-sm text-graphite-600 print:text-xs">{jobTitle}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-graphite-400 print:text-[10px] print:gap-2 flex-wrap">
              <span>Admissão: {formattedAdmission}</span>
              <span className="text-graphite-600 hidden sm:inline">•</span>
              <span className="font-medium text-navy-700">
                Tempo: {tenure}
              </span>
            </div>
            {milestone && (
              <Badge variant="outline" className="mt-1 text-xs border-navy-500 text-navy-700 print:text-[10px] print:px-1.5 print:py-0.5">
                Ciclo {milestone}
              </Badge>
            )}
          </div>
        </div>

        {/* Right side: Logo and Status */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {showLogo && (
            <div className="bg-navy-900 rounded-md px-3 py-1 shadow-sm print:px-2 print:py-0.5 print:shadow-none print-header-dark">
              <span className="font-bold text-white text-xs tracking-wide print:text-[10px] print-white-text">TG MAIS</span>
            </div>
          )}
          
          {status && (
            <Badge className={`${getStatusBadgeClass(status.label)} text-xs px-2 py-0.5 print:text-[10px] print:px-1.5`}>
              {status.emoji} {status.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Gestor info */}
      {gestorName && (
        <div className="mt-3 pt-2 border-t border-border print:mt-2 print:pt-1.5">
          <span className="text-xs text-graphite-400 print:text-[10px]">Gestor Responsável: </span>
          <span className="text-sm font-medium text-navy-700 print:text-xs">{gestorName}</span>
        </div>
      )}
    </div>
  );
}
