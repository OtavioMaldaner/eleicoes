'use client';

import { useState } from 'react';
import { MUNICIPIOS } from '@/lib/tse/config';

const chave = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();

const NOMES = MUNICIPIOS.map((m) => ({ ...m, k: chave(m.nm) }));

type Props = { valor: string | null; onMudar: (cd: string | null) => void };

export function SeletorMunicipio({ valor, onMudar }: Props) {
  const [texto, setTexto] = useState('');
  const atual = MUNICIPIOS.find((m) => m.cd === valor);

  function escolher(v: string, aoDigitar: boolean) {
    const k = chave(v);
    const exato = NOMES.find((m) => m.k === k);
    if (!exato) return;
    // Ao digitar, espera se o texto ainda pode virar outro município (ex.: "SANTA MARIA DO HERVAL").
    if (aoDigitar && NOMES.some((m) => m.k !== k && m.k.startsWith(k))) return;
    onMudar(exato.cd);
    setTexto('');
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        escolher(texto, false);
      }}
    >
      <div className="mr-auto">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Abrangência</p>
        <p className="font-semibold">{atual ? atual.nm : 'Geral: Brasil e RS'}</p>
      </div>
      <label className="flex flex-col text-xs text-zinc-400">
        Ver um município do RS
        <input
          list="municipios-rs"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            escolher(e.target.value, true);
          }}
          placeholder="Digite o nome"
          autoComplete="off"
          className="mt-1 w-56 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
        />
      </label>
      <datalist id="municipios-rs">
        {MUNICIPIOS.map((m) => (
          <option key={m.cd} value={m.nm} />
        ))}
      </datalist>
      <button type="submit" className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
        Ver
      </button>
      <button
        type="button"
        onClick={() => onMudar(null)}
        aria-pressed={!atual}
        className={`rounded border px-3 py-1 text-sm ${atual ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-emerald-400 bg-emerald-400 text-black'}`}
      >
        Geral
      </button>
    </form>
  );
}
