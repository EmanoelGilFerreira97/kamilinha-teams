import { useMemo } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing, type Cores } from '@/constants/theme';
import { useTema } from '@/contexts/tema';

/** TextInput com a roupa do app; o resto das props passa direto. */
export function Campo({ style, ...props }: TextInputProps) {
  const { cores } = useTema();
  const estilos = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <TextInput
      placeholderTextColor={cores.textoFraco}
      selectionColor={cores.destaque}
      style={[estilos.campo, style]}
      {...props}
    />
  );
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    campo: {
      backgroundColor: cores.superficie,
      borderColor: cores.borda,
      borderWidth: 1,
      borderRadius: 6,
      color: cores.texto,
      fontSize: 17,
      minHeight: 56,
      paddingHorizontal: Spacing.three,
    },
  });
}
