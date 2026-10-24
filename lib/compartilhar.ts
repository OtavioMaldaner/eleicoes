// Gera uma imagem (PNG) do mapa com o placar, para baixar ou compartilhar. Tudo no navegador.

export type Linha = { rotulo: string; valor: string; cor: string };
type Dados = { svg: SVGSVGElement; titulo: string; subtitulo: string; linhas: Linha[]; rodape: string };

const L = 1200;
const FUNDO = '#09090b';

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error('Não foi possível desenhar o mapa'));
    img.src = src;
  });
}

async function desenharMapa(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('font-family', 'system-ui, sans-serif'); // sem o CSS da página, o texto do SVG cairia numa fonte com serifa
  const w = svg.getBoundingClientRect().width || Number(svg.getAttribute('width'));
  const h = svg.getBoundingClientRect().height || Number(svg.getAttribute('height'));
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  return carregar(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
}

export async function gerarImagem({ svg, titulo, subtitulo, linhas, rodape }: Dados): Promise<Blob> {
  const mapa = await desenharMapa(svg);
  const escala = Math.min((L - 80) / mapa.width, 1100 / mapa.height);
  const mw = mapa.width * escala;
  const mh = mapa.height * escala;
  const topo = 230 + linhas.length * 56;
  const alt = Math.round(topo + mh + 90);

  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = alt;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas indisponível');
  c.fillStyle = FUNDO;
  c.fillRect(0, 0, L, alt);

  c.fillStyle = '#fafafa';
  c.font = '700 44px system-ui, sans-serif';
  c.fillText(titulo, 40, 78);
  c.fillStyle = '#a1a1aa';
  c.font = '400 26px system-ui, sans-serif';
  c.fillText(subtitulo, 40, 122);

  linhas.forEach((l, i) => {
    const y = 190 + i * 56;
    c.fillStyle = l.cor;
    c.fillRect(40, y - 28, 14, 38);
    c.fillStyle = '#fafafa';
    c.font = '600 32px system-ui, sans-serif';
    c.fillText(l.rotulo, 70, y);
    c.textAlign = 'right';
    c.fillText(l.valor, L - 40, y);
    c.textAlign = 'left';
  });

  c.drawImage(mapa, (L - mw) / 2, topo, mw, mh);

  c.fillStyle = '#71717a';
  c.font = '400 22px system-ui, sans-serif';
  c.fillText(rodape, 40, alt - 36);

  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Falha ao gerar a imagem'))), 'image/png'));
}

// No celular abre a folha de compartilhamento; no computador baixa o arquivo.
export async function compartilharImagem(blob: Blob, nome: string, texto: string, url: string): Promise<'compartilhado' | 'baixado'> {
  const arquivo = new File([blob], nome, { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: texto, text: texto, url });
      return 'compartilhado';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'compartilhado'; // a pessoa fechou a folha
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return 'baixado';
}
