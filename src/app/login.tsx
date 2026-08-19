import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Spacing, type Cores } from '@/constants/theme';
import { useTema } from '@/contexts/tema';
import { entrarComGoogle } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';

export default function Login() {
  const { cores } = useTema();
  const estilos = useMemo(() => criarEstilos(cores), [cores]);
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

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
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
      color: cores.texto,
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: -1,
    },
    subtitulo: {
      color: cores.destaqueForte,
      fontSize: 16,
    },
    rodape: {
      gap: Spacing.three,
    },
    erro: {
      color: cores.destaqueForte,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
