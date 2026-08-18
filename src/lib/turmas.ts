import { supabase } from './supabase';

export type Turma = {
  id: string;
  nome: string;
  codigo: string;
  dono_id: string;
  criado_em: string;
};

export type MembroDaTurma = {
  usuario_id: string;
  entrou_em: string;
  perfil: { nome: string; avatar_url: string | null } | null;
};

const COLUNAS_DA_TURMA = 'id, nome, codigo, dono_id, criado_em';

export const TAMANHO_DO_CODIGO = 6;

/** Tira do que a pessoa digitou tudo que o codigo nao tem: espaco, hifen, caixa baixa. */
export function normalizarCodigo(digitado: string): string {
  return digitado.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * As turmas de quem esta logado.
 *
 * Nao ha filtro por usuario aqui, e isso e proposital: a policy de select em
 * `grupos` ja e "so membro enxerga", entao pedir todos os grupos devolve
 * exatamente os meus. Repetir o filtro no cliente sugeriria que a separacao
 * depende do app estar correto, quando ela e do banco.
 */
export async function listarTurmas(): Promise<Turma[]> {
  const { data, error } = await supabase
    .from('grupos')
    .select(COLUNAS_DA_TURMA)
    .order('criado_em', { ascending: true })
    .overrideTypes<Turma[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

/** Devolve null quando a turma nao existe ou quando quem pergunta nao e membro. */
export async function buscarTurma(id: string): Promise<Turma | null> {
  const { data, error } = await supabase
    .from('grupos')
    .select(COLUNAS_DA_TURMA)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Turma | null, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function listarMembros(grupoId: string): Promise<MembroDaTurma[]> {
  const { data, error } = await supabase
    .from('membros')
    .select('usuario_id, entrou_em, perfil:perfis (nome, avatar_url)')
    .eq('grupo_id', grupoId)
    .order('entrou_em', { ascending: true })
    .overrideTypes<MembroDaTurma[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

/**
 * Cria a turma e ja inscreve quem criou como membro, na mesma transacao.
 *
 * O maybeSingle esta ai porque a funcao devolve uma linha de grupos, e nao um
 * conjunto delas: o PostgREST responde com o objeto direto, e o maybeSingle da
 * conta das duas formas -- ele so desembrulha o que chega como lista.
 */
export async function criarTurma(nome: string): Promise<Turma> {
  const { data, error } = await supabase
    .rpc('criar_turma', { p_nome: nome.trim() })
    .maybeSingle()
    .overrideTypes<Turma | null, { merge: false }>();

  if (error) throw error;
  if (!data) throw new Error('A turma não foi criada. Tente de novo.');
  return data;
}

export async function entrarPorCodigo(codigo: string): Promise<Turma> {
  const { data, error } = await supabase
    .rpc('entrar_por_codigo', { p_codigo: normalizarCodigo(codigo) })
    .maybeSingle()
    .overrideTypes<Turma | null, { merge: false }>();

  if (error) throw error;
  if (!data) throw new Error('Código de convite inválido.');
  return data;
}

/**
 * Sai da turma.
 *
 * Passa por funcao, e nao por delete direto, porque a recusa ao dono precisa
 * chegar como erro. Uma policy que barrasse o dono nao casaria com a linha, e
 * apagar zero linhas e sucesso para o PostgREST -- a tela diria que saiu.
 */
export async function sairDaTurma(grupoId: string): Promise<void> {
  const { error } = await supabase.rpc('sair_da_turma', { p_grupo: grupoId });
  if (error) throw error;
}
