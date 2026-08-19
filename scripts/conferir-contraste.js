// Razao de contraste da WCAG 2.1 para os pares que as telas realmente usam.
//
// Rodar com `npm run contraste` depois de mexer na paleta. Contraste ruim
// compila limpo e so aparece na tela, e o tema claro ja nasceu com o texto do
// botao primario em 3,36:1 -- passou pelo tsc sem uma reclamacao.
const fs = require('node:fs');
const src = fs.readFileSync('src/constants/theme.ts', 'utf8');

function paleta(tema) {
  const bloco = src.split(`${tema}: {`)[1].split('},')[0];
  const cores = {};
  for (const m of bloco.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)) cores[m[1]] = m[2];
  return cores;
}

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [frente, fundo, minimo, onde]. 4.5 e texto corrido; 3.0 e texto grande
// (>=24px, ou >=19px em negrito) e elemento de interface.
const PARES = [
  ['texto', 'fundo', 4.5, 'texto das telas'],
  ['texto', 'superficie', 4.5, 'nome nos cartoes'],
  ['texto', 'superficieForte', 3.0, 'botao do seletor no trilho'],
  ['textoFraco', 'fundo', 4.5, 'ajuda, aviso, vazio, Sair'],
  ['textoFraco', 'superficie', 4.5, 'explicacao e rotulos nos cartoes'],
  ['destaque', 'fundo', 3.0, 'preenchimento do seletor, indicador'],
  ['destaqueForte', 'superficie', 3.0, 'contorno da caixa marcada'],
  ['destaqueForte', 'fundo', 4.5, 'saudacao, erro, subtitulo'],
  ['destaqueForte', 'superficie', 4.5, 'codigo da turma, etiqueta, overall'],
  ['textoSobreDestaque', 'destaque', 4.5, 'texto do botao primario'],
  ['borda', 'fundo', 3.0, 'contorno do botao secundario e do campo'],
];

for (const tema of ['light', 'dark']) {
  const c = paleta(tema);
  console.log(`\n=== ${tema === 'light' ? 'CLARO' : 'ESCURO'} ===`);
  for (const [frente, fundo, min, onde] of PARES) {
    const r = razao(c[frente], c[fundo]);
    const ok = r >= min;
    console.log(
      `${ok ? '  ok  ' : ' FALHA'} ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${frente} sobre ${fundo}  -- ${onde}`
    );
  }
}
