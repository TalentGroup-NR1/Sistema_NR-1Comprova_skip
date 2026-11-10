import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Wrench, Users } from 'lucide-react';

interface QuestionResponse {
  question_id: string;
  question_text: string;
  question_type: string;
  colaborador_response: number | string | null;
  gestor_response: number | string | null;
}

interface AnalysisQuestionsByCategoryProps {
  responses: QuestionResponse[];
}

// Keywords to categorize questions
const SOFT_SKILLS_KEYWORDS = [
  'comunicação', 'relacionamento', 'equipe', 'colaboração', 'empatia',
  'liderança', 'proatividade', 'iniciativa', 'criatividade', 'flexibilidade',
  'adaptação', 'motivação', 'comprometimento', 'pontualidade', 'organização',
  'feedback', 'conflito', 'pressão', 'stress', 'ética', 'profissionalismo',
];

const HARD_SKILLS_KEYWORDS = [
  'técnico', 'conhecimento', 'habilidade', 'ferramenta', 'sistema',
  'processo', 'metodologia', 'qualidade', 'prazo', 'entrega',
  'performance', 'resultado', 'meta', 'objetivo', 'produtividade',
  'eficiência', 'análise', 'resolução', 'problema', 'solução',
];

const CULTURE_KEYWORDS = [
  'cultura', 'valores', 'missão', 'visão', 'empresa', 'organização',
  'integração', 'ambiente', 'clima', 'satisfação', 'pertencimento',
  'identidade', 'propósito', 'alinhamento', 'engajamento',
];

function categorizeQuestion(text: string): 'soft' | 'hard' | 'culture' {
  const lowerText = text.toLowerCase();
  
  const softScore = SOFT_SKILLS_KEYWORDS.filter(k => lowerText.includes(k)).length;
  const hardScore = HARD_SKILLS_KEYWORDS.filter(k => lowerText.includes(k)).length;
  const cultureScore = CULTURE_KEYWORDS.filter(k => lowerText.includes(k)).length;
  
  if (cultureScore >= softScore && cultureScore >= hardScore) return 'culture';
  if (softScore >= hardScore) return 'soft';
  return 'hard';
}

function renderValue(value: number | string | null, type: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (type === 'ESCALA_NUMERICA') {
    const numValue = typeof value === 'number' ? value : parseInt(String(value));
    const colorClass = numValue >= 8 
      ? 'text-executive-success' 
      : numValue >= 6 
        ? 'text-executive-warning' 
        : 'text-executive-danger';
    return <span className={`font-semibold ${colorClass}`}>{numValue}/10</span>;
  }

  if (type === 'SIM_NAO') {
    const isYes = String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'sim' || value === 1;
    return (
      <Badge variant={isYes ? 'default' : 'secondary'} className={isYes ? 'bg-executive-success' : ''}>
        {isYes ? 'Sim' : 'Não'}
      </Badge>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
}

function CategorySection({
  title,
  icon: Icon,
  questions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: QuestionResponse[];
}) {
  if (questions.length === 0) return null;

  return (
    <Card className="shadow-executive">
      <CardHeader className="py-3 px-4 bg-muted/50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-navy-900">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-navy-900/5">
              <TableHead className="font-medium text-graphite-800 w-[60%]">Questão</TableHead>
              <TableHead className="font-medium text-graphite-800 text-center w-[20%]">Colaborador</TableHead>
              <TableHead className="font-medium text-graphite-800 text-center w-[20%]">Gestor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q, idx) => (
              <TableRow key={q.question_id || idx} className="hover:bg-muted/30">
                <TableCell className="text-sm text-graphite-600 py-2">
                  {q.question_text}
                </TableCell>
                <TableCell className="text-center py-2">
                  {renderValue(q.colaborador_response, q.question_type)}
                </TableCell>
                <TableCell className="text-center py-2">
                  {renderValue(q.gestor_response, q.question_type)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AnalysisQuestionsByCategory({ responses }: AnalysisQuestionsByCategoryProps) {
  // Categorize questions
  const softSkills: QuestionResponse[] = [];
  const hardSkills: QuestionResponse[] = [];
  const culture: QuestionResponse[] = [];

  responses.forEach(r => {
    const category = categorizeQuestion(r.question_text);
    if (category === 'soft') softSkills.push(r);
    else if (category === 'hard') hardSkills.push(r);
    else culture.push(r);
  });

  if (responses.length === 0) {
    return (
      <Card className="shadow-executive">
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma questão disponível para análise
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CategorySection title="Soft Skills" icon={Brain} questions={softSkills} />
      <CategorySection title="Hard Skills" icon={Wrench} questions={hardSkills} />
      <CategorySection title="Cultura e Integração" icon={Users} questions={culture} />
    </div>
  );
}
