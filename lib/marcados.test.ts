import { describe, expect, it } from 'vitest';
import { lerMarcados } from './marcados';

describe('lerMarcados', () => {
  it('lê marcações válidas', () => {
    expect(lerMarcados('{"1":"votei","2":"acompanhar"}')).toEqual({ '1': 'votei', '2': 'acompanhar' });
  });
  it('descarta valores inválidos', () => {
    expect(lerMarcados('{"1":"votei","2":"outro","3":5}')).toEqual({ '1': 'votei' });
  });
  it('trata vazio, corrompido e tipos errados como vazio', () => {
    for (const raw of [null, '', '{', '[]', '"x"', 'null', '42']) expect(lerMarcados(raw)).toEqual({});
  });
});
