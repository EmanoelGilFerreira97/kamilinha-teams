// Gera os icones do app a partir de assets/logo.png.
//
// Rodar com `node scripts/gerar-icones.js`, ou `npm run icones`.
//
// O logo tem a chama, a bola e o "KT" em cima, e um banner escrito VOLEI
// embaixo. O banner sai do icone: a 48px na gaveta de aplicativos a tipografia
// vira borrao, e o que sobrevive nesse tamanho e a silhueta da chama com a bola.
//
// A base das letras do KT e o topo do banner sao coladas no desenho, entao nao
// existe corte reto que pegue uma sem a outra. A saida e desvanecer o rodape: o
// que sobra do banner dissolve no fundo e o corte parece proposital.

const fs = require('node:fs');
const path = require('node:path');
const png = require('./png.js');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'assets', 'logo.png');
const DESTINO = path.join(RAIZ, 'assets', 'images');

// Caixa do logo sem o banner, medida no arquivo de 2000x2000.
const SEM_BANNER = { x0: 162, y0: 20, x1: 1805, y1: 1440 };
const DESVANECER = 110;

// O logo inteiro, para a splash, onde ha tamanho de sobra para o texto.
const INTEIRO = { x0: 162, y0: 20, x1: 1805, y1: 1987 };

const BRANCO = [255, 255, 255];

const logo = png.ler(fs.readFileSync(ORIGEM));

/**
 * Reamostra uma caixa do logo para um quadrado.
 *
 * @param margem      folga em fracao do lado. O icone adaptativo do Android so
 *                    garante os 66% centrais, entao a camada de frente precisa
 *                    de bem mais folga que o icone comum.
 * @param fundo       cor de fundo, ou null para transparente
 * @param desvanecer  linhas de origem em que o alfa cai a zero, no rodape
 * @param silhueta    ignora a cor e devolve so a forma em branco, para o icone
 *                    tematico do Android -- ali o sistema tinge pelo alfa
 */
function quadrado(lado, caixa, { margem, fundo = null, desvanecer = 0, silhueta = false }) {
  const { x0, y0, x1, y1 } = caixa;
  const larguraCaixa = x1 - x0;
  const alturaCaixa = y1 - y0;
  const util = lado * (1 - 2 * margem);
  const escala = util / Math.max(larguraCaixa, alturaCaixa);
  const destX = (lado - larguraCaixa * escala) / 2;
  const destY = (lado - alturaCaixa * escala) / 2;

  const saida = Buffer.alloc(lado * lado * 4);
  const amostras = 3;
  const total = amostras * amostras;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = 0, g = 0, b = 0, cobertura = 0;

      for (let sy = 0; sy < amostras; sy++) {
        for (let sx = 0; sx < amostras; sx++) {
          const fx = (x + (sx + 0.5) / amostras - destX) / escala + x0;
          const fy = (y + (sy + 0.5) / amostras - destY) / escala + y0;
          if (fx < x0 || fx >= x1 || fy < y0 || fy >= y1) continue;

          const d = (Math.floor(fy) * logo.largura + Math.floor(fx)) * 4;
          const rampa = desvanecer > 0 ? Math.min(1, Math.max(0, (y1 - fy) / desvanecer)) : 1;
          const alfa = (logo.pixels[d + 3] / 255) * rampa;

          // Acumula ja multiplicado pelo alfa: e o que deixa a borda suave sem
          // puxar a cor do que esta por baixo.
          r += logo.pixels[d] * alfa;
          g += logo.pixels[d + 1] * alfa;
          b += logo.pixels[d + 2] * alfa;
          cobertura += alfa;
        }
      }

      const destino = (y * lado + x) * 4;
      const c = cobertura / total;

      if (silhueta) {
        saida[destino] = 255;
        saida[destino + 1] = 255;
        saida[destino + 2] = 255;
        saida[destino + 3] = Math.round(c * 255);
        continue;
      }

      if (fundo) {
        saida[destino] = Math.round(r / total + fundo[0] * (1 - c));
        saida[destino + 1] = Math.round(g / total + fundo[1] * (1 - c));
        saida[destino + 2] = Math.round(b / total + fundo[2] * (1 - c));
        saida[destino + 3] = 255;
      } else {
        // Desfaz a pre-multiplicacao: o PNG guarda a cor separada do alfa.
        saida[destino] = c > 0 ? Math.round(r / total / c) : 0;
        saida[destino + 1] = c > 0 ? Math.round(g / total / c) : 0;
        saida[destino + 2] = c > 0 ? Math.round(b / total / c) : 0;
        saida[destino + 3] = Math.round(c * 255);
      }
    }
  }

  return saida;
}

function solido(lado, cor) {
  const pixels = Buffer.alloc(lado * lado * 4);
  for (let i = 0; i < lado * lado; i++) {
    pixels[i * 4] = cor[0];
    pixels[i * 4 + 1] = cor[1];
    pixels[i * 4 + 2] = cor[2];
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

const ARQUIVOS = [
  ['icon.png', 1024, () =>
    quadrado(1024, SEM_BANNER, { margem: 0.06, fundo: BRANCO, desvanecer: DESVANECER })],
  ['android-icon-foreground.png', 1024, () =>
    quadrado(1024, SEM_BANNER, { margem: 0.2, desvanecer: DESVANECER })],
  ['android-icon-background.png', 1024, () => solido(1024, BRANCO)],
  ['android-icon-monochrome.png', 1024, () =>
    quadrado(1024, SEM_BANNER, { margem: 0.2, desvanecer: DESVANECER, silhueta: true })],
  // A splash tem tamanho de sobra, entao leva o logo inteiro, com o banner.
  ['splash-icon.png', 512, () => quadrado(512, INTEIRO, { margem: 0.02 })],
  ['favicon.png', 64, () =>
    quadrado(64, SEM_BANNER, { margem: 0.04, fundo: BRANCO, desvanecer: DESVANECER })],
];

if (require.main === module) {
  for (const [nome, lado, gerar] of ARQUIVOS) {
    fs.writeFileSync(path.join(DESTINO, nome), png.escrever(lado, lado, gerar()));
    console.log(`${nome} (${lado}x${lado})`);
  }
}
