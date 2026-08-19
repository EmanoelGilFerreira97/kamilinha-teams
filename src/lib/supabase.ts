import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copie .env.example para .env.local e preencha os dois valores.'
  );
}

// O pre-render do Expo Router (web com output "static") roda este modulo no
// Node, onde nao existe `window` -- e o AsyncStorage da web e o localStorage.
// Sem esta guarda o SupabaseAuthClient lanca "window is not defined" ao
// inicializar, e como isso acontece fora de qualquer try o processo inteiro cai.
const noServidor = typeof window === 'undefined';

export const supabase = createClient(url, anonKey, {
  auth: {
    // Nada de storage no servidor: nao ha sessao para guardar num render que
    // termina em HTML, e sem storage o cliente nao tenta ler o localStorage.
    storage: noServidor ? undefined : AsyncStorage,
    autoRefreshToken: !noServidor,
    persistSession: !noServidor,
    // Nao ha URL de navegador para inspecionar em app nativo.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// O refresh automatico so deve rodar com o app em primeiro plano: em segundo
// plano ele gastaria bateria e rede tentando renovar um token que ninguem usa.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
