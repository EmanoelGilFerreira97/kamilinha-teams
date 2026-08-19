// Leitura e escrita de PNG sem dependencia externa.
//
// O Node ja traz o zlib, que e a parte dificil do formato; o resto e cabecalho,
// CRC e os cinco filtros de linha. Uma biblioteca de imagem so para isto seria
// dependencia nova em um projeto que evita dependencia nova -- e a que o EAS
// instala com `npm ci`, entao cada uma custa mais do que parece.

const zlib = require('node:zlib');

const ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
function escrever(largura, altura, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // Compressao, filtro e entrelacamento ficam em zero, que e o padrao.

  // Cada linha comeca com o byte do filtro; zero significa sem filtro.
  const bruto = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y++) {
    const destino = y * (1 + largura * 4);
    bruto[destino] = 0;
    pixels.copy(bruto, destino + 1, y * largura * 4, (y + 1) * largura * 4);
  }

  return Buffer.concat([
    ASSINATURA,
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Devolve { largura, altura, pixels } com pixels em RGBA. */
function ler(buffer) {
  if (!buffer.subarray(0, 8).equals(ASSINATURA)) throw new Error('Nao e um PNG.');

  let largura = 0;
  let altura = 0;
  let canais = 0;
  const partes = [];

  let i = 8;
  while (i < buffer.length) {
    const tamanho = buffer.readUInt32BE(i);
    const tipo = buffer.toString('ascii', i + 4, i + 8);
    const dados = buffer.subarray(i + 8, i + 8 + tamanho);

    if (tipo === 'IHDR') {
      largura = dados.readUInt32BE(0);
      altura = dados.readUInt32BE(4);
      if (dados[8] !== 8) throw new Error('So leio PNG de 8 bits por canal.');
      if (dados[12] !== 0) throw new Error('So leio PNG sem entrelacamento.');
      // 2 = RGB, 6 = RGBA. Sao os unicos que este projeto produz ou consome.
      if (dados[9] === 2) canais = 3;
      else if (dados[9] === 6) canais = 4;
      else throw new Error(`Tipo de cor ${dados[9]} nao suportado.`);
    } else if (tipo === 'IDAT') {
      partes.push(dados);
    } else if (tipo === 'IEND') {
      break;
    }

    i += 12 + tamanho; // tamanho + tipo + dados + crc
  }

  const bruto = zlib.inflateSync(Buffer.concat(partes));
  const passo = largura * canais;
  const linhas = Buffer.alloc(altura * passo);

  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (passo + 1)];
    const entrada = y * (passo + 1) + 1;
    const saida = y * passo;
    const acima = saida - passo;

    for (let x = 0; x < passo; x++) {
      const cru = bruto[entrada + x];
      const a = x >= canais ? linhas[saida + x - canais] : 0;
      const b = y > 0 ? linhas[acima + x] : 0;
      const c = y > 0 && x >= canais ? linhas[acima + x - canais] : 0;

      let valor;
      switch (filtro) {
        case 0: valor = cru; break;
        case 1: valor = cru + a; break;
        case 2: valor = cru + b; break;
        case 3: valor = cru + ((a + b) >> 1); break;
        case 4: valor = cru + paeth(a, b, c); break;
        default: throw new Error(`Filtro ${filtro} desconhecido na linha ${y}.`);
      }
      linhas[saida + x] = valor & 0xff;
    }
  }

  if (canais === 4) return { largura, altura, pixels: linhas };

  // Normaliza RGB para RGBA, para o resto do codigo lidar com um formato so.
  const pixels = Buffer.alloc(largura * altura * 4);
  for (let p = 0; p < largura * altura; p++) {
    pixels[p * 4] = linhas[p * 3];
    pixels[p * 4 + 1] = linhas[p * 3 + 1];
    pixels[p * 4 + 2] = linhas[p * 3 + 2];
    pixels[p * 4 + 3] = 255;
  }
  return { largura, altura, pixels };
}

module.exports = { ler, escrever };
