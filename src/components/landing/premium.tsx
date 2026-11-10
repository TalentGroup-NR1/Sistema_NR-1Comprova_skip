import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";

/** Card com "spotlight" que acompanha o cursor (micro-interação premium). */
export function SpotlightCard({
  children,
  className,
  spot,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Cor do brilho (rgba). */
  spot?: string;
  id?: string;
}) {
  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      id={id}
      onMouseMove={handleMove}
      style={spot ? ({ "--lp-spot": spot } as CSSProperties) : undefined}
      className={cn("lp-spotlight", className)}
    >
      {children}
    </div>
  );
}

/** Rótulo pequeno acima dos títulos de seção. */
export function Eyebrow({
  children,
  tone = "dark",
  className,
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
        tone === "dark"
          ? "border border-white/10 bg-white/5 text-[#00E5FF]"
          : "border border-[#0B132B]/10 bg-white text-[#0B132B]/70 shadow-sm",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#00E676] to-[#00E5FF]" />
      {children}
    </span>
  );
}

/** Contador animado que inicia quando entra na viewport. */
export function CountUp({
  to,
  duration = 1600,
  prefix = "",
  suffix = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (to === 0) {
      setValue(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
