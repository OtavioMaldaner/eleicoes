'use client';

import { geoIdentity, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SUPERFICIE } from '@/lib/cores';
import { UFS } from '@/lib/mapas/dados';

const UF_POR_IBGE = new Map(UFS.map((u) => [u.ibge, u.sigla]));
// Estados pequenos demais para a sigla caber dentro: ganham etiqueta à direita.
const PEQUENOS = new Set(['rn', 'pb', 'pe', 'al', 'se', 'es', 'rj', 'df']);
const MARGEM_ETIQUETAS = 70;
const ALTURA_ETIQUETA = 22;

type Forma = { uf: string; d: string; cx: number; cy: number };

// Etiquetas laterais de cima para baixo, sem se sobrepor e sem passar da altura do mapa.
function empilhar(formas: Forma[], altura: number): (Forma & { y: number })[] {
  const saida: (Forma & { y: number })[] = [];
  let y = -Infinity;
  for (const f of [...formas].sort((a, b) => a.cy - b.cy)) {
    y = Math.max(f.cy - ALTURA_ETIQUETA / 2, y + ALTURA_ETIQUETA + 3);
    saida.push({ ...f, y });
  }
  const sobra = Math.max(y + ALTURA_ETIQUETA + 2 - altura, 0);
  return saida.map((f) => ({ ...f, y: f.y - sobra }));
}

export type Pintura = { fill: string; opacidade: number };

type Props = {
  features: Feature[];
  pintura: (uf: string) => Pintura;
  rotulo: (uf: string) => string;
  selecionado: string | null;
  onSelecionar: (uf: string) => void;
  // Resumo ao passar o mouse (ou tocar) num estado; sem ele, vale a dica nativa do navegador.
  dica?: (uf: string) => ReactNode;
  // Círculo sobre o estado; `raio` é a fração (0 a 1) do raio máximo, que acompanha a largura do mapa.
  marcas?: (uf: string) => { raio: number; cor: string } | null;
};

const LARGURA_DICA = 340;
const ALTURA_DICA = 520; // estimativa, só para a dica não passar da base do mapa
const RAIO_MAXIMO = 0.045; // do raio da marca maior, em fração da largura do mapa

export function MapaBrasil({ features, pintura, rotulo, selecionado, onSelecionar, dica, marcas }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [sobre, setSobre] = useState<{ uf: string; x: number; y: number } | null>(null);
  const passar = (uf: string) => (e: React.PointerEvent) => {
    const r = caixa.current?.getBoundingClientRect();
    if (dica && r) setSobre({ uf, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const sair = () => setSobre(null);
  // Teclado: o foco abre o mesmo resumo do mouse, no centro do estado.
  const focar = (uf: string) => (e: React.FocusEvent<SVGElement>) => {
    const r = caixa.current?.getBoundingClientRect();
    const c = e.currentTarget.getBoundingClientRect();
    if (dica && r) setSobre({ uf, x: c.x + c.width / 2 - r.left, y: c.y + c.height / 2 - r.top });
  };
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = Math.round(Math.max(largura - MARGEM_ETIQUETAS, 0) * 0.98);

  const { formas, etiquetas } = useMemo(() => {
    if (!largura || features.length === 0) return { formas: [], etiquetas: [] };
    const colecao: FeatureCollection = { type: 'FeatureCollection', features };
    const proj = geoIdentity()
      .reflectY(true)
      .fitExtent(
        [
          [4, 4],
          [largura - MARGEM_ETIQUETAS, altura - 4],
        ],
        colecao,
      );
    const caminho = geoPath(proj);
    const formas = features.map((f) => {
      const uf = UF_POR_IBGE.get(String(f.properties?.codarea)) ?? '';
      const [cx, cy] = caminho.centroid(f);
      return { uf, d: caminho(f) ?? '', cx, cy };
    });
    const etiquetas = empilhar(formas.filter((f) => PEQUENOS.has(f.uf)), altura);
    return { formas, etiquetas };
  }, [features, largura, altura]);

  const xEtiqueta = largura - MARGEM_ETIQUETAS + 18;

  // Em tela estreita (celular) a dica não pode ser maior que o próprio mapa.
  const larguraDica = Math.min(LARGURA_DICA, Math.max(largura - 8, 0));

  return (
    <div ref={caixa} className="relative" style={{ minHeight: altura || undefined }}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label="Mapa do Brasil por estado">
          {formas.map((f) => {
            const p = pintura(f.uf);
            return (
              <path
                key={f.uf}
                d={f.d}
                fill={p.fill}
                fillOpacity={p.opacidade}
                stroke={SUPERFICIE}
                strokeWidth={1}
                strokeLinejoin="round"
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={rotulo(f.uf)}
                onClick={() => onSelecionar(f.uf)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelecionar(f.uf);
                  }
                }}
                onFocus={focar(f.uf)}
                onBlur={sair}
                onPointerEnter={passar(f.uf)}
                onPointerMove={passar(f.uf)}
                onPointerLeave={sair}
              >
                {!dica && <title>{rotulo(f.uf)}</title>}
              </path>
            );
          })}
          {formas
            .filter((f) => f.uf === selecionado)
            .map((f) => (
              <path key={f.uf} d={f.d} fill="none" stroke="#fafafa" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            ))}
          {marcas &&
            formas.map((f) => {
              const m = marcas(f.uf);
              return m && m.raio > 0 ? (
                <circle key={f.uf} cx={f.cx} cy={f.cy} r={m.raio * largura * RAIO_MAXIMO} fill={m.cor} fillOpacity={0.85} stroke={SUPERFICIE} strokeWidth={1.5} pointerEvents="none" />
              ) : null;
            })}
          {formas
            .filter((f) => !PEQUENOS.has(f.uf))
            .map((f) => (
              <text
                key={f.uf}
                x={f.cx}
                y={f.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                letterSpacing={1}
                fill="#fafafa"
                stroke={SUPERFICIE}
                strokeWidth={3}
                strokeOpacity={0.55}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {f.uf.toUpperCase()}
              </text>
            ))}
          {etiquetas.map((f) => {
            const p = pintura(f.uf);
            return (
              <g
                key={f.uf}
                className="cursor-pointer"
                onClick={() => onSelecionar(f.uf)}
                onPointerEnter={passar(f.uf)}
                onPointerMove={passar(f.uf)}
                onPointerLeave={sair}
              >
                {!dica && <title>{rotulo(f.uf)}</title>}
                <line x1={f.cx} y1={f.cy} x2={xEtiqueta} y2={f.y + ALTURA_ETIQUETA / 2} stroke="#71717a" strokeWidth={1} />
                <rect
                  x={xEtiqueta}
                  y={f.y}
                  width={48}
                  height={ALTURA_ETIQUETA}
                  rx={4}
                  fill={p.fill}
                  fillOpacity={p.opacidade}
                  stroke={f.uf === selecionado ? '#fafafa' : '#52525b'}
                  strokeWidth={f.uf === selecionado ? 2 : 1}
                />
                <text
                  x={xEtiqueta + 24}
                  y={f.y + ALTURA_ETIQUETA / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={1}
                  fill="#fafafa"
                  stroke={SUPERFICIE}
                  strokeWidth={3}
                  strokeOpacity={0.55}
                  paintOrder="stroke"
                >
                  {f.uf.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {dica && sobre && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 glass glass-forte rounded-xl border p-3.5 text-sm"
          style={{
            width: larguraDica,
            top: Math.min(Math.max(sobre.y - 12, 0), Math.max(altura - ALTURA_DICA, 0)),
            left: sobre.x + 16 + larguraDica > largura ? Math.max(sobre.x - 16 - larguraDica, 0) : sobre.x + 16,
          }}
        >
          {dica(sobre.uf)}
        </div>
      )}
    </div>
  );
}
