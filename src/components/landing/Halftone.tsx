import { useMemo } from "react";

/** Ilustrações em meio-tom (pontos) da landing. Todas decorativas. */

const SPECTRUM = ["#d65620", "#9f7aee", "#4575cd", "#71d2f0", "#44b48b", "#f4df69"];

/** Contorno aproximado do Brasil, em [longitude, latitude]. */
const BRAZIL: [number, number][] = [
  [-51.6, 4.2],
  [-50.7, 2.2],
  [-50.0, 1.7],
  [-50.6, 0.2],
  [-49.9, -0.1],
  [-48.4, -0.9],
  [-46.5, -1.0],
  [-44.5, -2.4],
  [-41.5, -2.9],
  [-39.0, -3.0],
  [-38.5, -3.7],
  [-37.2, -4.8],
  [-35.2, -5.2],
  [-34.9, -6.5],
  [-34.9, -8.0],
  [-35.5, -9.5],
  [-37.0, -11.0],
  [-38.5, -13.0],
  [-39.0, -15.5],
  [-39.2, -18.0],
  [-40.0, -20.3],
  [-41.0, -22.0],
  [-42.0, -23.0],
  [-43.2, -23.0],
  [-44.7, -23.4],
  [-46.3, -24.0],
  [-48.0, -25.5],
  [-48.6, -26.5],
  [-48.6, -28.0],
  [-49.7, -29.3],
  [-50.9, -31.0],
  [-52.2, -32.2],
  [-53.4, -33.7],
  [-53.1, -32.0],
  [-53.8, -31.0],
  [-55.0, -30.0],
  [-56.0, -30.2],
  [-57.6, -30.2],
  [-56.0, -28.6],
  [-54.6, -27.0],
  [-53.7, -26.2],
  [-54.6, -25.6],
  [-54.6, -24.0],
  [-55.7, -22.2],
  [-57.9, -22.1],
  [-57.6, -20.0],
  [-58.2, -19.6],
  [-57.8, -17.5],
  [-58.4, -16.3],
  [-60.2, -16.3],
  [-60.5, -14.5],
  [-61.0, -13.5],
  [-62.5, -13.0],
  [-65.0, -11.7],
  [-65.4, -10.4],
  [-68.7, -11.0],
  [-70.6, -11.0],
  [-72.9, -9.5],
  [-73.6, -7.3],
  [-72.9, -5.0],
  [-70.0, -4.2],
  [-70.0, -2.0],
  [-69.5, -1.0],
  [-69.4, 0.5],
  [-67.0, 1.2],
  [-66.9, 2.2],
  [-64.0, 1.6],
  [-63.4, 2.4],
  [-64.0, 4.0],
  [-62.0, 4.2],
  [-60.5, 5.2],
  [-59.8, 1.8],
  [-57.0, 1.8],
  [-55.9, 2.0],
  [-54.6, 2.3],
  [-53.9, 2.3],
  [-52.6, 4.2],
];

function inside(x: number, y: number, poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const LON0 = -74.5;
const LON1 = -33.5;
const LAT0 = 6;
const LAT1 = -34.5;

/** Ponto (lon, lat) -> coordenada no viewBox 0..W, 0..H. */
function project(lon: number, lat: number, w: number, h: number) {
  return [((lon - LON0) / (LON1 - LON0)) * w, ((LAT0 - lat) / (LAT0 - LAT1)) * h] as const;
}

export function BrazilDots({ className = "" }: { className?: string }) {
  const W = 700;
  const H = 700;
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; c: string; o: number }[] = [];
    const step = 9;
    for (let x = step / 2; x < W; x += step) {
      for (let y = step / 2; y < H; y += step) {
        const lon = LON0 + (x / W) * (LON1 - LON0);
        const lat = LAT0 - (y / H) * (LAT0 - LAT1);
        const on = inside(lon, lat, BRAZIL);
        const t = x / W;
        const idx = Math.min(
          SPECTRUM.length - 1,
          Math.floor((1 - y / H) * 0.35 * SPECTRUM.length + t * 3),
        );
        if (on) {
          const wobble = 0.5 + 0.5 * Math.sin(x * 0.045) * Math.cos(y * 0.05);
          out.push({
            x,
            y,
            r: 1.3 + wobble * 1.5,
            c: SPECTRUM[Math.max(0, idx) % SPECTRUM.length],
            o: 0.35 + wobble * 0.5,
          });
        } else if ((Math.floor(x / step) + Math.floor(y / step)) % 2 === 0) {
          out.push({ x, y, r: 0.7, c: "#a9acb6", o: 0.22 });
        }
      }
    }
    return out;
  }, []);
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className={className}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={d.o} />
      ))}
    </svg>
  );
}

/** Rota tracejada em pontos entre duas cidades. Cidades: [lon, lat]. */
export function DotRoute({
  from,
  to,
  className = "",
}: {
  from: [number, number];
  to: [number, number];
  className?: string;
}) {
  const W = 700;
  const H = 700;
  const [x1, y1] = project(from[0], from[1], W, H);
  const [x2, y2] = project(to[0], to[1], W, H);
  const pts: { x: number; y: number }[] = [];
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 70 });
  }
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className={className}>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.4} fill="#111a4a" opacity={0.25 + (i / n) * 0.55} />
      ))}
      <circle cx={x1} cy={y1} r={4.5} fill="#111a4a" />
      <circle cx={x2} cy={y2} r={4.5} fill="#111a4a" />
    </svg>
  );
}

/** Colunas de pontos crescendo, com um ponto forte no topo (evolução de exemplo). */
export function DotBars({ className = "" }: { className?: string }) {
  const bars = useMemo(() => {
    const n = 26;
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const h = 4 + Math.round((t * 0.75 + 0.25 * Math.sin(i * 1.7) ** 2 * t) * 26);
      return { x: 20 + i * 26, h };
    });
  }, []);
  return (
    <svg aria-hidden viewBox="0 0 700 330" className={className}>
      {bars.map((b, i) => (
        <g key={i}>
          {Array.from({ length: b.h }).map((_, k) => (
            <circle
              key={k}
              cx={b.x}
              cy={310 - k * 10}
              r={1.5}
              fill="#44b48b"
              opacity={0.12 + (k / b.h) * 0.5}
            />
          ))}
          <circle cx={b.x} cy={310 - b.h * 10} r={4} fill="#167e6c" />
        </g>
      ))}
    </svg>
  );
}

/** Pixel art em meio-tom: a letra F da marca, em pontos verdes. */
const GLYPH = [
  "0111111111110",
  "0111111111110",
  "0111100000000",
  "0111100000000",
  "0111111110000",
  "0111111110000",
  "0111100000000",
  "0111100000000",
  "0111100000000",
  "0111100000000",
  "0111100000000",
];

export function GlyphDots({ className = "" }: { className?: string }) {
  const cell = 26;
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; c: string; o: number }[] = [];
    const cols = GLYPH[0].length + 4;
    const rows = GLYPH.length + 4;
    for (let r = 0; r < rows * 3; r++) {
      for (let c = 0; c < cols * 3; c++) {
        const gx = Math.floor(c / 3) - 2;
        const gy = Math.floor(r / 3) - 2;
        const on = GLYPH[gy]?.[gx] === "1";
        const seed = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const rnd = seed - Math.floor(seed);
        if (on) {
          out.push({
            x: c * (cell / 3) + 4,
            y: r * (cell / 3) + 4,
            r: 2.2 + rnd * 2.2,
            c: rnd > 0.5 ? "#72ac3f" : "#44b48b",
            o: 0.55 + rnd * 0.4,
          });
        } else if (rnd > 0.55) {
          out.push({ x: c * (cell / 3) + 4, y: r * (cell / 3) + 4, r: 0.9, c: "#a9acb6", o: 0.3 });
        }
      }
    }
    return { out, w: cols * cell, h: rows * cell };
  }, []);
  return (
    <svg aria-hidden viewBox={`0 0 ${dots.w} ${dots.h}`} className={className}>
      {dots.out.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={d.o} />
      ))}
    </svg>
  );
}

/** Três camadas empilhadas (isométrico) para a seção escura. */
export function LayerStack({ className = "" }: { className?: string }) {
  const slab = (y: number, top: string, side: string, front: string) => (
    <g transform={`translate(0 ${y})`}>
      <polygon points="150,40 260,80 150,120 40,80" fill={top} />
      <polygon points="40,80 150,120 150,146 40,106" fill={side} />
      <polygon points="260,80 150,120 150,146 260,106" fill={front} />
    </g>
  );
  return (
    <svg aria-hidden viewBox="0 0 520 260" className={className}>
      {slab(70, "#1b3b47", "#0c242d", "#123340")}
      {slab(35, "#284e5c", "#123340", "#1b3b47")}
      {slab(0, "#3d6a7b", "#1b3b47", "#284e5c")}
      {[
        ["Você", 66],
        ["FINLIST", 101],
        ["Seu banco", 136],
      ].map(([label, y]) => (
        <g key={label as string}>
          <line
            x1="262"
            y1={(y as number) + 4}
            x2="500"
            y2={(y as number) + 4}
            stroke="#2d5566"
            strokeWidth="1"
          />
          <text x="500" y={(y as number) - 4} textAnchor="end" fill="#a9b6bd" fontSize="11">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
