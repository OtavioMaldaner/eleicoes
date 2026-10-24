'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trilho } from './Trilho';

// Duas abas principais; o 1º turno tem páginas próprias, o 2º turno é uma tela só.
const TURNOS = [
  { href: '/', rotulo: '1º turno', segundo: false },
  { href: '/segundo-turno', rotulo: '2º turno', segundo: true },
];
const PAGINAS_1T = [
  { href: '/', rotulo: 'Rio Grande do Sul', curto: 'RS' },
  { href: '/brasil', rotulo: 'Brasil', curto: 'Brasil' },
  { href: '/exterior', rotulo: 'Exterior', curto: 'Exterior' },
];

const PAGINAS_2T = [
  { href: '/segundo-turno', rotulo: 'Brasil', curto: 'Brasil' },
  { href: '/segundo-turno/exterior', rotulo: 'Exterior', curto: 'Exterior' },
];

// O fundo da opção ativa é a pílula de vidro do Trilho, que desliza; aqui só muda a cor do texto.
const pilula = (ativo: boolean, extra = '') =>
  `relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${extra} ${
    ativo ? 'text-white' : 'text-zinc-300 hover:text-white'
  }`;

export function Cabecalho() {
  const atual = usePathname();
  const segundo = atual?.startsWith('/segundo-turno') ?? false;
  const paginas = segundo ? PAGINAS_2T : PAGINAS_1T;
  return (
    <header className="glass sticky top-0 z-20 border-b">
      <div className="mx-auto flex max-w-[1800px] items-center gap-x-4 px-3 py-2.5 sm:px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight">Eleições 2026</span>
            <span className="hidden text-[11px] uppercase tracking-widest text-zinc-400 sm:block">Apuração ao vivo · {segundo ? '2º' : '1º'} turno</span>
          </span>
        </Link>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Trilho como="nav" aria-label={segundo ? 'Páginas do 2º turno' : 'Páginas do 1º turno'} className="flex">
            {paginas.map((p) => {
              const ativo = atual === p.href;
              return (
                <Link key={p.href} href={p.href} aria-current={ativo ? 'page' : undefined} className={pilula(ativo, 'sm:px-4')}>
                  <span className="sm:hidden">{p.curto}</span>
                  <span className="hidden sm:inline">{p.rotulo}</span>
                </Link>
              );
            })}
          </Trilho>
          <Trilho como="nav" aria-label="Turno" className="flex">
            {TURNOS.map((t) => {
              const ativo = t.segundo === segundo;
              return (
                <Link key={t.href} href={t.href} aria-current={ativo ? 'page' : undefined} className={pilula(ativo, 'sm:px-5')}>
                  {t.rotulo}
                </Link>
              );
            })}
          </Trilho>
        </div>
      </div>
    </header>
  );
}
