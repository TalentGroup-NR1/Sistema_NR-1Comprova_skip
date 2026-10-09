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
  PlayCircle,
  ShieldAlert,
  FileBarChart2,
  Lock,
  Shield,
  Lightbulb,
  HelpCircle,
  Star,
  UserCheck,
  Sparkles,
  Clock,
  Play,
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
  const [activeCourse, setActiveCourse] = useState(0);

  const COURSES = [
    {
      id: 0,
      title: "Comunicação Não Violenta (CNV)",
      category: "Saúde e Bem-estar",
      duration: "12:00 min",
      tag: "Obrigatório",
      tagColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      status: "Em andamento",
      progress: "85%",
      gradient: "from-amber-400/20 via-orange-400/20 to-rose-400/20",
      accent: "#FF9100",
    },
    {
      id: 1,
      title: "Associando Alto Desempenho e Bem-Estar",
      category: "Saúde e Bem-estar",
      duration: "36:00 min",
      tag: "Recomendado",
      tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      status: "Concluído",
      progress: "100%",
      gradient: "from-emerald-400/20 via-teal-400/20 to-blue-400/20",
      accent: "#00E676",
    },
    {
      id: 2,
      title: "Gestão de Emoções e Estresse Ocupacional",
      category: "Saúde e Bem-estar",
      duration: "48:00 min",
      tag: "NR-01 Psico",
      tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      status: "Disponível",
      progress: "0%",
      gradient: "from-blue-500/20 via-indigo-500/20 to-purple-500/20",
      accent: "#2979FF",
    },
  ];

  // Alterna o curso com simulação de foco/cursor do colaborador
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCourse((prev) => (prev + 1) % COURSES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [COURSES.length]);

  const selected = COURSES[activeCourse];

  return (
    <div className="relative mt-2 flex flex-col gap-3 w-full">
      {/* Banner Principal em Destaque (Inspirado no Card de CNV da tela real) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#0B132B]/[0.08] bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-4 shadow-sm transition-all duration-500">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#2979FF]/10 px-2 py-0.5 text-[9px] font-bold text-[#1E4FB8]">
                <Sparkles className="h-2.5 w-2.5" /> Em Destaque
              </span>
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${selected.tagColor}`}>
                {selected.tag}
              </span>
            </div>
            <h5 className="text-xs sm:text-sm font-extrabold text-[#0B132B] line-clamp-1">
              {selected.title}
            </h5>
            <p className="text-[10px] text-[#0B132B]/55 flex items-center gap-2 font-medium">
              <span>{selected.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {selected.duration}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2979FF] to-[#00E5FF] p-2 text-white shadow-md shadow-[#2979FF]/20">
            <Play className="h-4 w-4 fill-white" />
          </div>
        </div>

        {/* Barra de Progresso com Percentual */}
        <div className="mt-3">
          <div className="flex justify-between text-[9px] font-semibold text-[#0B132B]/60 mb-1">
            <span>Progresso da Trilha</span>
            <span className="font-bold text-[#1E4FB8]">{selected.progress}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#0B132B]/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2979FF] to-[#00E5FF] transition-all duration-700 ease-out"
              style={{ width: selected.progress }}
            />
          </div>
        </div>
      </div>

      {/* Mini-Carrossel de Miniaturas de Cursos (Simula o colaborador navegando pelo catálogo) */}
      <div className="grid grid-cols-3 gap-2">
        {COURSES.map((c, idx) => {
          const isCurrent = activeCourse === idx;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCourse(idx)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-2 text-left transition-all duration-300 ${
                isCurrent
                  ? "border-[#2979FF] bg-white shadow-md shadow-[#2979FF]/10 ring-1 ring-[#2979FF] scale-[1.03]"
                  : "border-[#0B132B]/[0.08] bg-[#F8FAFC] opacity-75 hover:opacity-100 hover:bg-white"
              }`}
            >
              {/* Mini Capa Gradiente */}
              <div className={`h-10 w-full rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center relative mb-2`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform duration-300 ${isCurrent ? "scale-110" : ""}`}>
                  <PlayCircle className="h-3.5 w-3.5 text-[#2979FF]" />
                </div>
                {isCurrent && (
                  <span className="absolute bottom-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div>
                <p className="line-clamp-1 text-[10px] font-bold text-[#0B132B] leading-tight">
                  {c.title}
                </p>
                <p className="mt-0.5 text-[8px] font-medium text-[#0B132B]/50 flex items-center justify-between">
                  <span>{c.duration}</span>
                  <span className="font-semibold text-emerald-600">{c.status}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Simulação do Ponteiro/Cursor do Colaborador escolhendo cursos */}
      <div
        className="pointer-events-none absolute h-5 w-5 transition-all duration-700 ease-out z-10"
        style={{
          left: `${activeCourse === 0 ? "18%" : activeCourse === 1 ? "52%" : "84%"}`,
          bottom: "35px",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.44c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z" fill="white" stroke="#0B132B" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function DiarioVisual() {
  const [activeMarco, setActiveMarco] = useState(0);

  const MARCOS = [
    {
      d: "30d",
      label: "Integração",
      nome: "Laíse Sapienza",
      cargo: "Analista de Soluções",
      statusBadge: "Profissional em Ascensão",
      badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      mediaColaborador: "9.8",
      mediaGestor: "9.3",
      alinhamento: "95%",
      scoreGeral: "9.5",
      perguntaColab: "Clareza e Alinhamento das Atividades",
      notaColab: "9/10",
      perguntaGestor: "Engajamento e Progresso Técnico",
      notaGestor: "9/10",
      gap: "0.0",
      gapLabel: "Alto Alinhamento",
    },
    {
      d: "80d",
      label: "Autonomia",
      nome: "Rafael Rodrigues",
      cargo: "Analista Tech III",
      statusBadge: "Integração Consolidada",
      badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      mediaColaborador: "9.4",
      mediaGestor: "9.1",
      alinhamento: "97%",
      scoreGeral: "9.3",
      perguntaColab: "Autonomia e Tomada de Decisão",
      notaColab: "9/10",
      perguntaGestor: "Qualidade das Entregas e Prazos",
      notaGestor: "9/10",
      gap: "0.3",
      gapLabel: "Alto Alinhamento",
    },
    {
      d: "120d",
      label: "Alinhamento",
      nome: "Bruno Silva Pinto",
      cargo: "Auditor Interno",
      statusBadge: "Retenção Confirmada",
      badgeColor: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      mediaColaborador: "9.6",
      mediaGestor: "9.5",
      alinhamento: "99%",
      scoreGeral: "9.6",
      perguntaColab: "Fit Cultural e Pertencimento",
      notaColab: "10/10",
      perguntaGestor: "Visão Sistêmica e Proatividade",
      notaGestor: "9/10",
      gap: "0.1",
      gapLabel: "Alto Alinhamento",
    },
  ];

  // Alternância automática a cada 4 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMarco((prev) => (prev + 1) % MARCOS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [MARCOS.length]);

  const curr = MARCOS[activeMarco];

  return (
    <div className="relative flex flex-col gap-3.5 w-full">
      {/* Timeline de Seleção dos Marcos */}
      <div className="relative flex items-center justify-between rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.05] to-orange-500/[0.03] p-1.5">
        {MARCOS.map((m, idx) => {
          const isActive = activeMarco === idx;
          return (
            <button
              key={m.d}
              type="button"
              onClick={() => setActiveMarco(idx)}
              className={`group relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-bold transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]"
                  : "text-[#0B132B]/60 hover:text-[#0B132B] hover:bg-white/70"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold ${
                  isActive ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                {idx + 1}
              </span>
              <span>{m.d}</span>
              <span className={`text-[11px] font-medium ${isActive ? "text-white/90" : "text-[#0B132B]/50"}`}>
                ({m.label})
              </span>
            </button>
          );
        })}
      </div>

      {/* Mini-Card Simulação do Dashboard do Colaborador */}
      <div className="overflow-hidden rounded-2xl border border-[#0B132B]/[0.08] bg-white p-4 shadow-sm transition-all duration-500">
        {/* Topo: Nome, Cargo e Badge de Ascensão */}
        <div className="flex items-center justify-between border-b border-[#0B132B]/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-extrabold text-white shadow-sm">
              {curr.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="text-sm font-bold text-[#0B132B] leading-tight">{curr.nome}</p>
              <p className="text-[11px] text-[#0B132B]/50 font-medium">{curr.cargo} · Marco {curr.d}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${curr.badgeColor}`}>
            <Sparkles className="h-3 w-3" />
            {curr.statusBadge}
          </span>
        </div>

        {/* 4 Indicadores Chave Lado a Lado (Conforme Tela Real) */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-amber-50/70 border border-amber-200/50 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#0B132B]/45">Colab</p>
            <p className="text-sm font-extrabold text-amber-600 sm:text-base">{curr.mediaColaborador}</p>
          </div>
          <div className="rounded-xl bg-orange-50/70 border border-orange-200/50 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#0B132B]/45">Gestor</p>
            <p className="text-sm font-extrabold text-orange-600 sm:text-base">{curr.mediaGestor}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/50 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/60">Alinhamento</p>
            <p className="text-sm font-extrabold text-emerald-600 sm:text-base">{curr.alinhamento}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#0B132B]/45">Score</p>
            <p className="text-sm font-extrabold text-[#0B132B] sm:text-base">{curr.scoreGeral}</p>
          </div>
        </div>

        {/* Comparação Lado a Lado (Colaborador x Alinhamento x Gestor) */}
        <div className="mt-3 rounded-xl border border-[#0B132B]/[0.05] bg-[#F8FAFC] p-2.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#0B132B]/50 px-1 mb-2">
            <span className="flex items-center gap-1.5 text-amber-700">
              <UserCheck className="h-3.5 w-3.5" /> Colaborador
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-extrabold text-[9px]">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Δ {curr.gap} ({curr.gapLabel})
            </span>
            <span className="flex items-center gap-1.5 text-orange-700">
              Gestão Técnica <UserCheck className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#0B132B]/[0.05]">
              <span className="truncate pr-1.5 text-[#0B132B]/75 font-medium">{curr.perguntaColab}</span>
              <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[10px]">
                {curr.notaColab}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#0B132B]/[0.05]">
              <span className="truncate pr-1.5 text-[#0B132B]/75 font-medium">{curr.perguntaGestor}</span>
              <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[10px]">
                {curr.notaGestor}
              </span>
            </div>
          </div>
        </div>
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
                    concept="O termômetro em tempo real do bem-estar da sua equipe."
                    gradient="from-[#7C4DFF] to-[#B388FF]"
                    tagTone="bg-[#7C4DFF]/10 text-[#5E35B1]"
                  />
                  <p className="mt-4 text-[15px] leading-relaxed text-[#0B132B]/65">
                    Pulsos semanais rápidos que criam um canal de escuta ativa: o profissional compartilha como foi sua semana e a gestão assume a responsabilidade de acompanhar, agir e registrar cada evidência de melhoria.
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

          {/* Diário de Bordo (Destaque total com 6 colunas, layout horizontal amplo) */}
          <Reveal className="lg:col-span-6">
            <SpotlightCard spot="rgba(255,171,0,0.12)" className={CARD}>
              <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
                <div>
                  <PillarHeader
                    icon={CalendarCheck2}
                    tag="Pilar 3"
                    title="Diário de Bordo"
                    concept="Onboarding e retenção nos marcos de 30, 80 e 120 dias."
                    gradient="from-amber-400 to-orange-500"
                    tagTone="bg-amber-100 text-amber-800"
                  />
                  <p className="mt-4 text-[15px] leading-relaxed text-[#0B132B]/65">
                    Check-ins estruturados entre colaborador e gestor medem integração, volume de
                    trabalho, autonomia e expectativas.
                  </p>
                </div>
                <DiarioVisual />
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
                    tag="Pilar 4"
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
