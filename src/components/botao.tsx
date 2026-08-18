import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Marca, Spacing } from '@/constants/theme';

type Props = {
  titulo: string;
  aoTocar: () => void;
  /** Troca o texto por um indicador e bloqueia novos toques. */
  carregando?: boolean;
  desativado?: boolean;
  variante?: 'primario' | 'secundario';
  estilo?: StyleProp<ViewStyle>;
};

/** Botao das telas de acao, nas duas variantes que o app usa. */
export function Botao({
  titulo,
  aoTocar,
  carregando = false,
  desativado = false,
  variante = 'primario',
  estilo,
}: Props) {
  const secundario = variante === 'secundario';
  const bloqueado = carregando || desativado;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado}
      onPress={aoTocar}
      style={({ pressed }) => [
        estilos.base,
        secundario ? estilos.secundario : estilos.primario,
        pressed && estilos.pressionado,
        bloqueado && estilos.bloqueado,
        estilo,
      ]}>
      {carregando ? (
        <ActivityIndicator color={secundario ? Marca.linha : Marca.quadra} />
      ) : (
        <Text style={[estilos.texto, secundario && estilos.textoSecundario]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: 6,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primario: {
    backgroundColor: Marca.linha,
  },
  secundario: {
    borderColor: Marca.quadraClara,
    borderWidth: 1,
  },
  pressionado: {
    opacity: 0.85,
  },
  bloqueado: {
    opacity: 0.6,
  },
  texto: {
    color: Marca.quadra,
    fontSize: 16,
    fontWeight: '700',
  },
  textoSecundario: {
    color: Marca.linha,
  },
});
