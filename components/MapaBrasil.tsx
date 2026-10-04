'use client';

import { geoIdentity, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
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
};

export function MapaBrasil({ features, pintura, rotulo, selecionado, onSelecionar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
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

  return (
    <div ref={caixa} style={{ minHeight: altura || undefined }}>
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
                onClick={() => onSelecionar(f.uf)}
              >
                <title>{rotulo(f.uf)}</title>
              </path>
            );
          })}
          {formas
            .filter((f) => f.uf === selecionado)
            .map((f) => (
              <path key={f.uf} d={f.d} fill="none" stroke="#fafafa" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            ))}
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
              <g key={f.uf} className="cursor-pointer" onClick={() => onSelecionar(f.uf)}>
                <title>{rotulo(f.uf)}</title>
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
    </div>
  );
}
