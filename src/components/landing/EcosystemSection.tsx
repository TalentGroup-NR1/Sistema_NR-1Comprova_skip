import { useState, useEffect } from "react";
import type { ElementType } from "react";
import {
  Award,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  Megaphone,
  MessageSquareHeart,
  Microscope,
  Network,
  PlayCircle,
  ShieldAlert,
  FileBarChart2,
  Lock,
  Shield,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { Eyebrow, SpotlightCard } from "@/components/landing/premium";

function PillarHeader({
  icon: Icon,
  tag,
  title,
  concept,
  gradient,
  tagTone,
}: {
  icon: ElementType;
  tag: string;
  title: string;
  concept: string;
  gradient: string;
  tagTone: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tagTone}`}>
          {tag}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0B132B]">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-[#0B132B]/50">{concept}</p>
    </div>
  );
}

const CARD =
  "group h-full rounded-3xl border border-[#0B132B]/[0.07] bg-white p-7 shadow-[0_1px_2px_rgba(11,19,43,0.04),0_20px_50px_-30px_rgba(11,19,43,0.25)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-30px_rgba(11,19,43,0.35)] lg:p-8";

/* ---- Visuais dos pilares ---- */

function CuidarVisual() {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    
    const runAnimation = async () => {
      while (isSubscribed) {
        setHoverIndex(null);
        setSelectedIndex(null);
        await new Promise((r) => setTimeout(r, 1000));
        
        // Simulate mouse moving across emojis
        const sequence = [2, 3, 4, 5];
        for (const i of sequence) {
          if (!isSubscribed) return;
          setHoverIndex(i);
          await new Promise((r) => setTimeout(r, 400));
        }
        
        if (!isSubscribed) return;
        // Click on index 5 (Excelente)
        setSelectedIndex(5);
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    runAnimation();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const EMOJIS = [
    { e: "😢", l: "Muito Mal", c: "#FF5252", bg: "bg-[#FF5252]/10", b: "border-[#FF5252]/30" },
    { e: "😟", l: "Mal", c: "#FF9800", bg: "bg-[#FF9800]/10", b: "border-[#FF9800]/30" },
    { e: "😐", l: "Regular", c: "#FFC107", bg: "bg-[#FFC107]/10", b: "border-[#FFC107]/30" },
    { e: "🙂", l: "Bem", c: "#8BC34A", bg: "bg-[#8BC34A]/10", b: "border-[#8BC34A]/30" },
    { e: "😄", l: "Muito Bem", c: "#4CAF50", bg: "bg-[#4CAF50]/10", b: "border-[#4CAF50]/30" },
    { e: "🤩", l: "Excelente", c: "#00E676", bg: "bg-[#00E676]/10", b: "border-[#00E676]/30" },
  ];

  return (
    <div className="relative rounded-2xl border border-[#0B132B]/[0.05] bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-[#0B132B]/[0.05] pb-3">
        <div>
          <h4 className="text-sm font-bold text-[#0B132B]">Pulso da Semana 41</h4>
          <p className="text-[10px] font-semibold text-[#0B132B]/40">Pergunta 1 de 1</p>
        </div>
        <div className="h-2 w-24 rounded-full bg-[#0B132B]/[0.05]">
          <div className="h-full w-full rounded-full bg-[#2979FF]" />
        </div>
      </div>
      
      <div className="text-center">
        <p className="mb-5 text-[13px] font-bold text-[#0B132B]">
          Como foi sua semana? <span className="text-[#FF5252]">*</span>
        </p>
        
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {EMOJIS.map((item, i) => {
            const isHovered = hoverIndex === i && selectedIndex === null;
            const isSelected = selectedIndex === i;
            const isUnselected = selectedIndex !== null && selectedIndex !== i;
            
            return (
              <div
                key={i}
                className={[
                  "flex w-12 flex-col items-center justify-center gap-1.5 rounded-xl border p-1.5 transition-all duration-300 sm:w-14 sm:p-2",
                  isHovered ? `${item.bg} ${item.b} -translate-y-2 scale-110 shadow-lg` : "",
                  isSelected ? `${item.bg} ${item.b} scale-110 shadow-[0_0_20px_rgba(0,230,118,0.3)] ring-2 ring-[#00E676]/50` : "",
                  isUnselected ? "scale-95 opacity-40 grayscale" : "",
                  !isHovered && !isSelected && !isUnselected ? "border-[#0B132B]/[0.05] bg-white hover:bg-slate-50" : ""
                ].filter(Boolean).join(" ")}
                style={isSelected ? { borderColor: item.c } : {}}
              >
                <span className={`text-xl sm:text-2xl transition-transform duration-300 ${isHovered ? "scale-125" : ""}`}>
                  {item.e}
                </span>
                <span 
                  className="text-[8px] font-bold uppercase sm:text-[9px]" 
                  style={{ color: isHovered || isSelected ? item.c : "#94A3B8" }}
                >
                  {item.l}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 flex justify-center gap-3">
        <div className="flex h-8 w-24 items-center justify-center rounded-lg border border-[#0B132B]/[0.1] text-[11px] font-bold text-[#0B132B]/40">
          Anterior
        </div>
        <div className={`flex h-8 w-24 items-center justify-center rounded-lg text-[11px] font-bold text-white transition-all duration-500 ${selectedIndex !== null ? "bg-[#2979FF] shadow-lg shadow-[#2979FF]/30" : "bg-[#0B132B]/10"}`}>
          Finalizar
        </div>
      </div>
      
      {/* Decorative pointer/cursor simulation */}
      <div 
        className={`pointer-events-none absolute h-5 w-5 transition-all duration-500 ease-out ${hoverIndex !== null ? "opacity-100" : "opacity-0 scale-50"}`}
        style={{
          transform: `translate(${hoverIndex !== null ? hoverIndex * 50 - 60 : 0}px, 20px)`,
          left: "50%",
          bottom: "45%"
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.44c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z" fill="white" stroke="#0B132B" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function TreinamentoVisual() {
  const pct = 86;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2979FF1A" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="url(#trainGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
          />
          <defs>
            <linearGradient id="trainGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#2979FF" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-[#0B132B]">{pct}%</span>
          <span className="text-[9px] font-semibold uppercase text-[#0B132B]/45">concluído</span>
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-[#2979FF]/[0.07] px-2.5 py-1.5 font-semibold text-[#1E4FB8]">
          <PlayCircle className="h-3.5 w-3.5" /> Liderança Segura · vídeo 4/6
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-2.5 py-1.5 font-semibold text-amber-800">
          <Award className="h-3.5 w-3.5" /> Certificado emitido
        </div>
      </div>
    </div>
  );
}

function DiarioVisual() {
  const marcos = [
    { d: "30", label: "Integração", done: true },
    { d: "80", label: "Autonomia", done: true },
    { d: "120", label: "Alinhamento", done: false },
  ];
  return (
    <div className="relative mt-2">
      <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-amber-100" />
      <div className="absolute left-0 top-5 h-1 w-2/3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="relative flex justify-between">
        {marcos.map((m) => (
          <div key={m.d} className="flex flex-col items-center">
            <span
              className={
                m.done
                  ? "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-extrabold text-white shadow-lg ring-4 ring-white"
                  : "flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-amber-300 bg-white text-sm font-extrabold text-amber-500 ring-4 ring-white"
              }
            >
              {m.d}
            </span>
            <span className="mt-2 text-[11px] font-semibold text-[#0B132B]/60">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstruturaVisual() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#0B132B]/[0.07] bg-[#F3F6FB] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B132B]/45">Trabalho prescrito</p>
        <ul className="mt-3 space-y-2 text-xs text-[#0B132B]/60">
          <li className="rounded-lg bg-white px-3 py-2">Conferir notas fiscais</li>
          <li className="rounded-lg bg-white px-3 py-2">Lançar no ERP</li>
          <li className="rounded-lg bg-white px-3 py-2">Arquivar documentos</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-[#00C853]/20 bg-gradient-to-b from-[#00C853]/[0.07] to-transparent p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00873A]">Trabalho real</p>
        <ul className="mt-3 space-y-2 text-xs text-[#0B132B]/75">
          <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            Conferir notas fiscais <span className="text-[10px] font-bold text-[#00873A]">ok</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            Retrabalho por sistema lento
            <span className="rounded-full bg-[#FF5252]/10 px-2 py-0.5 text-[10px] font-bold text-[#E53935]">atrito</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            Atender fornecedores por telefone
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">oculto</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function FaleConoscoVisual() {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const runAnimation = async () => {
      while (isSubscribed) {
        setHoverIndex(null);
        setSelectedIndex(null);
        await new Promise((r) => setTimeout(r, 1000));
        
        const sequence = [1, 2, 0];
        for (const i of sequence) {
          if (!isSubscribed) return;
          setHoverIndex(i);
          await new Promise((r) => setTimeout(r, 600));
        }
        
        if (!isSubscribed) return;
        setSelectedIndex(0);
        await new Promise((r) => setTimeout(r, 2500));
      }
    };
    runAnimation();
    return () => { isSubscribed = false; };
  }, []);

  const options = [
    { id: 0, title: "Denúncia", sub: "Sempre anônima e sigilosa", icon: Shield, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30" },
    { id: 1, title: "Sugestão", sub: "Ideias e melhorias", icon: Lightbulb, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { id: 2, title: "Dúvida", sub: "Perguntas ao RH", icon: HelpCircle, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  ];

  return (
    <div className="relative rounded-2xl border border-[#0B132B]/[0.05] bg-white p-5 shadow-xl">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-[#0B132B]">O que você deseja enviar?</h4>
      </div>
      
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isHovered = hoverIndex === i && selectedIndex === null;
          const isUnselected = selectedIndex !== null && selectedIndex !== i;
          
          return (
            <div
              key={i}
              className={[
                "relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-300",
                isSelected ? "border-[#2979FF] bg-[#2979FF]/[0.03] shadow-[0_4px_20px_rgba(41,121,255,0.15)] ring-1 ring-[#2979FF]" : "",
                isHovered ? "border-[#0B132B]/20 bg-[#0B132B]/[0.02] -translate-y-0.5" : "",
                isUnselected ? "opacity-40 grayscale" : "",
                !isSelected && !isHovered ? "border-[#0B132B]/[0.08]" : ""
              ].filter(Boolean).join(" ")}
            >
              {/* Radio circle */}
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#2979FF]" : "border-[#0B132B]/20"}`}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-[#2979FF]" />}
              </div>
              
              {/* Icon */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${opt.bg} ${opt.color}`}>
                <opt.icon className="h-4 w-4" />
              </div>
              
              {/* Text */}
              <div>
                <p className="text-xs font-bold text-[#0B132B]">{opt.title}</p>
                <p className="text-[10px] text-[#0B132B]/60">{opt.sub}</p>
              </div>

              {/* Anonymity tag pop-up */}
              {isSelected && i === 0 && (
                <div className="absolute right-3 flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold text-rose-600 animate-in fade-in zoom-in duration-300">
                  <Lock className="h-3 w-3" /> Modo Anônimo
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-5 space-y-3">
        <div className="flex h-8 w-full items-center rounded-lg border border-[#0B132B]/10 bg-[#F8FAFC] px-3">
          <span className="text-[10px] text-[#0B132B]/30">Resumo do assunto...</span>
        </div>
        <div className={`flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold text-white transition-all duration-500 ${selectedIndex !== null ? "bg-[#2979FF] shadow-lg shadow-[#2979FF]/30" : "bg-[#0B132B]/10"}`}>
          Avançar Anonimamente
        </div>
      </div>

      {/* Cursor */}
      <div 
        className={`pointer-events-none absolute h-5 w-5 transition-all duration-500 ease-out z-10 ${hoverIndex !== null ? "opacity-100" : "opacity-0 scale-50"}`}
        style={{
          transform: `translate(20px, ${hoverIndex !== null ? hoverIndex * 58 : 0}px)`,
          left: "50%",
          top: "80px"
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.44c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z" fill="white" stroke="#0B132B" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

const MORE = [
  { icon: ClipboardCheck, label: "Avaliação de Desempenho" },
  { icon: MessageSquareHeart, label: "Feedback Contínuo" },
  { icon: Lock, label: "Canal de Escuta Anônimo" },
  { icon: ShieldAlert, label: "Gestão de Comportamentos Ofensivos" },
  { icon: Microscope, label: "Diagnósticos Científicos Nativos" },
  { icon: Megaphone, label: "Comunicados Internos" },
  { icon: FileBarChart2, label: "Relatórios Executivos" },
  { icon: BookOpenCheck, label: "Descrição de Cargos Viva" },
];

export function EcosystemSection() {
  return (
    <section id="ecossistema" className="lp-ice relative overflow-hidden font-brand">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#7C4DFF]/10 via-[#00E5FF]/10 to-[#00E676]/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-24 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="light">Os pilares do ecossistema</Eyebrow>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0B132B] sm:text-5xl">
            Muito além do PGR: <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#7C4DFF] via-[#2979FF] to-[#00C853] bg-clip-text text-transparent">
              uma plataforma inteira de gestão de pessoas.
            </span>
          </h2>
          <p className="mt-5 text-base text-[#0B132B]/60 sm:text-lg">
            Clima, desenvolvimento, acolhimento e desenho do trabalho conversando entre si — cada
            dado alimenta o próximo e comprova o anterior.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-6">
          {/* Cuidar+ */}
          <Reveal className="lg:col-span-4">
            <SpotlightCard spot="rgba(124,77,255,0.10)" className={CARD}>
              <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                <div>
                  <PillarHeader
                    icon={HeartPulse}
                    tag="Pilar 1"
                    title="Cuidar+"
                    concept="O termômetro em tempo real do bem-estar e da cultura."
                    gradient="from-[#7C4DFF] to-[#B388FF]"
                    tagTone="bg-[#7C4DFF]/10 text-[#5E35B1]"
                  />
                  <p className="mt-4 text-[15px] leading-relaxed text-[#0B132B]/65">
                    Pulsos semanais rápidos e anônimos acompanham exaustão, clareza de papéis e
                    suporte — e validam se as ações do Kanban surtiram efeito prático no setor.
                  </p>
                </div>
                <CuidarVisual />
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Treinamento */}
          <Reveal delay={100} className="lg:col-span-2">
            <SpotlightCard spot="rgba(41,121,255,0.10)" className={CARD}>
              <PillarHeader
                icon={GraduationCap}
                tag="Pilar 2"
                title="Treinamento & Capacitação"
                concept="Desenvolvimento contínuo atrelado ao seu PGR."
                gradient="from-[#2979FF] to-[#00E5FF]"
                tagTone="bg-[#2979FF]/10 text-[#1E4FB8]"
              />
              <p className="mt-4 text-sm leading-relaxed text-[#0B132B]/65">
                Trilhas em vídeo vinculadas a cards do Kanban, com controle de presença e
                certificados automáticos.
              </p>
              <div className="mt-6">
                <TreinamentoVisual />
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Diário de Bordo */}
          <Reveal className="lg:col-span-2">
            <SpotlightCard spot="rgba(255,171,0,0.12)" className={CARD}>
              <PillarHeader
                icon={CalendarCheck2}
                tag="Pilar 3"
                title="Diário de Bordo"
                concept="Onboarding e retenção nos marcos de 30, 80 e 120 dias."
                gradient="from-amber-400 to-orange-500"
                tagTone="bg-amber-100 text-amber-800"
              />
              <p className="mt-4 text-sm leading-relaxed text-[#0B132B]/65">
                Check-ins estruturados entre colaborador e gestor medem integração, volume de
                trabalho, autonomia e expectativas.
              </p>
              <div className="mt-7">
                <DiarioVisual />
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Estrutura Organizacional */}
          <Reveal delay={100} className="lg:col-span-4">
            <SpotlightCard spot="rgba(0,200,83,0.10)" className={CARD}>
              <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                <div>
                  <PillarHeader
                    icon={Network}
                    tag="Pilar 4"
                    title="Estrutura Organizacional & Trabalho Real"
                    concept="Job Redesign: o prescrito reconciliado com o real."
                    gradient="from-[#00C853] to-[#00E5FF]"
                    tagTone="bg-[#00C853]/10 text-[#00873A]"
                  />
                  <p className="mt-4 text-[15px] leading-relaxed text-[#0B132B]/65">
                    Aba dedicada no cadastro de cargos para mapear atritos diários, criar matrizes
                    de autonomia e registrar o redesenho participativo dos fluxos de trabalho.
                  </p>
                </div>
                <EstruturaVisual />
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Fale Conosco */}
          <Reveal delay={120} className="lg:col-span-6">
            <SpotlightCard spot="rgba(244,63,94,0.10)" className={CARD}>
              <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                <FaleConoscoVisual />
                <div>
                  <PillarHeader
                    icon={ShieldAlert}
                    tag="Pilar 5"
                    title="Canal de Escuta (Fale Conosco)"
                    concept="Módulo estratégico para proteção e acolhimento."
                    gradient="from-rose-500 to-pink-500"
                    tagTone="bg-rose-500/10 text-rose-600"
                  />
                  <p className="mt-4 text-[15px] leading-relaxed text-[#0B132B]/65">
                    O compliance não é apenas no papel. Ofereça um canal seguro e sigiloso para que os colaboradores realizem denúncias, tirem dúvidas e deem sugestões, mitigando fortemente riscos psicossociais ocultos.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600">
                    <Lock className="h-4 w-4" /> Anonimato garantido pela arquitetura do sistema
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>

        {/* E muito mais */}
        <Reveal delay={120} className="mt-10">
          <div className="rounded-3xl border border-[#0B132B]/[0.07] bg-white/70 p-6 backdrop-blur lg:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#0B132B]/45">
              E tudo isso conectado a
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {MORE.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[#0B132B]/[0.08] bg-white px-4 py-2 text-sm font-semibold text-[#0B132B]/75 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C853]/40 hover:text-[#0B132B] hover:shadow-md"
                >
                  <m.icon className="h-4 w-4 text-[#2979FF]" />
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
