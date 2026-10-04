'use client';

import { geoIdentity, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SUPERFICIE } from '@/lib/cores';

type Props = {
  titulo: string;
  features: Feature[];
  chaveDe: (f: Feature) => string;
  // 'plana' usa longitude/latitude direto (bom para um país); 'mundo' usa Natural Earth.
  projecao: 'plana' | 'mundo';
  proporcao: number; // altura / largura
  cor: (chave: string) => string;
  rotulo: (chave: string) => string;
  selecionado: string | null;
  onSelecionar: (chave: string) => void;
};

export function MapaCoropletico({ titulo, features, chaveDe, projecao, proporcao, cor, rotulo, selecionado, onSelecionar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
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
      projecao === 'plana'
        ? geoIdentity().reflectY(true).fitSize([largura, altura], colecao)
        : geoNaturalEarth1().fitSize([largura, altura], colecao);
    const caminho = geoPath(proj);
    return features.map((f) => ({ chave: chaveDe(f), d: caminho(f) ?? '' }));
  }, [features, chaveDe, projecao, largura, altura]);

  // O selecionado é desenhado por último para o contorno ficar por cima.
  const ordenadas = [...formas].sort((a, b) => Number(a.chave === selecionado) - Number(b.chave === selecionado));

  return (
    <div ref={caixa} style={{ minHeight: altura || undefined }}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={titulo}>
          {ordenadas.map((f, i) => (
            <path
              key={`${f.chave}-${i}`}
              d={f.d}
              fill={cor(f.chave)}
              stroke={f.chave === selecionado ? '#fafafa' : SUPERFICIE}
              strokeWidth={f.chave === selecionado ? 2 : 0.75}
              strokeLinejoin="round"
              className="cursor-pointer"
              onPointerEnter={() => onSelecionar(f.chave)}
              onClick={() => onSelecionar(f.chave)}
            >
              <title>{rotulo(f.chave)}</title>
            </path>
          ))}
        </svg>
      )}
    </div>
  );
}
