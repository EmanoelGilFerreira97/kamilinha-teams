import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Fecha a aba de autenticacao que sobra quando o app volta do navegador.
WebBrowser.maybeCompleteAuthSession();

// `native` tem precedencia sobre todas as outras opcoes. Sem ele, um
// development build carregado pelo Metro devolveria exp://127.0.0.1:8081/--/,
// que nao consta na lista de redirects autorizados do Supabase -- o login
// autentica no Google e depois nao encontra o caminho de volta.
export const redirectTo = makeRedirectUri({ native: 'kamilinhateams://auth' });

if (__DEV__) {
  console.log('[auth] redirectTo =', redirectTo);
}

/**
 * Monta a sessao a partir da URL que o navegador devolveu.
 *
 * Aceita as duas formas: o fluxo PKCE volta com `code` para trocar por sessao,
 * e o implicito ja volta com os tokens prontos na URL.
 */
async function criarSessaoPelaUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

/**
 * Abre o login do Google no navegador do sistema e devolve a sessao criada,
 * ou null se a pessoa fechar a janela antes de concluir.
 */
export async function entrarComGoogle(): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Nos mesmos abrimos o navegador, para poder aguardar o retorno.
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('O Supabase não devolveu a URL de login do Google.');

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (resultado.type !== 'success') return null;

  return criarSessaoPelaUrl(resultado.url);
}

export async function sair(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Exclui a conta e tudo que ela deixou para tras.
 *
 * O signOut vem depois e e `local` de proposito: o usuario ja nao existe no
 * servidor, entao o signOut global responderia 403 e deixaria a sessao morta
 * gravada no aparelho. Local apaga o que esta no AsyncStorage e avisa o
 * onAuthStateChange, que e quem leva a pessoa de volta ao login.
 */
export async function excluirConta(): Promise<void> {
  const { error } = await supabase.rpc('excluir_conta');
  if (error) throw error;

  await supabase.auth.signOut({ scope: 'local' });
}
