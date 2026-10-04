'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGINAS = [
  { href: '/', rotulo: 'Rio Grande do Sul', curto: 'RS' },
  { href: '/brasil', rotulo: 'Brasil', curto: 'Brasil' },
  { href: '/exterior', rotulo: 'Exterior', curto: 'Exterior' },
];

export function Cabecalho() {
  const atual = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center gap-x-4 px-3 py-2.5 sm:px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight">Eleições 2026</span>
            <span className="hidden text-[11px] uppercase tracking-widest text-zinc-400 sm:block">Apuração ao vivo · 1º turno</span>
          </span>
        </Link>
        <nav aria-label="Páginas" className="ml-auto flex rounded-full border border-zinc-800 bg-zinc-900 p-1">
          {PAGINAS.map((p) => {
            const ativo = atual === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={ativo ? 'page' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium sm:px-4 transition-colors ${
                  ativo ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span className="sm:hidden">{p.curto}</span>
                <span className="hidden sm:inline">{p.rotulo}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
