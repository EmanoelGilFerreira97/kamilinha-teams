import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Marca, Spacing } from '@/constants/theme';
import { entrarComGoogle } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';

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
      setErro(mensagemDeErro(e, 'Não foi possível entrar. Tente de novo.'));
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
        <Botao
          titulo="Entrar com Google"
          aoTocar={() => void aoTocarEntrar()}
          carregando={entrando}
        />
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
  erro: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    textAlign: 'center',
  },
});
