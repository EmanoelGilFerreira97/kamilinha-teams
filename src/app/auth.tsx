import { Redirect } from 'expo-router';

/**
 * Destino do redirect do OAuth (kamilinhateams://auth).
 *
 * O sistema entrega o deep link ao app e o expo-router tenta navegar para
 * /auth; sem esta rota ele exibe "Unmatched Route" por cima da tela correta.
 *
 * Aqui nao trocamos o codigo por sessao de novo: isso ja foi feito por
 * entrarComGoogle(), e o codigo do PKCE e de uso unico -- uma segunda troca
 * falharia. Basta devolver o controle ao guarda de rota do layout raiz.
 */
export default function CallbackDoLogin() {
  return <Redirect href="/" />;
}
