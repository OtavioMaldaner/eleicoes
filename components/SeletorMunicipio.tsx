'use client';

import { useState } from 'react';
import { acharMunicipio } from '@/lib/tse/buscaMunicipio';
import { MUNICIPIOS } from '@/lib/tse/config';

type Props = { valor: string | null; onMudar: (cd: string | null) => void };

export function SeletorMunicipio({ valor, onMudar }: Props) {
  const [texto, setTexto] = useState('');
  const atual = MUNICIPIOS.find((m) => m.cd === valor);

  function escolher(v: string, aoDigitar: boolean) {
    const cd = acharMunicipio(v, aoDigitar);
    if (!cd) return;
    onMudar(cd);
    setTexto('');
  }

  const pilula = 'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors';
  const ativa = 'bg-emerald-400 text-zinc-950';
  const inativa = 'text-zinc-300 hover:bg-zinc-800 hover:text-white';

  return (
    <form
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        escolher(texto, false);
      }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Abrangência</span>
      <div className="flex items-center rounded-full border border-zinc-800 bg-zinc-900 p-1">
        <button type="button" onClick={() => onMudar(null)} aria-pressed={!atual} className={`${pilula} ${atual ? inativa : ativa}`}>
          Todo o RS
        </button>
        {atual && (
          <span className={`${pilula} ${ativa} flex items-center gap-2`}>
            {atual.nm}
            <button type="button" onClick={() => onMudar(null)} aria-label={`Sair de ${atual.nm} e voltar para todo o RS`} className="-mr-1 rounded-full px-1.5 leading-none hover:bg-emerald-600">
              ×
            </button>
          </span>
        )}
      </div>
      <label className="flex min-w-0 basis-full items-center gap-2 sm:max-w-sm sm:flex-1 sm:basis-auto">
        <span className="sr-only">Ver um município do RS</span>
        <input
          list="municipios-rs"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            // Escolher um item da lista não chega como digitação e vale na hora.
            const tipo = (e.nativeEvent as InputEvent).inputType;
            escolher(e.target.value, typeof tipo === 'string' && tipo !== 'insertReplacementText');
          }}
          placeholder={atual ? 'Trocar de município…' : 'Ver um município do RS…'}
          autoComplete="off"
          className="w-full min-w-0 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
        />
      </label>
      <datalist id="municipios-rs">
        {MUNICIPIOS.map((m) => (
          <option key={m.cd} value={m.nm} />
        ))}
      </datalist>
    </form>
  );
}
