import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/contexts/auth';
import { TemaProvider, useTema } from '@/contexts/tema';

SplashScreen.preventAutoHideAsync();

/**
 * Mantem a rota atual coerente com o estado de login: quem nao tem sessao vai
 * para o login, e quem tem nao consegue voltar para ele.
 */
function GuardaDeRota() {
  const { sessao, carregando } = useAuth();
  const { cores } = useTema();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    SplashScreen.hideAsync();

    // /auth e o retorno do OAuth. Fica fora do guarda para nao piscar a tela de
    // login no intervalo entre o deep link chegar e a sessao ser gravada; quem
    // tira o usuario de la e o proprio Redirect da rota.
    const emRotaPublica = segmentos[0] === 'login' || segmentos[0] === 'auth';

    if (!sessao && !emRotaPublica) {
      router.replace('/login');
    } else if (sessao && segmentos[0] === 'login') {
      router.replace('/');
    }
  }, [sessao, carregando, segmentos, router]);

  return (
    <Stack
      screenOptions={{
        // As telas desenham o proprio topo; as internas ligam o cabecalho de
        // volta com <Stack.Screen options={{ headerShown: true }} />, e a cor
        // fica aqui para nao repetir a paleta em cada rota.
        headerShown: false,
        headerStyle: { backgroundColor: cores.fundo },
        headerTintColor: cores.texto,
        headerTitleStyle: { fontWeight: '700' },
        // Sem isto o fundo branco do navegador pisca entre uma tela e outra.
        contentStyle: { backgroundColor: cores.fundo },
      }}
    />
  );
}

/** Fica separado do RootLayout porque precisa estar dentro do TemaProvider. */
function Raiz() {
  const { esquema } = useTema();

  return (
    <ThemeProvider value={esquema === 'dark' ? DarkTheme : DefaultTheme}>
      {/* No tema claro os icones da barra de status precisam escurecer, senao
          somem no fundo branco. */}
      <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <GuardaDeRota />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TemaProvider>
      <Raiz />
    </TemaProvider>
  );
}
