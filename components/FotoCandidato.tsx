import { BASE } from '@/lib/tse/config';

export function FotoCandidato({ id, cor }: { id: string; cor: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/6257/fotos/br/${id}.jpeg`}
      alt=""
      className="h-11 w-11 shrink-0 rounded-full bg-zinc-800 object-cover object-top"
      style={{ boxShadow: `0 0 0 2px #18181b, 0 0 0 4px ${cor}` }}
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  );
}
