export interface CaixaRosto {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Dimensoes {
  largura: number;
  altura: number;
}

export interface Calibragem {
  fatorAlturaJanela: number;
  fatorAlturaMinimo: number;
  fatorMargemTopo: number;
  fatorMargemTopoMinimo: number;
  proporcaoLargura: number;
}

export const CALIBRAGEM_PADRAO: Calibragem = {
  fatorAlturaJanela: 1.85,
  fatorAlturaMinimo: 1.7,
  fatorMargemTopo: 0.4,
  fatorMargemTopoMinimo: 0.1,
  proporcaoLargura: 0.75,
};

export interface Janela {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Diagnostico {
  fatorMargemUsado: number;
  fatorAlturaUsado: number;
  deslizou: boolean;
  encolheu: boolean;
}

export type MotivoRecusa =
  | 'margem_superior_insuficiente'
  | 'largura_nao_cabe'
  | 'altura_insuficiente';

export type ResultadoJanela =
  | { ok: true; janela: Janela; diagnostico: Diagnostico }
  | { ok: false; motivo: MotivoRecusa; detalhe: string };

export function calcularJanela(
  rosto: CaixaRosto,
  imagem: Dimensoes,
  cal: Calibragem = CALIBRAGEM_PADRAO,
): ResultadoJanela {
  const h = rosto.altura;

  const margemIdeal = h * cal.fatorMargemTopo;
  const margemMinima = h * cal.fatorMargemTopoMinimo;
  const alturaIdeal = h * cal.fatorAlturaJanela;
  const alturaMinima = h * cal.fatorAlturaMinimo;

  // PASSO 1 — margem superior: quer a ideal, aceita o que houver acima do rosto
  let margem = Math.min(margemIdeal, rosto.y);

  if (margem < margemMinima) {
    return {
      ok: false,
      motivo: 'margem_superior_insuficiente',
      detalhe: `disponivel ${(rosto.y / h).toFixed(3)}h, minimo ${cal.fatorMargemTopoMinimo}h`,
    };
  }

  // PASSO 2 — altura: quer a ideal, limitada pelo que a largura permite de lado
  const centroX = rosto.x + rosto.largura / 2;
  const folgaLateral = Math.min(centroX, imagem.largura - centroX);
  const limiteLateral = (2 * folgaLateral) / cal.proporcaoLargura;

  let altura = Math.min(alturaIdeal, limiteLateral);

  if (altura < alturaMinima) {
    return {
      ok: false,
      motivo: 'largura_nao_cabe',
      detalhe: `limite lateral ${(limiteLateral / h).toFixed(3)}h, minimo ${cal.fatorAlturaMinimo}h`,
    };
  }

  // PASSO 3 — não cabe embaixo? desliza para cima consumindo a margem
  let topo = rosto.y - margem;
  let sobra = imagem.altura - (topo + altura);

  if (sobra < 0) {
    const deslize = Math.min(-sobra, margem - margemMinima);
    margem -= deslize;
    topo = rosto.y - margem;
    sobra = imagem.altura - (topo + altura);
  }

  // PASSO 4 — ainda não cabe? só agora encolhe a janela
  if (sobra < 0) {
    altura = imagem.altura - topo;

    if (altura < alturaMinima) {
      return {
        ok: false,
        motivo: 'altura_insuficiente',
        detalhe: `possivel ${(altura / h).toFixed(3)}h, minimo ${cal.fatorAlturaMinimo}h`,
      };
    }
  }

  const largura = altura * cal.proporcaoLargura;

  return {
    ok: true,
    janela: { x: centroX - largura / 2, y: topo, largura, altura },
    diagnostico: {
      fatorMargemUsado: margem / h,
      fatorAlturaUsado: altura / h,
      deslizou: margem < margemIdeal - 1e-9,
      encolheu: altura < alturaIdeal - 1e-9,
    },
  };
}

export function arredondarJanela(janela: Janela, imagem: Dimensoes): Janela {
  const x = Math.max(0, Math.round(janela.x));
  const y = Math.max(0, Math.round(janela.y));

  return {
    x,
    y,
    largura: Math.min(Math.round(janela.largura), imagem.largura - x),
    altura: Math.min(Math.round(janela.altura), imagem.altura - y),
  };
}
