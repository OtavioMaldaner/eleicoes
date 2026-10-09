import { describe, expect, it } from 'vitest';
import { CARGOS, CARGOS_2T, MUNICIPIOS, municipioValido, urlDados, urlFoto } from './config';

describe('urlDados', () => {
  it('no painel do RS, presidente é a votação no estado, com as fotos nacionais', () => {
    expect(urlDados(CARGOS[0])).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rs/rs-c0001-e006257-u.json');
    expect(urlFoto(CARGOS[0], '123')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/123.jpeg');
    expect(urlFoto(CARGOS[1], '123')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/rs/123.jpeg');
    expect(urlDados(CARGOS[1])).toBe('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs-c0003-e006259-u.json');
  });
  it('monta as URLs municipais, com presidente sob a pasta do RS', () => {
    expect(urlDados(CARGOS[0], '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rs/rs88013-c0001-e006257-u.json');
    expect(urlDados(CARGOS[3], '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs88013-c0006-e006259-u.json');
  });
  it('no 2º turno, o total nacional ignora o município e os do RS usam as eleições 6258/6260', () => {
    const [br, pres, gov] = CARGOS_2T;
    expect(urlDados(br, '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json');
    expect(urlDados(pres, '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/rs/rs88013-c0001-e006258-u.json');
    expect(urlDados(gov)).toBe('https://resultados.tse.jus.br/oficial/ele2026/6260/dados/rs/rs-c0003-e006260-u.json');
    expect(urlFoto(pres, '123')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6258/fotos/br/123.jpeg');
  });
});

describe('municípios', () => {
  it('traz os 497 municípios do RS em ordem de nome', () => {
    expect(MUNICIPIOS).toHaveLength(497);
    expect(MUNICIPIOS.find((m) => m.cd === '88013')?.nm).toBe('PORTO ALEGRE');
    const nomes = MUNICIPIOS.map((m) => m.nm);
    expect(nomes).toEqual([...nomes].sort());
  });
  it('valida só códigos da lista', () => {
    expect(municipioValido('88013')).toBe(true);
    for (const v of [null, undefined, '', '00000', '8801', '88013/../x', 'abc']) expect(municipioValido(v)).toBe(false);
  });
});
