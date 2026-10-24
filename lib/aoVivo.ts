// Repete `ciclo` a cada `intervaloMs`, mas só com a aba visível: aba escondida não consulta nada
// (menos carga no servidor e menos bateria). Ao voltar para a aba, atualiza na hora.
// Devolve a função que para tudo.
export function aoVivo(ciclo: () => void, intervaloMs: number): () => void {
  const rodar = () => {
    if (!document.hidden) ciclo();
  };
  ciclo();
  const id = setInterval(rodar, intervaloMs);
  document.addEventListener('visibilitychange', rodar);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', rodar);
  };
}
