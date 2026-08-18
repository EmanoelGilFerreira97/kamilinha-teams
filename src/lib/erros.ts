/**
 * Texto para mostrar na tela a partir do que foi lancado.
 *
 * O erro do PostgREST nao e um Error: e um objeto simples com `message`, e a
 * mensagem dele ja vem em portugues quando sai de um `raise exception` nosso.
 * Por isso vale a pena aproveita-la em vez de trocar tudo pelo texto padrao.
 */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (typeof erro === 'object' && erro !== null && 'message' in erro) {
    const { message } = erro as { message?: unknown };
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return padrao;
}
