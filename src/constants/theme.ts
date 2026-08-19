import '@/global.css';

import { Platform } from 'react-native';

/**
 * A paleta sai do logo do grupo: rosa da chama, rosa claro do "KT", branco da
 * bola. Os nomes sao por papel e nao por cor -- `fundo` continua sendo fundo
 * nos dois temas, enquanto "rosa claro" seria texto em um e destaque no outro.
 *
 * No claro o destaque e o rosa cheio, que precisa de texto branco por cima. No
 * escuro ele clareia, para ter contraste contra o vinho, e ai o texto por cima
 * escurece. E o que `textoSobreDestaque` resolve.
 */
export const Colors = {
  light: {
    fundo: '#FFFFFF',
    superficie: '#FDEEF3',
    superficieForte: '#F7D9E4',
    texto: '#1A1013',
    textoFraco: '#7A5A66',
    destaque: '#E06090',
    destaqueForte: '#C2477A',
    textoSobreDestaque: '#FFFFFF',
    borda: '#F0C8D8',
  },
  dark: {
    fundo: '#2B0D18',
    superficie: '#43172A',
    superficieForte: '#5C2239',
    texto: '#F7F0F3',
    textoFraco: '#D89AB2',
    destaque: '#F0A0C0',
    destaqueForte: '#E06090',
    textoSobreDestaque: '#2B0D18',
    borda: '#6B2B41',
  },
} as const;

export type EsquemaDeCores = keyof typeof Colors;
export type Cores = (typeof Colors)[EsquemaDeCores];
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
