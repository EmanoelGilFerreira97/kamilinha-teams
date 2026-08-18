import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Marca, Spacing } from '@/constants/theme';
import { NOTA_MAXIMA, NOTA_MINIMA } from '@/lib/notas';

type Props = {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
};

/**
 * Barra de 0 a 100 no estilo carta do FIFA, arrastavel, com passo fino nos
 * botoes das pontas -- acertar um valor exato arrastando com o dedo em uma
 * escala de 101 posicoes nao acontece.
 *
 * Feita com PanResponder, que e do core do React Native. Um slider de
 * biblioteca traria modulo nativo, e modulo nativo novo obriga a gerar outro
 * development build antes de dar para testar qualquer coisa.
 */
export function SeletorDeNota({ rotulo, valor, aoMudar }: Props) {
  const [largura, setLargura] = useState(0);

  // O PanResponder e montado uma vez e fecha sobre o primeiro render; sem as
  // refs ele ficaria enxergando a largura zero e o callback velho para sempre.
  const larguraRef = useRef(0);
  const aoMudarRef = useRef(aoMudar);
  const inicioRef = useRef(0);
  aoMudarRef.current = aoMudar;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evento) => {
        inicioRef.current = evento.nativeEvent.locationX;
        aplicar(inicioRef.current);
      },
      // dx a partir do ponto do toque, e nao moveX: moveX e coordenada de tela,
      // que exigiria saber onde a barra comeca na pagina.
      onPanResponderMove: (_evento, gesto) => aplicar(inicioRef.current + gesto.dx),
    })
  ).current;

  function aplicar(x: number) {
    const total = larguraRef.current;
    if (total <= 0) return;
    const proporcao = Math.min(1, Math.max(0, x / total));
    aoMudarRef.current(Math.round(NOTA_MINIMA + proporcao * (NOTA_MAXIMA - NOTA_MINIMA)));
  }

  function passo(delta: number) {
    aoMudar(Math.min(NOTA_MAXIMA, Math.max(NOTA_MINIMA, valor + delta)));
  }

  const preenchido = ((valor - NOTA_MINIMA) / (NOTA_MAXIMA - NOTA_MINIMA)) * largura;

  return (
    <View style={estilos.bloco}>
      <View style={estilos.linhaDoTopo}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor}>{valor}</Text>
      </View>

      <View style={estilos.linhaDaBarra}>
        <BotaoDePasso rotulo="−" aoTocar={() => passo(-1)} />

        <View
          accessibilityRole="adjustable"
          accessibilityLabel={rotulo}
          accessibilityValue={{ min: NOTA_MINIMA, max: NOTA_MAXIMA, now: valor }}
          onLayout={(evento) => {
            const { width } = evento.nativeEvent.layout;
            larguraRef.current = width;
            setLargura(width);
          }}
          style={estilos.trilho}
          {...responder.panHandlers}>
          <View style={[estilos.preenchimento, { width: preenchido }]} />
          <View style={[estilos.botao, { left: Math.max(0, preenchido - 11) }]} />
        </View>

        <BotaoDePasso rotulo="+" aoTocar={() => passo(1)} />
      </View>
    </View>
  );
}

function BotaoDePasso({ rotulo, aoTocar }: { rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo === '+' ? 'Aumentar um ponto' : 'Diminuir um ponto'}
      hitSlop={Spacing.two}
      onPress={aoTocar}
      style={({ pressed }) => [estilos.passo, pressed && estilos.pressionado]}>
      <Text style={estilos.textoDoPasso}>{rotulo}</Text>
    </Pressable>
  );
}

const ALTURA_DO_TRILHO = 10;
const LADO_DO_BOTAO = 22;

const estilos = StyleSheet.create({
  bloco: {
    gap: Spacing.two,
  },
  linhaDoTopo: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rotulo: {
    color: Marca.linha,
    fontSize: 16,
    fontWeight: '600',
  },
  valor: {
    color: Marca.ataqueClaro,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  linhaDaBarra: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  trilho: {
    backgroundColor: Marca.quadraClara,
    borderRadius: ALTURA_DO_TRILHO / 2,
    flex: 1,
    height: ALTURA_DO_TRILHO,
    justifyContent: 'center',
    // Area de toque maior que o desenho, sem mexer no layout.
    paddingVertical: Spacing.three,
    marginVertical: -Spacing.three,
  },
  preenchimento: {
    backgroundColor: Marca.ataque,
    borderRadius: ALTURA_DO_TRILHO / 2,
    height: ALTURA_DO_TRILHO,
  },
  botao: {
    backgroundColor: Marca.linha,
    borderRadius: LADO_DO_BOTAO / 2,
    height: LADO_DO_BOTAO,
    position: 'absolute',
    width: LADO_DO_BOTAO,
  },
  passo: {
    alignItems: 'center',
    borderColor: Marca.quadraClara,
    borderRadius: 6,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  textoDoPasso: {
    color: Marca.linha,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  pressionado: {
    opacity: 0.6,
  },
});
