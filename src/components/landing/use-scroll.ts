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

/** true quando a media query casa (só no navegador; no servidor é false). */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Inclina o elemento em 3D seguindo o mouse. Só liga onde há mouse e sem "reduzir movimento". */
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
    };
    const leave = () => {
      el.style.transform = "";
    };
    el.style.transition = "transform 0.25s ease-out";
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [max]);
  return ref;
}

/** Atualiza --mx/--my nos elementos .spotlight sob o mouse (um único listener). */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const on = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("mousemove", on, { passive: true });
    return () => document.removeEventListener("mousemove", on);
  }, []);
}
