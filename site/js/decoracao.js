// Composições determinísticas: a faixa superior da parede fica reservada ao nome.
export const PAREDE = { FUNDO: 'fundo', LATERAL: 'lateral' };
export const TAMANHO_SALA = 2.8;
export const LETREIRO = { largura: 2.4, altura: .6, margemTopo: .42 };
export const ALTURA_PRATELEIRA = .3;
export const DECORACOES = [
  {
    tapete: { w: 1.9, d: 1.35, z: 1.25, rot: 0 }, luminaria: false,
    prateleira: { parede: PAREDE.FUNDO, centro: -1.5, y: 1.5, variante: 0 },
    quadros: [{ parede: PAREDE.LATERAL, centro: 1.5, y: 1.6, w: .6, h: .46 }],
  },
  {
    carpete: true, tapete: null, luminaria: true,
    quadros: [
      { parede: PAREDE.FUNDO, centro: -1.8, y: 1.62, w: .42, h: .52 },
      { parede: PAREDE.FUNDO, centro: -1.22, y: 1.56, w: .34, h: .34 },
      { parede: PAREDE.LATERAL, centro: 1.5, y: 1.55, w: .72, h: .5 },
    ],
  },
  {
    tapete: { w: 1.6, d: 1.55, z: 1.3, rot: .08 }, luminaria: false,
    prateleira: { parede: PAREDE.LATERAL, centro: 1.45, y: 1.5, variante: 1 },
    quadros: [{ parede: PAREDE.FUNDO, centro: -1.5, y: 1.6, w: .7, h: .5 }],
  },
  {
    tapete: { w: 2, d: 1.25, z: 1.32, rot: 0 }, luminaria: true,
    prateleira: { parede: PAREDE.FUNDO, centro: -1.4, y: 1.52, variante: 2 },
    quadros: [
      { parede: PAREDE.LATERAL, centro: 1.3, y: 1.64, w: .36, h: .42 },
      { parede: PAREDE.LATERAL, centro: 1.88, y: 1.48, w: .4, h: .32 },
    ],
  },
  {
    tapete: { w: 1.55, d: 1.05, z: 1.45, rot: -.12 }, luminaria: false,
    quadros: [
      { parede: PAREDE.FUNDO, centro: -1.5, y: 1.6, w: .85, h: .56 },
      { parede: PAREDE.LATERAL, centro: 1.2, y: 1.55, w: .42, h: .5 },
      { parede: PAREDE.LATERAL, centro: 1.85, y: 1.55, w: .42, h: .5 },
    ],
  },
  {
    tapete: { w: 1.85, d: 1.45, z: 1.35, rot: .04 }, luminaria: true,
    prateleira: { parede: PAREDE.FUNDO, centro: -1.5, y: 1.5, variante: 1 },
    quadros: [{ parede: PAREDE.LATERAL, centro: 1.55, y: 1.48, w: .5, h: .72 }],
  },
  {
    carpete: true, tapete: null, luminaria: false,
    prateleira: { parede: PAREDE.LATERAL, centro: 1.5, y: 1.48, variante: 2 },
    quadros: [
      { parede: PAREDE.FUNDO, centro: -1.88, y: 1.6, w: .38, h: .5 },
      { parede: PAREDE.FUNDO, centro: -1.22, y: 1.56, w: .48, h: .38 },
    ],
  },
];
