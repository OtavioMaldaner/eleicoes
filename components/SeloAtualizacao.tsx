'use client';

import { useEffect, useState } from 'react';
import { idadeDosDados, textoIdade, type NivelIdade } from '@/lib/idade';

const COR: Record<NivelIdade, string> = {
  ok: 'text-zinc-400',
  atencao: 'rounded-full border border-amber-500/60 bg-amber-950/40 px-2.5 py-0.5 text-amber-200',
  critico: 'rounded-full border border-red-500 bg-red-950 px-2.5 py-0.5 text-red-200',
};

// "Atualizado às HH:MM:SS"; quando os dados envelhecem (ou o servidor avisa que são a última cópia
// boa), mostra há quanto tempo e muda de cor, para ninguém ler número parado como se fosse ao vivo.
export function SeloAtualizacao({ buscadoEm, desatualizado, prefixo }: { buscadoEm: string; desatualizado?: boolean; prefixo?: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    tique();
    const id = setInterval(tique, 5000);
    return () => clearInterval(id);
  }, []);
  const hora = new Date(buscadoEm).toLocaleTimeString('pt-BR');
  const { segundos, nivel } = idadeDosDados(buscadoEm, agora ?? Date.parse(buscadoEm), desatualizado);
  return (
    <span className={COR[nivel]} role={nivel === 'ok' ? undefined : 'status'}>
      {prefixo}
      {nivel === 'ok' ? `atualizado às ${hora}` : `sem novidades do TSE há ${textoIdade(segundos)} · última leitura às ${hora}`}
    </span>
  );
}
