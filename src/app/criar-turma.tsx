import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Marca, Spacing } from '@/constants/theme';
import { mensagemDeErro } from '@/lib/erros';
import { criarTurma } from '@/lib/turmas';

const NOME_MINIMO = 2;
const NOME_MAXIMO = 40;

export default function CriarTurma() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nomeValido = nome.trim().length >= NOME_MINIMO;

  async function aoCriar() {
    setErro(null);
    setCriando(true);
    try {
      const turma = await criarTurma(nome);
      // replace e nao push: voltar da turma recem-criada tem de cair na lista,
      // nao neste formulario ja preenchido.
      router.replace({ pathname: '/turma/[id]', params: { id: turma.id } });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível criar a turma. Tente de novo.'));
      setCriando(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Nova turma' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.tela}>
        <View style={estilos.formulario}>
          <Text style={estilos.rotulo}>Nome da turma</Text>
          <Campo
            autoFocus
            editable={!criando}
            maxLength={NOME_MAXIMO}
            onChangeText={setNome}
            onSubmitEditing={() => nomeValido && !criando && void aoCriar()}
            placeholder="Vôlei de quinta"
            returnKeyType="done"
            value={nome}
          />
          <Text style={estilos.ajuda}>
            Você vira o dono da turma e recebe um código para convidar o resto do pessoal.
          </Text>
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <Botao
          titulo="Criar turma"
          aoTocar={() => void aoCriar()}
          carregando={criando}
          desativado={!nomeValido}
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
