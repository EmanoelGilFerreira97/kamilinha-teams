// Gera os icones do app a partir da paleta da marca, sem dependencia externa.
//
// Nao ha biblioteca de imagem no projeto, e nao vale acrescentar uma so para
// isto: PNG e um formato simples e o Node ja traz o zlib. Rodar com
// `node scripts/gerar-icones.js`.
//
// O desenho e uma bola de volei: faixas curvas paralelas sobre o disco claro.
// Tres arcos bastam -- dois curvando para um lado e um para o outro, que e como
// os gomos se veem de frente.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// As mesmas de src/constants/theme.ts.
const MARCA = {
  quadra: [0x0b, 0x2e, 0x45],
  ataque: [0xc2, 0x5e, 0x22],
  linha: [0xf2, 0xf5, 0xf7],
};

// Cada costura e o pedaco de uma circunferencia de centro bem fora da bola: e o
// que da o arco longo e suave, em vez de risco reto. Medidas em fracao do raio.
const COSTURAS = [
  { angulo: 180, distancia: 2.2, raio: 1.75 },
  { angulo: 180, distancia: 2.2, raio: 2.25 },
  { angulo: 0, distancia: 2.2, raio: 1.75 },
];
const ESPESSURA = 0.11;
const AMOSTRAS = 4; // superamostragem, para a borda nao sair serrilhada

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const TABELA_CRC = (() => {
  const tabela = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c;
  }
  return tabela;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pedaco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

/** `pixels` e RGBA, 4 bytes por ponto, linha a linha. */
function png(lado, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // O resto -- compressao, filtro, entrelacamento -- fica em zero, que e o padrao.

  // Cada linha do PNG comeca com o byte do filtro; zero significa sem filtro.
  const bruto = Buffer.alloc(lado * (1 + lado * 4));
  for (let y = 0; y < lado; y++) {
    const destino = y * (1 + lado * 4);
    bruto[destino] = 0;
    pixels.copy(bruto, destino + 1, y * lado * 4, (y + 1) * lado * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// O desenho
// ---------------------------------------------------------------------------

/**
 * @param fundo      cor de fundo, ou null para transparente
 * @param fracao     raio da bola em fracao do lado
 * @param monocromo  bola branca e costuras vazadas, para o icone tematico do
 *                   Android -- ali o sistema tinge pela transparencia, entao a
 *                   forma tem de estar no canal alfa e nao na cor
 */
function desenhar(lado, { fundo = null, fracao = 0.36, monocromo = false }) {
  const pixels = Buffer.alloc(lado * lado * 4);
  const centro = lado / 2;
  const raio = lado * fracao;

  const arcos = COSTURAS.map((c) => ({
    cx: Math.cos((c.angulo * Math.PI) / 180) * raio * c.distancia,
    cy: Math.sin((c.angulo * Math.PI) / 180) * raio * c.distancia,
    raio: raio * c.raio,
  }));
  const meiaEspessura = (raio * ESPESSURA) / 2;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let naBola = 0;
      let naCostura = 0;

      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const px = x + (sx + 0.5) / AMOSTRAS - centro;
          const py = y + (sy + 0.5) / AMOSTRAS - centro;
          if (Math.hypot(px, py) > raio) continue;
          naBola++;

          for (const a of arcos) {
            if (Math.abs(Math.hypot(px - a.cx, py - a.cy) - a.raio) < meiaEspessura) {
              naCostura++;
              break;
            }
          }
        }
      }

      const total = AMOSTRAS * AMOSTRAS;
      const bola = naBola / total;
      const costura = naCostura / total;
      const destino = (y * lado + x) * 4;

      if (monocromo) {
        // Costura vira buraco: a silhueta que sobra e o que o sistema tinge.
        const alfa = Math.max(0, bola - costura);
        pixels[destino] = 255;
        pixels[destino + 1] = 255;
        pixels[destino + 2] = 255;
        pixels[destino + 3] = Math.round(alfa * 255);
        continue;
      }

      let cor = fundo ? fundo.slice() : [0, 0, 0];
      let alfa = fundo ? 1 : 0;

      if (bola > 0) {
        // Sobre area transparente nao ha o que misturar: a cor de cima entra
        // inteira, e quem guarda a suavidade da borda e o alfa.
        const peso = alfa === 0 ? 1 : bola;
        cor = cor.map((v, i) => v * (1 - peso) + MARCA.linha[i] * peso);
        alfa = alfa + (1 - alfa) * bola;
      }
      if (costura > 0) {
        cor = cor.map((v, i) => v * (1 - costura) + MARCA.ataque[i] * costura);
      }

      pixels[destino] = Math.round(cor[0]);
      pixels[destino + 1] = Math.round(cor[1]);
      pixels[destino + 2] = Math.round(cor[2]);
      pixels[destino + 3] = Math.round(alfa * 255);
    }
  }

  return pixels;
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

// ---------------------------------------------------------------------------

const DESTINO = path.join(__dirname, '..', 'assets', 'images');

// A camada de frente do icone adaptativo usa raio menor: o Android recorta o
// icone em formatos que variam por aparelho, e so os 66% centrais sao garantidos.
const ARQUIVOS = [
  ['icon.png', 1024, () => desenhar(1024, { fundo: MARCA.quadra, fracao: 0.36 })],
  ['android-icon-foreground.png', 1024, () => desenhar(1024, { fracao: 0.3 })],
  ['android-icon-background.png', 1024, () => solido(1024, MARCA.quadra)],
  ['android-icon-monochrome.png', 1024, () => desenhar(1024, { fracao: 0.3, monocromo: true })],
  ['splash-icon.png', 512, () => desenhar(512, { fracao: 0.42 })],
  ['favicon.png', 64, () => desenhar(64, { fundo: MARCA.quadra, fracao: 0.36 })],
];

if (require.main === module) {
  for (const [nome, lado, gerar] of ARQUIVOS) {
    const arquivo = path.join(DESTINO, nome);
    fs.writeFileSync(arquivo, png(lado, gerar()));
    console.log(`${nome} (${lado}x${lado})`);
  }
}

module.exports = { MARCA, png, desenhar };
