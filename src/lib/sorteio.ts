import { supabase } from './supabase';

export type TimeSorteado = {
  numero: number;
  jogadores: { id: string; nome: string }[];
};

type LinhaSorteada = {
  time_numero: number;
  jogador_id: string;
  jogador_nome: string;
};

export const TAMANHO_DO_TIME = 4;

/** Quantos times saem de uma quantidade de presentes. */
export function quantidadeDeTimes(presentes: number): number {
  return Math.ceil(presentes / TAMANHO_DO_TIME);
}

/**
 * Quantos jogadores ficam no ultimo time.
 *
 * Os primeiros levam quatro e o ultimo leva o que sobrar, entao com 5, 9 ou 13
 * presentes ele fica com uma pessoa so. A tela avisa antes de sortear.
 */
export function tamanhoDoUltimoTime(presentes: number): number {
  return presentes - TAMANHO_DO_TIME * (quantidadeDeTimes(presentes) - 1);
}

/**
 * Sorteia os times entre os presentes.
 *
 * O calculo roda no banco porque o snake draft precisa do overall de quem esta
 * chamando, e esse numero nao sai de la. A resposta traz so a composicao --
 * nem nota, nem soma de time.
 */
export async function sortearTimes(
  grupoId: string,
  jogadorIds: string[]
): Promise<TimeSorteado[]> {
  const { data, error } = await supabase.rpc('sortear_times', {
    p_grupo: grupoId,
    p_jogadores: jogadorIds,
  });

  if (error) throw error;

  const times = new Map<number, TimeSorteado>();
  for (const linha of (data ?? []) as LinhaSorteada[]) {
    const time = times.get(linha.time_numero) ?? { numero: linha.time_numero, jogadores: [] };
    time.jogadores.push({ id: linha.jogador_id, nome: linha.jogador_nome });
    times.set(linha.time_numero, time);
  }

  return [...times.values()].sort((a, b) => a.numero - b.numero);
}
