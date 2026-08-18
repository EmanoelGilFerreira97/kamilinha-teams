import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { SeletorDeNota } from '@/components/seletor-de-nota';
import { Marca, Spacing } from '@/constants/theme';
import { mensagemDeErro } from '@/lib/erros';
import { avaliar, listarMinhasNotas, NOTA_PADRAO } from '@/lib/notas';
import { listarMembros } from '@/lib/turmas';

export default function Avaliar() {
  const { id, jogador } = useLocalSearchParams<{ id: string; jogador: string }>();
  const router = useRouter();

  const [nome, setNome] = useState<string | null>(null);
  const [ataque, setAtaque] = useState(NOTA_PADRAO);
  const [defesa, setDefesa] = useState(NOTA_PADRAO);
  const [levantada, setLevantada] = useState(NOTA_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const [membros, minhas] = await Promise.all([listarMembros(id), listarMinhasNotas(id)]);
        if (!ativo) return;

        setNome(membros.find((m) => m.usuario_id === jogador)?.perfil?.nome ?? 'Jogador');

        // Abre com o que voce deu da ultima vez, para a avaliacao ser correcao
        // e nao chute novo a cada rodada. Ler o proprio voto e a unica leitura
        // de linha crua do sistema, e nao revela voto de mais ninguem.
        const anterior = minhas.find((nota) => nota.avaliado_id === jogador);
        if (anterior) {
          setAtaque(anterior.ataque);
          setDefesa(anterior.defesa);
          setLevantada(anterior.levantada);
        }
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e, 'Não foi possível abrir a avaliação.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [id, jogador]);

  async function aoSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      await avaliar({ grupoId: id, jogadorId: jogador, ataque, defesa, levantada });
      // O detalhe da turma recarrega sozinho ao voltar a ter foco.
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a avaliação.'));
      setSalvando(false);
    }
  }

  const overall = Math.round((ataque + defesa + levantada) / 3);

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Avaliar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={Marca.ataqueClaro} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: nome ?? 'Avaliar' }} />
      <View style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.carta}>
            <Text style={estilos.overall}>{overall}</Text>
            <Text style={estilos.rotuloDoOverall}>overall</Text>
          </View>

          <SeletorDeNota rotulo="Ataque" valor={ataque} aoMudar={setAtaque} />
          <SeletorDeNota rotulo="Defesa" valor={defesa} aoMudar={setDefesa} />
          <SeletorDeNota rotulo="Levantada" valor={levantada} aoMudar={setLevantada} />

          <Text style={estilos.aviso}>
            Sua avaliação é anônima: o banco não devolve quem deu qual nota, nem para você, nem
            para quem foi avaliado. Dá para voltar aqui e mudar quando quiser.
          </Text>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </ScrollView>

        <Botao
          titulo="Salvar avaliação"
          aoTocar={() => void aoSalvar()}
          carregando={salvando}
          estilo={estilos.botao}
        />
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
  conteudo: {
    gap: Spacing.five,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.four,
  },
  carta: {
    alignItems: 'center',
    backgroundColor: Marca.quadraClara,
    borderRadius: 12,
    paddingVertical: Spacing.four,
  },
  overall: {
    color: Marca.linha,
    fontSize: 64,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 70,
  },
  rotuloDoOverall: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  aviso: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    lineHeight: 19,
  },
  erro: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    fontWeight: '600',
  },
  botao: {
    marginBottom: Spacing.four,
  },
});
