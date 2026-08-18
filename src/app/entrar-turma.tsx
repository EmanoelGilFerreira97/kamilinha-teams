import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Marca, Spacing } from '@/constants/theme';
import { mensagemDeErro } from '@/lib/erros';
import { entrarPorCodigo, normalizarCodigo, TAMANHO_DO_CODIGO } from '@/lib/turmas';

export default function EntrarTurma() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const codigoCompleto = codigo.length === TAMANHO_DO_CODIGO;

  async function aoEntrar() {
    setErro(null);
    setEntrando(true);
    try {
      const turma = await entrarPorCodigo(codigo);
      router.replace({ pathname: '/turma/[id]', params: { id: turma.id } });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar na turma. Tente de novo.'));
      setEntrando(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Entrar em uma turma' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.tela}>
        <View style={estilos.formulario}>
          <Text style={estilos.rotulo}>Código de convite</Text>
          <Campo
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            autoFocus
            editable={!entrando}
            maxLength={TAMANHO_DO_CODIGO}
            // Normaliza a cada tecla para o campo aceitar o codigo colado de
            // uma mensagem, com espaco ou em caixa baixa, sem reclamar.
            onChangeText={(digitado) => setCodigo(normalizarCodigo(digitado))}
            onSubmitEditing={() => codigoCompleto && !entrando && void aoEntrar()}
            placeholder="ABC234"
            returnKeyType="done"
            style={estilos.campoDoCodigo}
            value={codigo}
          />
          <Text style={estilos.ajuda}>
            São {TAMANHO_DO_CODIGO} caracteres, e quem já está na turma consegue ver o código na
            tela dela.
          </Text>
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <Botao
          titulo="Entrar na turma"
          aoTocar={() => void aoEntrar()}
          carregando={entrando}
          desativado={!codigoCompleto}
          estilo={estilos.botao}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Marca.quadra,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  formulario: {
    gap: Spacing.two,
  },
  rotulo: {
    color: Marca.linha,
    fontSize: 15,
    fontWeight: '600',
  },
  campoDoCodigo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  ajuda: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    lineHeight: 20,
  },
  erro: {
    color: Marca.ataqueClaro,
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
  botao: {
    marginBottom: Spacing.four,
  },
});
