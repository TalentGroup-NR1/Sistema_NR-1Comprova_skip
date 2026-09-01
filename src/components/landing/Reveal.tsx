import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Atraso em ms para efeito escalonado. */
  delay?: number;
  as?: "div" | "section" | "article" | "li";
}

/** Fade-in + slide-up ao entrar na viewport. Respeita prefers-reduced-motion via CSS. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Tag = as as "div";

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("landing-reveal", inView && "landing-reveal-in", className)}
    >
      {children}
    </Tag>
  );
}
