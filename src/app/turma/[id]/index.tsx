import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Botao } from '@/components/botao';
import { Marca, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarNotasDaTurma, type NotaDaTurma } from '@/lib/notas';
import {
  buscarTurma,
  listarMembros,
  sairDaTurma,
  type MembroDaTurma,
  type Turma,
} from '@/lib/turmas';

/** Uma linha da lista: o membro, com a nota agregada quando ela existe. */
type LinhaDaQuadra = {
  usuario_id: string;
  nome: string;
  nota: NotaDaTurma | null;
};

export default function DetalheDaTurma() {
  // O generic com a string da rota devolveria string | string[], porque o
  // codegen nao distingue [id] de [...id]. Segmento simples e sempre um valor
  // so, entao o formato de params e o que descreve a rota de verdade.
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useAuth();
  const router = useRouter();

  const [turma, setTurma] = useState<Turma | null>(null);
  const [linhas, setLinhas] = useState<LinhaDaQuadra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  const meuId = sessao?.user.id;
  const souDono = turma !== null && turma.dono_id === meuId;

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      // As tres buscas sao independentes, e a lista e o conteudo principal da
      // tela -- esperar uma depois da outra triplicaria a espera.
      const [turmaCarregada, membros, notas] = await Promise.all([
        buscarTurma(id),
        listarMembros(id),
        listarNotasDaTurma(id),
      ]);

      if (turmaCarregada === null) {
        // A policy de select devolve vazio tanto para turma inexistente quanto
        // para turma de outros. Do lado de fora, os dois casos sao o mesmo.
        setErro('Esta turma não existe ou você não faz parte dela.');
        return;
      }

      setTurma(turmaCarregada);
      setLinhas(montarLinhas(membros, notas));
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
          data={linhas}
          keyExtractor={(linha) => linha.usuario_id}
          ListHeaderComponent={
            <View style={estilos.blocoDoCodigo}>
              <Text style={estilos.rotuloDoCodigo}>Código de convite</Text>
              <Text selectable style={estilos.codigo}>
                {turma.codigo}
              </Text>
              <Botao titulo="Convidar" variante="secundario" aoTocar={() => void aoConvidar()} />
              <Text style={estilos.tituloDaSecao}>Na quadra ({linhas.length})</Text>
              <Text style={estilos.explicacao}>
                Toque em alguém para avaliar. A nota só aparece depois de cinco avaliadores, e
                ninguém descobre quem deu o quê.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <LinhaDeJogador
              linha={item}
              souEu={item.usuario_id === meuId}
              ehDono={item.usuario_id === turma.dono_id}
              aoTocar={() =>
                router.push({
                  pathname: '/turma/[id]/avaliar/[jogador]',
                  params: { id, jogador: item.usuario_id },
                })
              }
            />
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

/**
 * Junta a lista de membros com o agregado.
 *
 * O agregado nao traz quem esta perguntando -- a propria nota nao sai do banco.
 * Por isso a lista de membros continua sendo a fonte de quem esta na turma, e a
 * nota entra por cima quando existe.
 */
function montarLinhas(membros: MembroDaTurma[], notas: NotaDaTurma[]): LinhaDaQuadra[] {
  const porJogador = new Map(notas.map((nota) => [nota.jogador_id, nota]));

  return membros.map((membro) => ({
    usuario_id: membro.usuario_id,
    nome: membro.perfil?.nome ?? 'Jogador',
    nota: porJogador.get(membro.usuario_id) ?? null,
  }));
}

function LinhaDeJogador({
  linha,
  souEu,
  ehDono,
  aoTocar,
}: {
  linha: LinhaDaQuadra;
  souEu: boolean;
  ehDono: boolean;
  aoTocar: () => void;
}) {
  const etiqueta = souEu ? 'você' : ehDono ? 'dono' : null;

  return (
    <Pressable
      accessibilityRole="button"
      // Ninguem avalia a si mesmo, entao a propria linha nao leva a lugar nenhum.
      disabled={souEu}
      onPress={aoTocar}
      style={({ pressed }) => [estilos.jogador, pressed && estilos.pressionado]}>
      <View style={estilos.identificacao}>
        <Text style={estilos.nomeDoJogador} numberOfLines={1}>
          {linha.nome}
        </Text>
        {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      </View>

      {souEu ? null : (
        <Text style={[estilos.overall, linha.nota?.confiavel ? null : estilos.overallSemNota]}>
          {linha.nota?.confiavel ? linha.nota.overall : '–'}
        </Text>
      )}
    </Pressable>
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
  explicacao: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    lineHeight: 19,
  },
  jogador: {
    alignItems: 'center',
    backgroundColor: Marca.quadraClara,
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  identificacao: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexShrink: 1,
    gap: Spacing.two,
  },
  nomeDoJogador: {
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
  overall: {
    color: Marca.linha,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  overallSemNota: {
    color: Marca.quadra,
  },
  pressionado: {
    opacity: 0.7,
  },
  botaoSair: {
    marginBottom: Spacing.four,
  },
});
