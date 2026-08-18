import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Share, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Marca, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import {
  buscarTurma,
  listarMembros,
  sairDaTurma,
  type MembroDaTurma,
  type Turma,
} from '@/lib/turmas';

export default function DetalheDaTurma() {
  // O generic com a string da rota devolveria string | string[], porque o
  // codegen nao distingue [id] de [...id]. Segmento simples e sempre um valor
  // so, entao o formato de params e o que descreve a rota de verdade.
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useAuth();
  const router = useRouter();

  const [turma, setTurma] = useState<Turma | null>(null);
  const [membros, setMembros] = useState<MembroDaTurma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  const meuId = sessao?.user.id;
  const souDono = turma !== null && turma.dono_id === meuId;

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      // As duas buscas sao independentes, e a lista de membros e o conteudo
      // principal da tela -- esperar uma depois da outra dobraria a espera.
      const [turmaCarregada, membrosCarregados] = await Promise.all([
        buscarTurma(id),
        listarMembros(id),
      ]);

      if (turmaCarregada === null) {
        // A policy de select devolve vazio tanto para turma inexistente quanto
        // para turma de outros. Do lado de fora, os dois casos sao o mesmo.
        setErro('Esta turma não existe ou você não faz parte dela.');
        return;
      }

      setTurma(turmaCarregada);
      setMembros(membrosCarregados);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar a turma.'));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  async function aoConvidar() {
    if (turma === null) return;
    try {
      await Share.share({
        message:
          `Entra na turma ${turma.nome} no Kamilinha Teams: ` +
          `baixe o app e use o código ${turma.codigo}.`,
      });
    } catch {
      // Fechar a folha de compartilhamento nao e erro que valha uma tela.
    }
  }

  function aoPedirParaSair() {
    if (turma === null) return;
    Alert.alert(
      'Sair da turma',
      `Você sai de ${turma.nome} e some da lista. Para voltar, vai precisar do código de novo.`,
      [
        { text: 'Ficar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => void confirmarSaida() },
      ]
    );
  }

  async function confirmarSaida() {
    setSaindo(true);
    try {
      await sairDaTurma(id);
      router.replace('/');
    } catch (e) {
      Alert.alert('Sair da turma', mensagemDeErro(e, 'Não foi possível sair da turma.'));
      setSaindo(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Turma' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={Marca.ataqueClaro} />
        </View>
      </>
    );
  }

  if (turma === null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Turma' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <Text style={estilos.aviso}>{erro ?? 'Turma não encontrada.'}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: turma.nome }} />
      <View style={estilos.tela}>
        <FlatList
          contentContainerStyle={estilos.lista}
          data={membros}
          keyExtractor={(membro) => membro.usuario_id}
          ListHeaderComponent={
            <View style={estilos.blocoDoCodigo}>
              <Text style={estilos.rotuloDoCodigo}>Código de convite</Text>
              <Text selectable style={estilos.codigo}>
                {turma.codigo}
              </Text>
              <Botao titulo="Convidar" variante="secundario" aoTocar={() => void aoConvidar()} />
              <Text style={estilos.tituloDaSecao}>
                Na quadra ({membros.length})
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={estilos.membro}>
              <Text style={estilos.nomeDoMembro} numberOfLines={1}>
                {item.perfil?.nome ?? 'Jogador'}
              </Text>
              {item.usuario_id === turma.dono_id ? (
                <Text style={estilos.etiqueta}>dono</Text>
              ) : item.usuario_id === meuId ? (
                <Text style={estilos.etiqueta}>você</Text>
              ) : null}
            </View>
          )}
        />

        {souDono ? null : (
          <Botao
            titulo="Sair da turma"
            variante="secundario"
            aoTocar={aoPedirParaSair}
            carregando={saindo}
            estilo={estilos.botaoSair}
          />
        )}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Marca.quadra,
    paddingHorizontal: Spacing.four,
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aviso: {
    color: Marca.ataqueClaro,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  blocoDoCodigo: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.four,
  },
  rotuloDoCodigo: {
    color: Marca.ataqueClaro,
    fontSize: 14,
  },
  codigo: {
    color: Marca.linha,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
  },
  tituloDaSecao: {
    color: Marca.linha,
    fontSize: 18,
    fontWeight: '700',
    paddingTop: Spacing.four,
  },
  membro: {
    alignItems: 'center',
    backgroundColor: Marca.quadraClara,
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  nomeDoMembro: {
    color: Marca.linha,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  etiqueta: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  botaoSair: {
    marginBottom: Spacing.four,
  },
});
