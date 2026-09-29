import { useEffect, useRef, useState } from "react";

/**
 * Anima suavemente de um número até o próximo (ex.: 0 → 2.109,60 ao carregar, ou do mês
 * anterior → atual ao trocar de mês). Com "reduzir movimento", vai direto ao valor final.
 */
export function useAnimatedNumber(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = first.current ? 0 : from.current;
    first.current = false;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
