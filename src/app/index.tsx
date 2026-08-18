import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Marca, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { sair } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarTurmas, type Turma } from '@/lib/turmas';

export default function MinhasTurmas() {
  const { sessao } = useAuth();
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <View style={estilos.tituloEmpilhado}>
          <Text style={estilos.titulo}>Minhas turmas</Text>
          {primeiroNome ? <Text style={estilos.saudacao}>Boa, {primeiroNome}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={Spacing.three}
          onPress={sair}
          style={({ pressed }) => pressed && estilos.pressionado}>
          <Text style={estilos.sair}>Sair</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={estilos.lista}
        data={turmas ?? []}
        keyExtractor={(turma) => turma.id}
        ListEmptyComponent={<EstadoVazio carregando={turmas === null && erro === null} erro={erro} />}
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

function EstadoVazio({ carregando, erro }: { carregando: boolean; erro: string | null }) {
  if (carregando) return <ActivityIndicator color={Marca.ataqueClaro} style={estilos.espera} />;

  return (
    <Text style={estilos.vazio}>
      {erro ??
        'Você ainda não está em nenhuma turma. Crie a sua ou entre com o código que te mandaram.'}
    </Text>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Marca.quadra,
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
    color: Marca.linha,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  saudacao: {
    color: Marca.ataqueClaro,
    fontSize: 15,
  },
  sair: {
    color: Marca.quadraClara,
    fontSize: 15,
    fontWeight: '600',
    paddingTop: Spacing.two,
  },
  lista: {
    flexGrow: 1,
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  cartao: {
    backgroundColor: Marca.quadraClara,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  nomeDaTurma: {
    color: Marca.linha,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  codigoDaTurma: {
    color: Marca.ataqueClaro,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
  },
  espera: {
    marginTop: Spacing.six,
  },
  vazio: {
    color: Marca.ataqueClaro,
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
