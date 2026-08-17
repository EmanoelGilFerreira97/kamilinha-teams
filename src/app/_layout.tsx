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

    const naTelaDeLogin = segmentos[0] === 'login';

    if (!sessao && !naTelaDeLogin) {
      router.replace('/login');
    } else if (sessao && naTelaDeLogin) {
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
