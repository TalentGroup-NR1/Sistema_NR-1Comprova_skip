import { useEffect, useRef, useState } from "react";

/**
 * Observa um elemento e retorna true quando ele entra na viewport (uma única vez).
 * Usado nas animações de entrada da landing page — sem dependências externas.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(rootMargin = "-10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
