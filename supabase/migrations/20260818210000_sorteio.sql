-- Fase 04 -- Sorteio de times.
--
-- ---------------------------------------------------------------------------
-- Por que o sorteio roda no banco
-- ---------------------------------------------------------------------------
--
-- notas_da_turma() nao devolve a nota de quem pergunta -- a propria nota nao sai
-- do banco. Mas o snake draft precisa escalar quem pergunta tambem, e para isso
-- precisa do overall dela.
--
-- Entao o sorteio roda aqui: usa o overall de todo mundo e devolve so a
-- composicao dos times. O numero e usado sem nunca ser devolvido.
--
-- Limite conhecido: o draft ordena por overall, e voce ja enxerga o overall dos
-- outros. Dai da para simular o sorteio com o seu valor como incognita e cercar
-- onde voce caiu. Nao fere o anonimato dos avaliadores, que e a regra dura; fere
-- por aproximacao a regra branda de nao ver a propria nota. Por isso a resposta
-- traz os times em ordem alfabetica, nunca em ordem de escolha, e nao traz nota
-- nem soma de time -- soma de time com tres companheiros conhecidos resolveria o
-- seu numero exatamente.

-- ---------------------------------------------------------------------------
-- O calculo do overall, agora em um lugar so
--
-- Esta funcao NAO filtra quem esta perguntando: e o que o sorteio precisa, e e
-- exatamente o que nao pode chegar ao cliente. Ela e interna, sem grant para
-- ninguem. Quem chama sao notas_da_turma() e sortear_times(), que rodam como
-- donas do banco e por isso nao dependem de grant.
--
-- Conceder execute nesta funcao a `authenticated` entrega a nota de cada um
-- para o proprio. Nao faca.
-- ---------------------------------------------------------------------------

create or replace function public.overall_do_grupo(p_grupo uuid)
returns table (
  quem uuid,
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
  c_prior constant int := 50;
  c_peso constant int := 5;
  c_piso constant int := 5;
begin
  return query
  with agregado as (
    select
      n.avaliado_id as alvo,
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
      m.usuario_id as alvo,
      coalesce(a.votos, 0) >= c_piso as passou_do_piso,
      round((c_peso * c_prior + coalesce(a.soma_ataque, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as ataque,
      round((c_peso * c_prior + coalesce(a.soma_defesa, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as defesa,
      round((c_peso * c_prior + coalesce(a.soma_levantada, 0))
            / (c_peso + coalesce(a.votos, 0)))::smallint as levantada
    from public.membros m
    left join agregado a on a.alvo = m.usuario_id
    where m.grupo_id = p_grupo
  ),
  exibido as (
    select
      c.alvo,
      c.passou_do_piso,
      case when c.passou_do_piso then c.ataque else c_prior::smallint end as ataque,
      case when c.passou_do_piso then c.defesa else c_prior::smallint end as defesa,
      case when c.passou_do_piso then c.levantada else c_prior::smallint end as levantada
    from calculado c
  )
  select
    e.alvo,
    e.ataque,
    e.defesa,
    e.levantada,
    round((e.ataque + e.defesa + e.levantada) / 3.0)::smallint,
    e.passou_do_piso
  from exibido e;
end;
$$;

-- notas_da_turma passa a ser o filtro em cima da funcao acima, para a formula
-- bayesiana existir uma vez so e nao divergir entre as duas leituras.
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
begin
  if not public.e_membro(p_grupo) then
    raise exception 'Você não faz parte desta turma.';
  end if;

  return query
  select f.quem, p.nome, f.ataque, f.defesa, f.levantada, f.overall, f.confiavel
  from public.overall_do_grupo(p_grupo) f
  join public.perfis p on p.id = f.quem
  -- A propria nota nao sai do banco.
  where f.quem <> (select auth.uid())
  order by f.overall desc, p.nome;
end;
$$;

-- ---------------------------------------------------------------------------
-- O sorteio
-- ---------------------------------------------------------------------------

create or replace function public.sortear_times(p_grupo uuid, p_jogadores uuid[])
returns table (
  time_numero smallint,
  jogador_id uuid,
  jogador_nome text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_total int;
  v_times int;
begin
  if not public.e_membro(p_grupo) then
    raise exception 'Você não faz parte desta turma.';
  end if;

  -- Repetido na lista nao pode virar jogador a mais.
  select array_agg(distinct t.id) into v_ids from unnest(p_jogadores) as t(id);
  v_total := coalesce(array_length(v_ids, 1), 0);

  if v_total < 4 then
    raise exception 'Escolha pelo menos quatro jogadores para formar um time.';
  end if;

  if exists (
    select 1 from unnest(v_ids) as t(id)
    where not public.e_membro_de(p_grupo, t.id)
  ) then
    raise exception 'Alguém da lista não está nesta turma.';
  end if;

  -- Quartetos, e o ultimo time joga curto: os primeiros levam 4, o ultimo leva
  -- o que sobrar.
  v_times := ceil(v_total / 4.0);

  return query
  with forca as (
    select f.quem, f.overall
    from public.overall_do_grupo(p_grupo) f
    where f.quem = any(v_ids)
  ),
  sorteados as (
    -- O sorteio fica em uma coluna, e nao dentro do order by, para cada linha
    -- receber um valor so e a ordenacao ser estavel dentro da consulta.
    select f.quem, f.overall, random() as sorte
    from forca f
  ),
  ordenados as (
    -- A sorte so desempata. E o que faz os times variarem de uma semana para a
    -- outra sem bagunçar o equilibrio.
    select s.quem, row_number() over (order by s.overall desc, s.sorte) as escolha
    from sorteados s
  ),
  capacidades as (
    select
      t.numero,
      case when t.numero < v_times then 4 else v_total - 4 * (v_times - 1) end as capacidade
    from generate_series(1, v_times) as t(numero)
  ),
  -- Ordem serpentina: a rodada 1 vai do primeiro time ao ultimo, a 2 volta, e
  -- assim por diante. Time que ja encheu nao aparece na rodada seguinte -- e o
  -- que impede o ultimo time, mais curto, de atrapalhar a alternancia.
  ordem as (
    select
      c.numero,
      row_number() over (
        order by r.rodada,
                 case when r.rodada % 2 = 1 then c.numero else -c.numero end
      ) as escolha
    from generate_series(1, 4) as r(rodada)
    join capacidades c on c.capacidade >= r.rodada
  )
  select o.numero::smallint, od.quem, p.nome
  from ordenados od
  join ordem o on o.escolha = od.escolha
  join public.perfis p on p.id = od.quem
  -- Alfabetica dentro do time, nunca a ordem de escolha: a ordem de escolha e o
  -- ranking, e o ranking e justamente o que nao pode voltar.
  order by o.numero, p.nome;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- overall_do_grupo nao recebe grant de ninguem, e isso e deliberado: ela e a
-- unica funcao do sistema que devolve a nota de quem pergunta. Quem a chama sao
-- notas_da_turma() e sortear_times(), que rodam como donas do banco.
-- ---------------------------------------------------------------------------

revoke all on function public.overall_do_grupo(uuid) from public, anon, authenticated;

revoke all on function public.sortear_times(uuid, uuid[]) from public, anon;
grant execute on function public.sortear_times(uuid, uuid[]) to authenticated;

-- create or replace preserva privilegio, mas a fase 02 ensinou a nao confiar em
-- leitura de documentacao quando o custo de conferir e uma linha.
revoke all on function public.notas_da_turma(uuid) from public, anon;
grant execute on function public.notas_da_turma(uuid) to authenticated;
