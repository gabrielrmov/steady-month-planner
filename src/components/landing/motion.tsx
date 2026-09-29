import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Revela o bloco quando ele entra na tela. No servidor e acima da dobra o conteúdo já aparece,
 * então nada some se o JavaScript não carregar. Só blocos abaixo da dobra começam escondidos.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"ssr" | "hidden" | "shown">("ssr");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setState("shown");
      return;
    }
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls =
    state === "hidden"
      ? "translate-y-6 opacity-0"
      : "transition-[opacity,transform,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";
  return (
    <div
      ref={ref}
      data-revealed={state !== "hidden"}
      className={`${cls} ${className}`}
      style={{ ...style, transitionDelay: state === "shown" ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
