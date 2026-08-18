import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Marca, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { sair } from '@/lib/auth';

export default function Inicio() {
  const { sessao } = useAuth();
  const usuario = sessao?.user;
  const nome = (usuario?.user_metadata?.full_name as string | undefined) ?? usuario?.email;

  return (
    <View style={estilos.tela}>
      <View style={estilos.conteudo}>
        <Text style={estilos.saudacao}>Boa, {nome}</Text>
        <Text style={estilos.aviso}>
          Login funcionando. As turmas, as notas e o sorteio entram nas proximas fases.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={sair}
        style={({ pressed }) => [estilos.botaoSair, pressed && estilos.pressionado]}>
        <Text style={estilos.textoSair}>Sair</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Marca.quadra,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    justifyContent: 'space-between',
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  saudacao: {
    color: Marca.linha,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  aviso: {
    color: Marca.ataqueClaro,
    fontSize: 15,
    lineHeight: 22,
  },
  botaoSair: {
    borderColor: Marca.quadraClara,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pressionado: {
    opacity: 0.7,
  },
  textoSair: {
    color: Marca.linha,
    fontSize: 15,
    fontWeight: '600',
  },
});
