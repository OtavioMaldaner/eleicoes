import { hemiciclo } from '@/lib/brasil/senado';

export type Cadeira = { cor: string; opacidade?: number; titulo: string };

type Props = { cadeiras: Cadeira[]; fileiras: number; rotulo: string; children?: React.ReactNode };

const L = 300;
const A = 160;
const RAIO = 138;

// Cadeiras em semicírculo, preenchidas da esquerda para a direita na ordem recebida.
export function Hemiciclo({ cadeiras, fileiras, rotulo, children }: Props) {
  const posicoes = hemiciclo(cadeiras.length, fileiras);
  // O raio da cadeira diminui quando há muitas, para não se sobreporem nem entre fileiras nem ao longo do arco.
  const entreFileiras = (RAIO * 0.55) / Math.max(fileiras - 1, 1);
  const noArco = (Math.PI * RAIO * 0.725 * fileiras) / Math.max(cadeiras.length, 1);
  const r = Math.max(1.6, Math.min(6.5, 0.42 * Math.min(entreFileiras, noArco)));
  return (
    <div className="relative mx-auto" style={{ maxWidth: L }}>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={rotulo}>
        {posicoes.map((p, i) => (
          <circle key={i} cx={L / 2 + p.x * RAIO} cy={A - 8 - p.y * RAIO} r={r} fill={cadeiras[i].cor} fillOpacity={cadeiras[i].opacidade ?? 1}>
            <title>{cadeiras[i].titulo}</title>
          </circle>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center leading-none">{children}</div>
    </div>
  );
}
