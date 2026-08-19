import { useTema } from '@/contexts/tema';

/**
 * Atalho para so as cores do tema.
 *
 * Existe porque ThemedText e ThemedView so precisam disso, e porque era assim
 * que o template expunha o tema -- manter a assinatura evita mexer neles.
 */
export function useTheme() {
  return useTema().cores;
}
