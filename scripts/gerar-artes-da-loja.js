// Gera as artes que a ficha da Play exige, a partir de assets/logo.png.
//
// Rodar com `node scripts/gerar-artes-da-loja.js`, ou `npm run artes`.
//
// Sai em assets/loja/, que nao entra no bundle do app -- e material de loja, e
// nao recurso do aplicativo. Por isso tambem nao vive em assets/images.
//
// Duas pecas:
//
//   icone-512.png       o icone da ficha. Mesma receita do icone do app (sem o
//                       banner, com o rodape desvanecido), so que a 512 e sobre
//                       branco opaco -- a Play recusa transparencia aqui.
//
//   destaque-1024x500   o grafico de destaque, que aparece no topo da ficha.
//
// O destaque nao leva texto escrito por este script: desenhar tipografia exigiria
// uma biblioteca de fonte, que e dependencia nova num projeto que fugiu delas o
// tempo todo -- e a Play nao exige texto na peca. Quem carrega o nome e o proprio
// logo, que ja traz o "KT" e o banner do VOLEI.

const fs = require('node:fs');
const path = require('node:path');
const png = require('./png.js');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'assets', 'logo.png');
const DESTINO = path.join(RAIZ, 'assets', 'loja');

// As mesmas caixas medidas em gerar-icones.js, no arquivo de 2000x2000.
const SEM_BANNER = { x0: 162, y0: 20, x1: 1805, y1: 1440 };
const INTEIRO = { x0: 162, y0: 20, x1: 1805, y1: 1987 };
const DESVANECER = 110;

const BRANCO = [255, 255, 255];
// `superficie` do tema claro. O degrade vai do branco a ela: e rosa o bastante
// para nao parecer arte faltando, e claro o bastante para o preto do logo
// continuar legivel por cima.
const SUPERFICIE = [253, 238, 243];

const logo = png.ler(fs.readFileSync(ORIGEM));

/**
 * Compoe o logo sobre um fundo, numa tela de qualquer proporcao.
 *
 * @param margem      folga vertical em fracao da altura
 * @param fundo       (x, y) -> [r, g, b] opaco
 * @param desvanecer  linhas de origem em que o alfa cai a zero, no rodape
 */
function compor(largura, altura, caixa, { margem, fundo, desvanecer = 0 }) {
  const { x0, y0, x1, y1 } = caixa;
  const larguraCaixa = x1 - x0;
  const alturaCaixa = y1 - y0;

  // Cabe pela altura ou pela largura, o que apertar primeiro.
  const util = Math.min(altura * (1 - 2 * margem), largura * (1 - 2 * margem));
  const escala = util / Math.max(larguraCaixa, alturaCaixa);
  const destX = (largura - larguraCaixa * escala) / 2;
  const destY = (altura - alturaCaixa * escala) / 2;

  const saida = Buffer.alloc(largura * altura * 4);
  const amostras = 3;
  const total = amostras * amostras;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let cobertura = 0;

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

      const c = cobertura / total;
      const atras = fundo(x, y);
      const destino = (y * largura + x) * 4;

      saida[destino] = Math.round(r / total + atras[0] * (1 - c));
      saida[destino + 1] = Math.round(g / total + atras[1] * (1 - c));
      saida[destino + 2] = Math.round(b / total + atras[2] * (1 - c));
      saida[destino + 3] = 255;
    }
  }

  return saida;
}

const solido = (cor) => () => cor;

/** Degrade na diagonal, do canto superior esquerdo ao inferior direito. */
function diagonal(largura, altura, de, para) {
  const maximo = largura + altura;
  return (x, y) => {
    const t = (x + y) / maximo;
    return [
      de[0] + (para[0] - de[0]) * t,
      de[1] + (para[1] - de[1]) * t,
      de[2] + (para[2] - de[2]) * t,
    ];
  };
}

const ARQUIVOS = [
  [
    'icone-512.png',
    512,
    512,
    () =>
      compor(512, 512, SEM_BANNER, {
        margem: 0.06,
        fundo: solido(BRANCO),
        desvanecer: DESVANECER,
      }),
  ],
  [
    'destaque-1024x500.png',
    1024,
    500,
    () =>
      // O logo inteiro, com o banner: aqui ha tamanho de sobra e a tipografia
      // dele e o que faz a peca parecer marca, e nao icone esticado.
      compor(1024, 500, INTEIRO, {
        margem: 0.08,
        fundo: diagonal(1024, 500, BRANCO, SUPERFICIE),
      }),
  ],
];

if (require.main === module) {
  fs.mkdirSync(DESTINO, { recursive: true });

  for (const [nome, largura, altura, gerar] of ARQUIVOS) {
    fs.writeFileSync(path.join(DESTINO, nome), png.escrever(largura, altura, gerar()));
    console.log(`${nome} (${largura}x${altura})`);
  }
}
