import { supabase } from './supabase';

/** Uma linha do agregado da turma. Nunca traz a contagem de votos. */
export type NotaDaTurma = {
  jogador_id: string;
  jogador_nome: string;
  ataque: number;
  defesa: number;
  levantada: number;
  overall: number;
  /** false enquanto o jogador nao tiver avaliadores suficientes. */
  confiavel: boolean;
};

/** O que voce mesmo deu. E a unica leitura de linha crua que existe. */
export type MinhaNota = {
  avaliado_id: string;
  ataque: number;
  defesa: number;
  levantada: number;
};

export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 100;
/** Meio da escala, e tambem o prior da media bayesiana do banco. */
export const NOTA_PADRAO = 50;

/**
 * O agregado da turma, sem voce.
 *
 * A funcao do banco tira quem pergunta do resultado -- a propria nota nao sai
 * do banco, entao nao adianta a tela querer mostrar.
 */
export async function listarNotasDaTurma(grupoId: string): Promise<NotaDaTurma[]> {
  const { data, error } = await supabase
    .rpc('notas_da_turma', { p_grupo: grupoId });

  if (error) throw error;
  // Sem os tipos gerados do banco -- que precisariam do Supabase CLI -- o
  // postgrest-js nao sabe o formato de retorno de cada funcao e chuta objeto
  // unico para RPC. Esta devolve conjunto, entao a asercao e a forma honesta:
  // o contrato de verdade esta na migracao.
  return (data ?? []) as NotaDaTurma[];
}

export async function listarMinhasNotas(grupoId: string): Promise<MinhaNota[]> {
  const { data, error } = await supabase
    .rpc('minhas_notas', { p_grupo: grupoId });

  if (error) throw error;
  return (data ?? []) as MinhaNota[];
}

export async function avaliar(entrada: {
  grupoId: string;
  jogadorId: string;
  ataque: number;
  defesa: number;
  levantada: number;
}): Promise<void> {
  const { error } = await supabase.rpc('avaliar', {
    p_grupo: entrada.grupoId,
    p_avaliado: entrada.jogadorId,
    p_ataque: entrada.ataque,
    p_defesa: entrada.defesa,
    p_levantada: entrada.levantada,
  });

  if (error) throw error;
}
