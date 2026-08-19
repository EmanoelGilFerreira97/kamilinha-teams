import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Spacing, type Cores } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTema, type PreferenciaDeTema } from '@/contexts/tema';
import { sair } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarTurmas, type Turma } from '@/lib/turmas';

/** A ordem do rodizio do botao de tema, e o rotulo de cada parada. */
const TEMAS: { valor: PreferenciaDeTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'auto' },
  { valor: 'claro', rotulo: 'claro' },
  { valor: 'escuro', rotulo: 'escuro' },
];

export default function MinhasTurmas() {
  const { sessao } = useAuth();
  const { cores, preferencia, definirPreferencia } = useTema();
  const estilos = useMemo(() => criarEstilos(cores), [cores]);
  const router = useRouter();
  // null enquanto a primeira busca nao voltou -- diferente de [], que ja e a
  // resposta "voce nao esta em turma nenhuma".
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setTurmas(await listarTurmas());
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar as suas turmas.'));
    }
  }, []);

  // Recarrega ao voltar de criar-turma e de entrar-turma, que nao avisam esta
  // tela do que fizeram.
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const usuario = sessao?.user;
  const nomeCompleto =
    (usuario?.user_metadata?.full_name as string | undefined) ?? usuario?.email ?? '';
  const primeiroNome = nomeCompleto.split(' ')[0];

  const temaAtual = TEMAS.findIndex((t) => t.valor === preferencia);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <View style={estilos.tituloEmpilhado}>
          <Text style={estilos.titulo}>Minhas turmas</Text>
          {primeiroNome ? <Text style={estilos.saudacao}>Boa, {primeiroNome}</Text> : null}
        </View>

        <View style={estilos.acoesDoTopo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tema: ${TEMAS[temaAtual].rotulo}. Tocar para trocar.`}
            hitSlop={Spacing.two}
            onPress={() => definirPreferencia(TEMAS[(temaAtual + 1) % TEMAS.length].valor)}
            style={({ pressed }) => [estilos.tema, pressed && estilos.pressionado]}>
            <Text style={estilos.textoDoTema}>{TEMAS[temaAtual].rotulo}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            hitSlop={Spacing.three}
            onPress={sair}
            style={({ pressed }) => pressed && estilos.pressionado}>
            <Text style={estilos.sair}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        contentContainerStyle={estilos.lista}
        data={turmas ?? []}
        keyExtractor={(turma) => turma.id}
        ListEmptyComponent={
          turmas === null && erro === null ? (
            <ActivityIndicator color={cores.destaque} style={estilos.espera} />
          ) : (
            <Text style={estilos.vazio}>
              {erro ??
                'Você ainda não está em nenhuma turma. Crie a sua ou entre com o código que te mandaram.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/turma/[id]', params: { id: item.id } })}
            style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
            <Text style={estilos.nomeDaTurma}>{item.nome}</Text>
            <Text style={estilos.codigoDaTurma}>{item.codigo}</Text>
          </Pressable>
        )}
      />

      <View style={estilos.acoes}>
        <Botao titulo="Criar turma" aoTocar={() => router.push('/criar-turma')} />
        <Botao
          titulo="Entrar com código"
          variante="secundario"
          aoTocar={() => router.push('/entrar-turma')}
        />
      </View>
    </SafeAreaView>
  );
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
      paddingHorizontal: Spacing.four,
    },
    cabecalho: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.three,
      paddingTop: Spacing.four,
      paddingBottom: Spacing.three,
    },
    tituloEmpilhado: {
      flex: 1,
      gap: Spacing.one,
    },
    titulo: {
      color: cores.texto,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    saudacao: {
      color: cores.destaqueForte,
      fontSize: 15,
    },
    acoesDoTopo: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: Spacing.three,
      paddingTop: Spacing.two,
    },
    tema: {
      borderColor: cores.borda,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.half,
    },
    textoDoTema: {
      color: cores.textoFraco,
      fontSize: 12,
      fontWeight: '700',
    },
    sair: {
      color: cores.textoFraco,
      fontSize: 15,
      fontWeight: '600',
    },
    lista: {
      flexGrow: 1,
      gap: Spacing.two,
      paddingVertical: Spacing.two,
    },
    cartao: {
      backgroundColor: cores.superficie,
      borderRadius: 8,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.four,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.three,
    },
    nomeDaTurma: {
      color: cores.texto,
      flexShrink: 1,
      fontSize: 18,
      fontWeight: '700',
    },
    codigoDaTurma: {
      color: cores.destaqueForte,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 2,
    },
    espera: {
      marginTop: Spacing.six,
    },
    vazio: {
      color: cores.textoFraco,
      fontSize: 15,
      lineHeight: 22,
      marginTop: Spacing.six,
      textAlign: 'center',
    },
    pressionado: {
      opacity: 0.7,
    },
    acoes: {
      gap: Spacing.two,
      paddingBottom: Spacing.four,
      paddingTop: Spacing.three,
    },
  });
}
