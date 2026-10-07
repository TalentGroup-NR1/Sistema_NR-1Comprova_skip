import { useState, useEffect } from "react";
import { Check, X, GripVertical, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { Eyebrow } from "@/components/landing/premium";

const OLD_WAY = [
  "Planilhas soltas e PDFs estáticos esquecidos após a auditoria.",
  "Descrições de cargos teóricas baseadas no que o RH acha que é feito.",
  "Sem participação do trabalhador gerando riscos em fiscalizações.",
  "Ações sem acompanhamento de prazos, responsáveis ou evidências.",
];

const NEW_WAY = [
  {
    title: "Upload Inteligente do PGR",
    text: "Leitura automática de laudos e conversão em Kanban vivo.",
  },
  {
    title: "Mapeamento do Trabalho Real",
    text: "O colaborador descreve a rotina real e aponta gargalos.",
  },
  {
    title: "Gestão Ativa do Plano de Ação",
    text: "Quadros visuais (5W2H) com acompanhamento em tempo real.",
  },
  {
    title: "Validação Contínua",
    text: "Pulsos do Cuidar+ medem se a ação reduziu o estresse.",
  },
];

function DashboardVisual() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm lg:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-xs font-bold text-white/90">Dashboard de Ações</span>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2979FF]/30 bg-[#2979FF]/10 px-2 py-1 text-[9px] font-bold text-[#2979FF]">
          <FileText className="h-3 w-3" /> Relatório PDF
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Total de Ações */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[9px] font-semibold text-white/50">Total de Ações</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">6</span>
          </div>
          <p className="mt-1 text-[8px] text-white/40">cadastradas no PGR</p>
        </div>

        {/* Status de Execução */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="flex justify-between">
            <p className="text-[9px] font-semibold text-white/50">Status de Execução</p>
            <CheckCircle2 className="h-3 w-3 text-[#00E676]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-[#00E676]">5</span>
            <span className="text-[10px] font-medium text-white/50">de 6</span>
          </div>
          <div className="mt-1 flex gap-2 text-[8px] font-medium text-white/40">
            <span>1 Pend.</span>
            <span>0 Andam.</span>
          </div>
        </div>

        {/* Taxa de Conclusão */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[9px] font-semibold text-white/50">Taxa de Conclusão</p>
          <div className="mt-1 text-xl font-extrabold text-white">83%</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-full w-[83%] rounded-full bg-[#2979FF]" />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* Faróis por Prioridade */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[9px] font-semibold text-white/50">Faróis por Prioridade</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-medium text-white/80">Prioridade Alta <span className="text-white/40">0</span></span>
              <span className="flex items-center gap-1 text-[#00E676]"><div className="h-1.5 w-1.5 rounded-full bg-[#00E676]"/> Em dia</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-medium text-white/80">Prioridade Média <span className="text-white/40">1</span></span>
              <span className="flex items-center gap-1 text-slate-400"><div className="h-1.5 w-1.5 rounded-full bg-slate-400"/> Sem prazo</span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#FF5252]/20 bg-[#FF5252]/10 p-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-[#FF5252]" />
            <div>
              <p className="text-[9px] font-bold text-[#FF5252]">Vencidas (0)</p>
              <p className="text-[8px] text-white/60">Nenhuma ação vencida.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <p className="text-[9px] font-bold text-amber-500">Vencendo em 7 dias (0)</p>
              <p className="text-[8px] text-white/60">Nenhuma ação vencendo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedKanban() {
  const [col, setCol] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const run = async () => {
      while (isSubscribed) {
        setCol(0);
        setIsDragging(false);
        await new Promise((r) => setTimeout(r, 2000));
        
        if (!isSubscribed) return;
        setIsDragging(true);
        await new Promise((r) => setTimeout(r, 500));
        
        if (!isSubscribed) return;
        setCol(1);
        setIsDragging(false);
        await new Promise((r) => setTimeout(r, 2000));
        
        if (!isSubscribed) return;
        setIsDragging(true);
        await new Promise((r) => setTimeout(r, 500));
        
        if (!isSubscribed) return;
        setCol(2);
        setIsDragging(false);
        await new Promise((r) => setTimeout(r, 3000));
      }
    };
    run();
    return () => { isSubscribed = false; };
  }, []);

  const columns = [
    { name: "Pendente", color: "border-slate-500", dot: "bg-slate-400" },
    { name: "Em Andamento", color: "border-blue-500", dot: "bg-blue-400" },
    { name: "Concluída", color: "border-[#00E676]", dot: "bg-[#00E676]" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm lg:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-xs font-bold text-white/90">Plano de Ação (Kanban)</span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/60">
          Ações: 1
        </span>
      </div>
      
      <div className="grid h-36 grid-cols-3 gap-3">
        {columns.map((column, i) => (
          <div key={i} className={`relative flex flex-col rounded-xl border-t-2 ${column.color} bg-white/5 p-2.5`}>
            <div className="mb-3 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${column.dot}`} />
              <span className="text-[9px] font-bold text-white/70">{column.name}</span>
            </div>
            
            <div 
              className={`absolute left-2.5 right-2.5 z-10 rounded-lg border border-white/10 bg-white/10 p-2.5 shadow-lg backdrop-blur-md transition-all duration-500 ${
                col === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              } ${isDragging && col === i ? "scale-105 rotate-3 border-[#00E5FF]/50 shadow-[0_10px_30px_rgba(0,229,255,0.2)]" : ""}`}
              style={{ top: "32px" }}
            >
              <div className="flex items-start gap-1.5">
                <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                <p className="text-[9px] font-semibold leading-tight text-white/90">
                  Liderança humanizada
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="rounded-sm bg-white/20 px-1 py-0.5 text-[7px] font-bold text-white">
                  Média
                </span>
                <span className={`rounded-sm px-1 py-0.5 text-[7px] font-bold ${
                  col === 2 ? "bg-[#00E676]/20 text-[#00E676]" : "bg-amber-400/20 text-amber-300"
                }`}>
                  5W2H: {col === 2 ? "6/6" : "3/6"}
                </span>
              </div>
            </div>
            
            <div className={`mt-2 h-16 rounded-lg border border-dashed border-white/10 bg-white/5 transition-opacity duration-300 ${
              (isDragging && col === i) || (isDragging && col === i - 1) ? "opacity-100" : "opacity-0"
            }`} />
          </div>
        ))}
      </div>
      
      <div 
        className={`pointer-events-none absolute h-5 w-5 transition-all duration-500 ease-in-out z-20 ${
          isDragging ? "opacity-100 scale-90" : "opacity-0 scale-125"
        }`}
        style={{
          transform: `translate(${col * 100}%, 0)`,
          left: `calc(${16 + (col * 33)}% - 10px)`,
          top: "60%"
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.44c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z" fill="white" stroke="#0B132B" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

export function ContrastSection() {
  return (
    <section className="lp-ice relative overflow-hidden font-brand">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="light">O contraste estratégico</Eyebrow>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0B132B] sm:text-5xl">
            A verdadeira gestão <span className="bg-gradient-to-r from-[#00E676] to-[#00B8D4] bg-clip-text text-transparent">que se comprova</span>
          </h2>
          <p className="mt-4 text-base text-[#0B132B]/60 sm:text-lg">
            A diferença entre ter um documento de gaveta para mostrar à auditoria e ter uma gestão inteligente que pulsa todos os dias.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] items-stretch">
          {/* Card Unificado de Contraste (Esquerda) */}
          <Reveal className="h-full">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-[#0B132B]/10 bg-white/70 shadow-sm">
              {/* O Mercado */}
              <div className="p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5252]">
                  Como o mercado faz
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-[#0B132B]/80">
                  O PGR de Gaveta
                </h3>
                <ul className="mt-6 space-y-4">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF5252]/10">
                        <X className="h-3 w-3 text-[#FF5252]" />
                      </span>
                      <span className="text-sm leading-relaxed text-[#0B132B]/55 line-through decoration-[#FF5252]/30">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* O NR-1 Comprova */}
              <div className="rounded-b-3xl border-t border-[#0B132B]/5 bg-gradient-to-b from-transparent to-[#00E676]/[0.03] p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00C853]">
                  Como sua empresa ficará
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-[#0B132B]">
                  A Gestão Ativa
                </h3>
                <ul className="mt-6 space-y-4">
                  {NEW_WAY.map((item) => (
                    <li key={item.title} className="group flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00E676] to-[#00E5FF] shadow-[0_0_10px_rgba(0,230,118,0.3)] transition-transform group-hover:scale-110">
                        <Check className="h-3 w-3 text-[#0B132B]" strokeWidth={3} />
                      </span>
                      <span className="text-sm leading-relaxed text-[#0B132B]/75">
                        <strong className="font-bold text-[#0B132B]">{item.title}:</strong> {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          {/* Painel do Sistema (Direita) */}
          <Reveal delay={120} className="h-full">
            <div className="lp-dark lp-aurora relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl p-6 shadow-[0_40px_100px_-40px_rgba(11,19,43,0.9)] lg:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00E5FF]/20 blur-[80px]" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#00E676]/20 blur-[80px]" />
              
              <div className="relative z-10 flex flex-col gap-4">
                <DashboardVisual />
                <AnimatedKanban />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
