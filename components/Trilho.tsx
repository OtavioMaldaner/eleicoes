'use client';

import { useEffect, useRef, type ComponentProps } from 'react';

type Props = ComponentProps<'div'> & { como?: 'div' | 'nav' };

// Trilho de vidro de um controle segmentado. A pílula selecionada é um elemento só, que desliza até o
// item ativo (aria-current ou aria-pressed). A posição é escrita direto no DOM: não gera nova renderização.
export function Trilho({ como: Tag = 'div', className = '', children, ...resto }: Props) {
  const trilho = useRef<HTMLDivElement>(null);
  const pilula = useRef<HTMLSpanElement>(null);
  const primeira = useRef(true);

  useEffect(() => {
    const el = trilho.current;
    const p = pilula.current;
    if (!el || !p) return;
    const ajustar = () => {
      const ativo = el.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
      if (!ativo) {
        p.style.opacity = '0';
        return;
      }
      // Na primeira medição a pílula aparece já no lugar, sem deslizar da origem.
      if (primeira.current) p.style.transition = 'none';
      p.style.opacity = '1';
      p.style.width = `${ativo.offsetWidth}px`;
      p.style.height = `${ativo.offsetHeight}px`;
      p.style.transform = `translate(${ativo.offsetLeft}px, ${ativo.offsetTop}px)`;
      if (primeira.current) {
        primeira.current = false;
        p.getBoundingClientRect();
        p.style.transition = '';
      }
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    // Troca de seleção sem mudança de tamanho: observa os atributos dos itens.
    const mo = new MutationObserver(ajustar);
    mo.observe(el, { attributes: true, subtree: true, attributeFilter: ['aria-pressed', 'aria-current'] });
    document.fonts?.ready.then(ajustar).catch(() => {});
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    // O wrapper de `como` é só para a semântica (nav/group); o trilho em si é o filho posicionado.
    <Tag {...resto} ref={trilho as never} className={`glass-trilho rounded-full border p-1 ${className}`}>
      <span ref={pilula} aria-hidden="true" className="glass-pilula pointer-events-none absolute left-0 top-0 rounded-full opacity-0" />
      {children}
    </Tag>
  );
}
