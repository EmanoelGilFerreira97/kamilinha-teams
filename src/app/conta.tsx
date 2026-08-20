import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Spacing, type Cores } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTema } from '@/contexts/tema';
import { excluirConta } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';

/**
 * A tela existe por exigencia da Play: app que cria conta precisa oferecer a
 * exclusao dela por dentro, e nao so por e-mail para o desenvolvedor.
 *
 * O texto e longo de proposito. Excluir a conta mexe em turma de outras
 * pessoas -- a posse passa adiante, as notas dadas somem e as medias mudam --,
 * e isso precisa estar escrito antes do toque, nao dentro de um alerta que a
 * pessoa fecha no reflexo.
 */
export default function Conta() {
  const { cores } = useTema();
  const estilos = useMemo(() => criarEstilos(cores), [cores]);
  const { sessao } = useAuth();
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const usuario = sessao?.user;
  const nome = (usuario?.user_metadata?.full_name as string | undefined) ?? 'Jogador';
  const email = usuario?.email ?? '';

  function aoPedirParaExcluir() {
    Alert.alert(
      'Excluir conta',
      'Some tudo: o seu perfil, as notas que você deu e as que recebeu. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void confirmar() },
      ]
    );
  }

  // Nao ha navegacao no sucesso: quando a sessao cai, o guarda de rota do
  // _layout leva para o login sozinho. Mandar um router.replace daqui disputaria
  // com ele.
  async function confirmar() {
    setErro(null);
    setExcluindo(true);
    try {
      await excluirConta();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível excluir a conta. Tente de novo.'));
      setExcluindo(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Minha conta' }} />
      <ScrollView contentContainerStyle={estilos.tela}>
        <View style={estilos.identificacao}>
          <Text style={estilos.nome}>{nome}</Text>
          {email ? <Text style={estilos.email}>{email}</Text> : null}
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.tituloDaSecao}>Excluir conta</Text>
          <Text style={estilos.explicacao}>
            Apaga o seu perfil, a sua entrada em cada turma, as notas que você deu e as que você
            recebeu. As médias das suas turmas mudam sem os seus votos.
          </Text>
          <Text style={estilos.explicacao}>
            Nas turmas que você criou, quem passa a ser dono é o membro mais antigo. A turma só é
            apagada junto quando não sobra mais ninguém nela.
          </Text>
          <Text style={estilos.explicacao}>
            Não dá para desfazer. Entrar de novo com o mesmo Google cria uma conta nova, vazia.
          </Text>
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <Botao
          titulo="Excluir conta"
          variante="secundario"
          aoTocar={aoPedirParaExcluir}
          carregando={excluindo}
        />
      </ScrollView>
    </>
  );
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      backgroundColor: cores.fundo,
      flexGrow: 1,
      gap: Spacing.four,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.four,
    },
    identificacao: {
      gap: Spacing.one,
    },
    nome: {
      color: cores.texto,
      fontSize: 20,
      fontWeight: '700',
    },
    email: {
      color: cores.textoFraco,
      fontSize: 14,
    },
    bloco: {
      backgroundColor: cores.superficie,
      borderRadius: 8,
      gap: Spacing.two,
      padding: Spacing.three,
    },
    tituloDaSecao: {
      color: cores.texto,
      fontSize: 16,
      fontWeight: '700',
    },
    explicacao: {
      color: cores.textoFraco,
      fontSize: 14,
      lineHeight: 20,
    },
    erro: {
      color: cores.destaqueForte,
      fontSize: 14,
      fontWeight: '600',
      marginTop: Spacing.one,
    },
  });
}
