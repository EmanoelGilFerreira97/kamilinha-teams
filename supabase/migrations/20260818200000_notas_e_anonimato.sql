-- Fase 03 -- Notas e anonimato.
--
-- A regra do produto: ninguem descobre quem deu qual nota. Ela nao vive na
-- tela, vive aqui -- qualquer pessoa com a anon key fala com a API REST direto.
--
-- ---------------------------------------------------------------------------
-- Por que `notas` nao tem policy nenhuma
-- ---------------------------------------------------------------------------
--
-- O docs/decisoes.md pedia policy de INSERT e de UPDATE, e nenhuma de SELECT.
-- Esse desenho nao fecha, e a documentacao do Postgres diz por que (tabela 297
-- de CREATE POLICY): em `insert ... on conflict do update`, a policy de SELECT
-- e aplicada para checar a linha existente; e um `update` comum precisa de um
-- `where` para achar a linha, o que exige direito de leitura e faz valer as
-- policies de SELECT junto com as de UPDATE.
--
-- Sem policy de SELECT, entao, a policy de UPDATE nunca dispararia: o update
-- casaria com zero linhas. E casar com zero linhas nao da erro -- e a mesma
-- armadilha que fez `sair_da_turma` virar funcao na fase 02. Ninguem
-- conseguiria corrigir uma nota, e a tela diria que corrigiu.
--
-- A saida aperta em vez de afrouxar: RLS ligada e **nenhuma policy**. Com isso
-- a tabela fica inalcancavel pelo cliente, e as tres funcoes abaixo sao a
-- unica porta. O invariante fica mais forte que o original e se confere com uma
-- consulta so -- `pg_policies` nao pode ter uma linha sequer para `notas`.

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------

create table if not exists public.notas (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  avaliador_id uuid not null references public.perfis (id) on delete cascade,
  avaliado_id uuid not null references public.perfis (id) on delete cascade,
  ataque smallint not null check (ataque between 0 and 100),
  defesa smallint not null check (defesa between 0 and 100),
  levantada smallint not null check (levantada between 0 and 100),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Um voto por par, por turma. E o que faz o `on conflict` de avaliar() ser
  -- correcao de voto, e nao voto novo empilhado.
  primary key (grupo_id, avaliador_id, avaliado_id),
  constraint notas_ninguem_se_autoavalia check (avaliador_id <> avaliado_id)
);

alter table public.notas enable row level security;

-- Nenhuma policy, de proposito. Ver o cabecalho.

-- A PK atende a busca por avaliador. Este indice atende a do agregado, que
-- agrupa por avaliado dentro da turma.
create index if not exists notas_avaliado_idx on public.notas (grupo_id, avaliado_id);

-- ---------------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------------

-- e_membro() responde por quem esta logado. Esta responde por terceiro, que e o
-- que avaliar() precisa saber sobre o avaliado.
create or replace function public.e_membro_de(p_grupo uuid, p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    where m.grupo_id = p_grupo
      and m.usuario_id = p_usuario
  );
$$;

-- ---------------------------------------------------------------------------
-- Escrever: avaliar
-- ---------------------------------------------------------------------------

create or replace function public.avaliar(
  p_grupo uuid,
  p_avaliado uuid,
  p_ataque int,
  p_defesa int,
  p_levantada int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para avaliar.';
  end if;

  if v_usuario = p_avaliado then
    raise exception 'Ninguém avalia a si mesmo.';
  end if;

  -- A tabela nao tem policy, e esta funcao roda como dona do banco. Estas duas
  -- checagens sao a regra inteira: sem elas, bastaria ter os ids na mao para
  -- avaliar alguem de turma alheia.
  if not public.e_membro(p_grupo) then
    raise exception 'Você não faz parte desta turma.';
  end if;

  if not public.e_membro_de(p_grupo, p_avaliado) then
    raise exception 'Essa pessoa não está nesta turma.';
  end if;

  -- O check da tabela ja barraria, mas com a mensagem crua do Postgres. Esta
  -- chega legivel na tela.
  if p_ataque not between 0 and 100
    or p_defesa not between 0 and 100
    or p_levantada not between 0 and 100 then
    raise exception 'As notas vão de 0 a 100.';
  end if;

  insert into public.notas (
    grupo_id, avaliador_id, avaliado_id, ataque, defesa, levantada
  )
  values (
    p_grupo, v_usuario, p_avaliado,
    p_ataque::smallint, p_defesa::smallint, p_levantada::smallint
  )
  on conflict (grupo_id, avaliador_id, avaliado_id) do update
    set ataque = excluded.ataque,
        defesa = excluded.defesa,
        levantada = excluded.levantada,
        atualizado_em = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Ler: o proprio voto, e o agregado da turma
-- ---------------------------------------------------------------------------

create or replace function public.minhas_notas(p_grupo uuid)
returns table (
  avaliado_id uuid,
  ataque smallint,
  defesa smallint,
  levantada smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  -- Nao checa pertencimento porque o filtro por avaliador_id ja basta: quem nao
  -- e membro nao tem linha aqui. Reler o proprio voto nao revela voto alheio --
  -- e a unica leitura de linha crua que existe no sistema.
  select n.avaliado_id, n.ataque, n.defesa, n.levantada
  from public.notas n
  where n.grupo_id = p_grupo
    and n.avaliador_id = (select auth.uid());
$$;

create or replace function public.notas_da_turma(p_grupo uuid)
returns table (
  jogador_id uuid,
  jogador_nome text,
  ataque smallint,
  defesa smallint,
  levantada smallint,
  overall smallint,
  confiavel boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- Prior da media bayesiana: o meio da escala. `peso` e quanto ele vale, em
  -- votos equivalentes. `piso` e o minimo de avaliadores para o numero sair
  -- calculado.
  --
  -- Piso 5 e nao 3 por causa da escala larga: em 0-100 um voto e quase uma
  -- impressao digital, e o trio de atributos identifica o avaliador melhor
  -- ainda.
  c_prior constant int := 50;
  c_peso constant int := 5;
  c_piso constant int := 5;
begin
  -- Roda como dona do banco, entao faz ela mesma o que a RLS faria. Sem esta
  -- linha, qualquer pessoa logada leria o agregado de qualquer turma so
  -- passando o id.
  if not public.e_membro(p_grupo) then
    raise exception 'Você não faz parte desta turma.';
  end if;

  return query
  with agregado as (
    select
      n.avaliado_id as quem,
      count(*)::int as votos,
      sum(n.ataque)::numeric as soma_ataque,
      sum(n.defesa)::numeric as soma_defesa,
      sum(n.levantada)::numeric as soma_levantada
    from public.notas n
    where n.grupo_id = p_grupo
    group by n.avaliado_id
  ),
  calculado as (
    select
      m.usuario_id as quem,
      coalesce(a.votos, 0) >= c_piso as passou_do_piso,
      -- (peso * prior + soma) / (peso + n). Media bayesiana, e nao a crua, para
      -- o numero exibido nao ser aritmetica reversivel dos votos.
      round((c_peso * c_prior + coalesce(a.soma_ataque, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as ataque,
      round((c_peso * c_prior + coalesce(a.soma_defesa, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as defesa,
      round((c_peso * c_prior + coalesce(a.soma_levantada, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as levantada
    from public.membros m
    left join agregado a on a.quem = m.usuario_id
    where m.grupo_id = p_grupo
      -- A propria nota nao sai do banco.
      and m.usuario_id <> (select auth.uid())
  ),
  exibido as (
    -- Abaixo do piso sai exatamente o prior. Numero fixo nao carrega informacao
    -- de voto nenhum, e ainda entrega valor usavel para o sorteio da fase 04.
    select
      c.quem,
      c.passou_do_piso,
      case when c.passou_do_piso then c.ataque else c_prior::smallint end as ataque,
      case when c.passou_do_piso then c.defesa else c_prior::smallint end as defesa,
      case when c.passou_do_piso then c.levantada else c_prior::smallint end as levantada
    from calculado c
  ),
  com_overall as (
    select
      e.quem,
      e.passou_do_piso,
      e.ataque,
      e.defesa,
      e.levantada,
      -- Media dos tres ja arredondados: o numero grande tem de bater com a
      -- conta que da para fazer de cabeca olhando a tela.
      round((e.ataque + e.defesa + e.levantada) / 3.0)::smallint as overall
    from exibido e
  )
  select o.quem, p.nome, o.ataque, o.defesa, o.levantada, o.overall, o.passou_do_piso
  from com_overall o
  join public.perfis p on p.id = o.quem
  order by o.overall desc, p.nome;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- Revogar das duas fontes antes de conceder: o EXECUTE que o Postgres da a
-- PUBLIC em toda funcao nova, e o que o Supabase da a anon e authenticated por
-- alter default privileges. Foi o que faltou na fase 02.
-- ---------------------------------------------------------------------------

revoke all on function public.e_membro_de(uuid, uuid) from public, anon;
revoke all on function public.avaliar(uuid, uuid, int, int, int) from public, anon;
revoke all on function public.minhas_notas(uuid) from public, anon;
revoke all on function public.notas_da_turma(uuid) from public, anon;

grant execute on function public.e_membro_de(uuid, uuid) to authenticated;
grant execute on function public.avaliar(uuid, uuid, int, int, int) to authenticated;
grant execute on function public.minhas_notas(uuid) to authenticated;
grant execute on function public.notas_da_turma(uuid) to authenticated;
