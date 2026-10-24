'use client';

import { geoIdentity, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SUPERFICIE } from '@/lib/cores';

type Props = {
  titulo: string;
  features: Feature[];
  chaveDe: (f: Feature) => string;
  // 'plana' usa longitude/latitude direto (bom para um país); 'mundo' usa Natural Earth.
  projecao: 'plana' | 'mundo';
  proporcao: number; // altura / largura
  cor: (chave: string) => string;
  opacidade?: (chave: string) => number;
  rotulo: (chave: string) => string;
  selecionado: string | null;
  onSelecionar: (chave: string) => void;
  // Resumo ao passar o mouse (ou tocar); sem ele, vale a dica nativa do navegador.
  dica?: (chave: string) => ReactNode;
};

const LARGURA_DICA = 340;
const ALTURA_DICA = 440; // estimativa, só para a dica não passar da base do mapa

export function MapaCoropletico({ titulo, features, chaveDe, projecao, proporcao, cor, opacidade, rotulo, selecionado, onSelecionar, dica }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [sobre, setSobre] = useState<{ chave: string; x: number; y: number } | null>(null);
  const passar = (chave: string) => (e: React.PointerEvent) => {
    const r = caixa.current?.getBoundingClientRect();
    if (dica && r) setSobre({ chave, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = Math.round(largura * proporcao);

  const formas = useMemo(() => {
    if (!largura || features.length === 0) return [];
    const colecao: FeatureCollection = { type: 'FeatureCollection', features };
    const proj =
      projecao === 'plana' ? geoIdentity().reflectY(true).fitSize([largura, altura], colecao) : geoNaturalEarth1().fitSize([largura, altura], colecao);
    const caminho = geoPath(proj);
    return features.map((f, i) => ({ id: `${chaveDe(f)}-${i}`, chave: chaveDe(f), d: caminho(f) ?? '' }));
  }, [features, chaveDe, projecao, largura, altura]);

  // Em tela estreita (celular) a dica não pode ser maior que o próprio mapa.
  const larguraDica = Math.min(LARGURA_DICA, Math.max(largura - 8, 0));

  return (
    <div ref={caixa} className="relative" style={{ minHeight: altura || undefined }}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={titulo}>
          {formas.map((f) => (
            <path
              key={f.id}
              d={f.d}
              fill={cor(f.chave)}
              fillOpacity={opacidade?.(f.chave) ?? 1}
              stroke={SUPERFICIE}
              strokeWidth={0.75}
              strokeLinejoin="round"
              className="cursor-pointer"
              onPointerEnter={(e) => {
                onSelecionar(f.chave);
                passar(f.chave)(e);
              }}
              onPointerMove={passar(f.chave)}
              onPointerLeave={() => setSobre(null)}
              onClick={() => onSelecionar(f.chave)}
            >
              {!dica && <title>{rotulo(f.chave)}</title>}
            </path>
          ))}
          {/* Contorno do selecionado por cima, sem mexer nos demais. */}
          {formas
            .filter((f) => f.chave === selecionado)
            .map((f) => (
              <path key={f.id} d={f.d} fill="none" stroke="#fafafa" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            ))}
        </svg>
      )}
      {dica && sobre && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 rounded-xl border border-zinc-700 bg-zinc-950/95 p-3.5 text-sm shadow-2xl backdrop-blur"
          style={{
            width: larguraDica,
            top: Math.min(Math.max(sobre.y - 12, 0), Math.max(altura - ALTURA_DICA, 0)),
            left: sobre.x + 16 + larguraDica > largura ? Math.max(sobre.x - 16 - larguraDica, 0) : sobre.x + 16,
          }}
        >
          {dica(sobre.chave)}
        </div>
      )}
    </div>
  );
}
