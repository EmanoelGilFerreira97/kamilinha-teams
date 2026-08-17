import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Marca, Spacing } from '@/constants/theme';
import { entrarComGoogle } from '@/lib/auth';

export default function Login() {
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoTocarEntrar() {
    setErro(null);
    setEntrando(true);
    try {
      await entrarComGoogle();
      // Nao navegamos daqui: o guarda de rota reage a sessao nova.
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Nao foi possivel entrar. Tente de novo.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={estilos.tela}>
      <View style={estilos.marca}>
        <Text style={estilos.titulo}>Kamilinha Teams</Text>
        <Text style={estilos.subtitulo}>Quartetos equilibrados, toda semana.</Text>
      </View>

      <View style={estilos.rodape}>
        <Pressable
          accessibilityRole="button"
          disabled={entrando}
          onPress={aoTocarEntrar}
          style={({ pressed }) => [
            estilos.botao,
            pressed && estilos.botaoPressionado,
            entrando && estilos.botaoDesativado,
          ]}>
          {entrando ? (
            <ActivityIndicator color={Marca.quadra} />
          ) : (
            <Text style={estilos.textoBotao}>Entrar com Google</Text>
          )}
        </Pressable>

        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
      </View>
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
  marca: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  titulo: {
    color: Marca.linha,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitulo: {
    color: Marca.ataqueClaro,
    fontSize: 16,
  },
  rodape: {
    gap: Spacing.three,
  },
  botao: {
    backgroundColor: Marca.linha,
    borderRadius: 6,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  botaoPressionado: {
    opacity: 0.85,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  textoBotao: {
    color: Marca.quadra,
    fontSize: 16,
    fontWeight: '700',
  },
  erro: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    textAlign: 'center',
  },
});
