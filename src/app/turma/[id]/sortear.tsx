import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Marca, Spacing } from '@/constants/theme';
import { mensagemDeErro } from '@/lib/erros';
import {
  quantidadeDeTimes,
  sortearTimes,
  tamanhoDoUltimoTime,
  type TimeSorteado,
} from '@/lib/sorteio';
import { listarMembros, type MembroDaTurma } from '@/lib/turmas';

export default function Sortear() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [membros, setMembros] = useState<MembroDaTurma[]>([]);
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  // null enquanto ninguem sorteou: e o que separa o modo "quem veio" do
  // modo resultado.
  const [times, setTimes] = useState<TimeSorteado[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sorteando, setSorteando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const lista = await listarMembros(id);
        if (!ativo) return;
        setMembros(lista);
        // Todo mundo marcado: e mais rapido desmarcar quem faltou do que marcar
        // quem veio.
        setPresentes(new Set(lista.map((m) => m.usuario_id)));
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e, 'Não foi possível carregar a turma.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [id]);

  const total = presentes.size;
  const aviso = useMemo(() => {
    if (total < 4) return 'Marque pelo menos quatro para formar um time.';
    if (tamanhoDoUltimoTime(total) === 1) {
      return `Com ${total} presentes o último time fica com uma pessoa só. Tire ou chame mais alguém.`;
    }
    return null;
  }, [total]);

  function alternar(usuarioId: string) {
    setPresentes((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(usuarioId)) proximo.delete(usuarioId);
      else proximo.add(usuarioId);
      return proximo;
    });
  }

  async function aoSortear() {
    setErro(null);
    setSorteando(true);
    try {
      setTimes(await sortearTimes(id, [...presentes]));
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível sortear os times.'));
    } finally {
      setSorteando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Sortear' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={Marca.ataqueClaro} />
        </View>
      </>
    );
  }

  if (times !== null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Times' }} />
        <View style={estilos.tela}>
          <FlatList
            contentContainerStyle={estilos.lista}
            data={times}
            keyExtractor={(time) => String(time.numero)}
            renderItem={({ item }) => <CartaDoTime time={item} />}
          />
          <View style={estilos.rodape}>
            {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
            <Botao titulo="Sortear de novo" aoTocar={() => void aoSortear()} carregando={sorteando} />
            <Botao
              titulo="Mudar quem veio"
              variante="secundario"
              aoTocar={() => setTimes(null)}
            />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Quem veio hoje?' }} />
      <View style={estilos.tela}>
        <FlatList
          contentContainerStyle={estilos.lista}
          data={membros}
          keyExtractor={(membro) => membro.usuario_id}
          renderItem={({ item }) => (
            <LinhaDePresenca
              nome={item.perfil?.nome ?? 'Jogador'}
              marcado={presentes.has(item.usuario_id)}
              aoTocar={() => alternar(item.usuario_id)}
            />
          )}
        />

        <View style={estilos.rodape}>
          <Text style={estilos.contagem}>
            {total} {total === 1 ? 'presente' : 'presentes'}
            {total >= 4 ? ` · ${quantidadeDeTimes(total)} times` : ''}
          </Text>
          {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
          <Botao
            titulo="Sortear"
            aoTocar={() => void aoSortear()}
            carregando={sorteando}
            desativado={total < 4}
          />
        </View>
      </View>
    </>
  );
}

function LinhaDePresenca({
  nome,
  marcado,
  aoTocar,
}: {
  nome: string;
  marcado: boolean;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      onPress={aoTocar}
      style={({ pressed }) => [estilos.presenca, pressed && estilos.pressionado]}>
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado ? <Text style={estilos.marca}>✓</Text> : null}
      </View>
      <Text style={[estilos.nome, marcado ? null : estilos.nomeAusente]} numberOfLines={1}>
        {nome}
      </Text>
    </Pressable>
  );
}

function CartaDoTime({ time }: { time: TimeSorteado }) {
  return (
    <View style={estilos.carta}>
      <Text style={estilos.tituloDoTime}>
        Time {time.numero}
        <Text style={estilos.tamanhoDoTime}>
          {'  '}
          {time.jogadores.length}
        </Text>
      </Text>
      {time.jogadores.map((jogador) => (
        <Text key={jogador.id} style={estilos.jogador} numberOfLines={1}>
          {jogador.nome}
        </Text>
      ))}
    </View>
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
  lista: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  presenca: {
    alignItems: 'center',
    backgroundColor: Marca.quadraClara,
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  caixa: {
    alignItems: 'center',
    borderColor: Marca.linha,
    borderRadius: 4,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  caixaMarcada: {
    backgroundColor: Marca.ataque,
    borderColor: Marca.ataque,
  },
  marca: {
    color: Marca.linha,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  nome: {
    color: Marca.linha,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  nomeAusente: {
    color: Marca.quadra,
    textDecorationLine: 'line-through',
  },
  carta: {
    backgroundColor: Marca.quadraClara,
    borderRadius: 10,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  tituloDoTime: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: Spacing.one,
    textTransform: 'uppercase',
  },
  tamanhoDoTime: {
    color: Marca.quadra,
    fontWeight: '700',
    letterSpacing: 0,
  },
  jogador: {
    color: Marca.linha,
    fontSize: 17,
    fontWeight: '600',
  },
  rodape: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  contagem: {
    color: Marca.linha,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  aviso: {
    color: Marca.ataqueClaro,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  erro: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressionado: {
    opacity: 0.7,
  },
});
