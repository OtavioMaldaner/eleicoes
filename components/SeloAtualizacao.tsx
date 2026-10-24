'use client';

import { useEffect, useState } from 'react';
import { idadeDosDados, textoIdade, type NivelIdade } from '@/lib/idade';
import type { Meta } from '@/lib/tse/falhas';

// A pílula é sempre neutra; só a bolinha indica o estado: verde (dado fresco), âmbar (atrasado, ou o TSE
// está instável e o site mostra o último dado bom) ou cinza (parado). Nunca vermelho, que no site é cor de candidato.
const BOLINHA: Record<NivelIdade, string> = {
  ok: 'bg-emerald-400',
  atencao: 'bg-amber-400',
  critico: 'bg-zinc-500', // parado: cinza, porque vermelho é cor de candidato
};

// "Atualizado às HH:MM:SS"; quando o servidor avisa que são a última cópia boa (`meta.desatualizado`),
// diz de que hora são; quando os dados envelhecem sem esse aviso, mostra há quanto tempo e muda a cor da
// bolinha, para ninguém ler número parado como se fosse ao vivo.
export function SeloAtualizacao({ buscadoEm, desatualizado, meta, prefixo }: { buscadoEm: string; desatualizado?: boolean; meta?: Meta; prefixo?: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    tique();
    const id = setInterval(tique, 5000);
    return () => clearInterval(id);
  }, []);
  const obtidoEm = meta?.obtidoEm ?? buscadoEm;
  const marcado = meta?.desatualizado ?? desatualizado ?? false;
  const hora = new Date(obtidoEm).toLocaleTimeString('pt-BR');
  const { segundos, nivel } = idadeDosDados(obtidoEm, agora ?? Date.parse(obtidoEm), marcado);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300"
      role={nivel === 'ok' ? undefined : 'status'}
    >
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${BOLINHA[nivel]}`} />
      <span>
        {prefixo}
        {marcado
          ? `TSE instável · mostrando dados de ${hora}`
          : nivel === 'ok'
            ? `atualizado às ${hora}`
            : `sem novidades do TSE há ${textoIdade(segundos)} · última leitura às ${hora}`}
      </span>
    </span>
  );
}
