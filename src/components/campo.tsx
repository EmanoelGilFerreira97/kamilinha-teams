import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Marca, Spacing } from '@/constants/theme';

/** TextInput com a roupa do app; o resto das props passa direto. */
export function Campo({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Marca.quadraClara}
      selectionColor={Marca.ataqueClaro}
      style={[estilos.campo, style]}
      {...props}
    />
  );
}

const estilos = StyleSheet.create({
  campo: {
    backgroundColor: Marca.quadra,
    borderColor: Marca.quadraClara,
    borderWidth: 1,
    borderRadius: 6,
    color: Marca.linha,
    fontSize: 17,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
  },
});
