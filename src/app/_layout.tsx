import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/auth';

SplashScreen.preventAutoHideAsync();

/**
 * Mantem a rota atual coerente com o estado de login: quem nao tem sessao vai
 * para o login, e quem tem nao consegue voltar para ele.
 */
function GuardaDeRota() {
  const { sessao, carregando } = useAuth();
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

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const esquemaDeCores = useColorScheme();

  return (
    <ThemeProvider value={esquemaDeCores === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <GuardaDeRota />
      </AuthProvider>
    </ThemeProvider>
  );
}
