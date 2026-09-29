import { useEffect, useRef, useState } from "react";

/** true depois que a página rolou um pouco. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > offset);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [offset]);
  return scrolled;
}

/** Move o elemento devagar conforme a rolagem (paralaxe leve), sem re-render. */
export function useParallax<T extends HTMLElement>(factor = -0.06, max = 90) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.max(-max, Math.min(max, window.scrollY * factor));
        if (ref.current) ref.current.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
    };
  }, [factor, max]);
  return ref;
}

/** Largura (0..100%) da barra de progresso de leitura, atualizada sem re-render. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${pct / 100})`;
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return ref;
}
