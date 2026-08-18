-- Fase 02 -- Turmas e perfis.
--
-- Cria as tres tabelas da fase e a RLS que sustenta as duas regras do produto:
-- so quem e membro enxerga a turma, e so se entra em turma por convite.
--
-- Este arquivo e idempotente: pode rodar de novo sem quebrar.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Espelho de auth.users no schema public. Existe porque auth.users nao pode ser
-- lido pelo cliente, e porque so uma tabela em public serve de alvo de chave
-- estrangeira para o PostgREST montar os joins (o membros -> perfis abaixo).
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  avatar_url text,
  criado_em timestamptz not null default now()
);

create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 40),
  -- Alfabeto sem I, L, O, 0 e 1: o codigo e ditado em quadra e transcrito no
  -- celular do outro, entao nao pode ter par que se confunda escrito a mao.
  codigo text not null unique check (codigo ~ '^[A-HJKMNP-Z2-9]{6}$'),
  dono_id uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

-- A PK ja cobre a busca por grupo_id. Este indice cobre o outro lado, que roda
-- em toda abertura do app: "as turmas de quem esta logado".
create index if not exists membros_usuario_idx on public.membros (usuario_id);

-- ---------------------------------------------------------------------------
-- Funcoes de apoio das policies
--
-- Uma policy de membros que consultasse membros entraria em recursao infinita.
-- Estas funcoes sao security definer, entao rodam por fora da RLS e cortam o
-- ciclo. `set search_path = ''` obriga o nome qualificado e impede que um
-- schema no caminho de busca sequestre a resolucao dentro de uma funcao que
-- roda como dono do banco.
-- ---------------------------------------------------------------------------

create or replace function public.e_membro(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- auth.uid() vem embrulhado em select para o planejador avaliar uma vez por
  -- comando, e nao uma vez por linha varrida.
  select exists (
    select 1
    from public.membros m
    where m.grupo_id = p_grupo
      and m.usuario_id = (select auth.uid())
  );
$$;

-- Alcance da visibilidade de perfil: so vejo o nome de quem divide turma
-- comigo. Sem isso a tabela de perfis viraria uma lista de todo mundo que ja
-- abriu o app.
create or replace function public.compartilha_turma(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros meus
    join public.membros outros on outros.grupo_id = meus.grupo_id
    where meus.usuario_id = (select auth.uid())
      and outros.usuario_id = p_usuario
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.grupos enable row level security;
alter table public.membros enable row level security;

drop policy if exists "perfis_leitura_de_quem_divide_turma" on public.perfis;
create policy "perfis_leitura_de_quem_divide_turma"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()) or public.compartilha_turma(id));

drop policy if exists "perfis_cada_um_edita_o_seu" on public.perfis;
create policy "perfis_cada_um_edita_o_seu"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sem policy de INSERT em perfis: quem cria a linha e o gatilho abaixo. Sem
-- policy de DELETE: o perfil morre junto com o usuario, por cascata.

-- Esta policy e o que faz `select * from grupos` devolver exatamente as turmas
-- de quem perguntou -- o cliente nao precisa filtrar nada.
drop policy if exists "grupos_so_membro_enxerga" on public.grupos;
create policy "grupos_so_membro_enxerga"
  on public.grupos for select to authenticated
  using (public.e_membro(id));

-- Sem policy de INSERT em grupos: criar turma passa por criar_turma(), que
-- tambem inscreve o dono como membro. Deixar o cliente inserir direto abriria
-- espaco para turma sem dono na lista de membros.

drop policy if exists "membros_so_membro_ve_a_lista" on public.membros;
create policy "membros_so_membro_ve_a_lista"
  on public.membros for select to authenticated
  using (public.e_membro(grupo_id));

-- Sem policy de DELETE em membros: sair da turma passa por sair_da_turma(),
-- que recusa o dono com uma mensagem. Como policy, a recusa nao viraria erro:
-- ela apenas nao casaria com a linha, e um delete que apaga zero linhas e
-- sucesso para o PostgREST -- a tela diria que saiu.

-- Sem policy de INSERT em membros: a unica porta de entrada e o codigo de
-- convite, via entrar_por_codigo(). Com INSERT liberado, bastaria adivinhar um
-- grupo_id para entrar em turma alheia.

-- ---------------------------------------------------------------------------
-- Perfil automatico
-- ---------------------------------------------------------------------------

create or replace function public.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, avatar_url)
  values (
    new.id,
    -- O Google manda full_name; name cobre outros provedores; o e-mail e o
    -- ultimo recurso, porque perfil sem nome quebraria a lista da turma.
    -- left() porque nome do Google pode passar de 80 caracteres e o check da
    -- tabela recusaria a linha. Como este gatilho roda dentro do insert em
    -- auth.users, a recusa derrubaria o cadastro inteiro da pessoa.
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(new.email, ''),
      'Jogador'
    ), 80),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_novo_usuario();

-- Quem entrou no app na fase 01 e anterior ao gatilho. Sem esta carga, a
-- primeira turma criada por essas contas falharia na chave estrangeira.
insert into public.perfis (id, nome, avatar_url)
select
  u.id,
  left(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(u.email, ''),
    'Jogador'
  ), 80),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Criar turma e entrar por codigo
-- ---------------------------------------------------------------------------

create or replace function public.gerar_codigo_de_convite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidato text;
  tentativa int;
  posicao int;
begin
  -- 31^6 = 887 milhoes de combinacoes, entao colidir e raro. O laco existe
  -- porque "raro" com unique constraint vira erro na cara de quem cria a turma.
  for tentativa in 1..10 loop
    candidato := '';
    for posicao in 1..6 loop
      candidato := candidato ||
        substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;

    if not exists (select 1 from public.grupos g where g.codigo = candidato) then
      return candidato;
    end if;
  end loop;

  raise exception 'Nao foi possivel gerar um codigo de convite livre.';
end;
$$;

create or replace function public.criar_turma(p_nome text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_grupo public.grupos;
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para criar uma turma.';
  end if;

  -- Sem policy de INSERT nas duas tabelas; quem insere e esta funcao, que roda
  -- como dono do banco. As duas linhas nascem na mesma transacao, entao nao
  -- existe janela com turma criada e dono fora da lista de membros.
  insert into public.grupos (nome, codigo, dono_id)
  values (trim(p_nome), public.gerar_codigo_de_convite(), v_usuario)
  returning * into v_grupo;

  insert into public.membros (grupo_id, usuario_id)
  values (v_grupo.id, v_usuario);

  return v_grupo;
end;
$$;

create or replace function public.entrar_por_codigo(p_codigo text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_grupo public.grupos;
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para entrar em uma turma.';
  end if;

  select * into v_grupo
  from public.grupos g
  where g.codigo = upper(trim(p_codigo));

  if not found then
    raise exception 'Codigo de convite invalido.';
  end if;

  -- Entrar de novo na turma em que ja se esta e sucesso, nao erro: e o caso de
  -- quem recebeu o codigo duas vezes e tocou nos dois.
  insert into public.membros (grupo_id, usuario_id)
  values (v_grupo.id, v_usuario)
  on conflict do nothing;

  return v_grupo;
end;
$$;

create or replace function public.sair_da_turma(p_grupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para sair de uma turma.';
  end if;

  -- O dono nao sai: a turma ficaria sem quem responde por ela, e o codigo de
  -- convite seguiria valido para uma sala sem dono.
  if exists (
    select 1 from public.grupos g where g.id = p_grupo and g.dono_id = v_usuario
  ) then
    raise exception 'Quem criou a turma nao pode sair dela.';
  end if;

  delete from public.membros m
  where m.grupo_id = p_grupo
    and m.usuario_id = v_usuario;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- gerar_codigo_de_convite fica fora do alcance do cliente: quem chama e a
-- criar_turma, que roda como dono do banco e nao depende deste grant.
-- ---------------------------------------------------------------------------

revoke all on function public.gerar_codigo_de_convite() from public;

grant execute on function public.e_membro(uuid) to authenticated;
grant execute on function public.compartilha_turma(uuid) to authenticated;
grant execute on function public.criar_turma(text) to authenticated;
grant execute on function public.entrar_por_codigo(text) to authenticated;
grant execute on function public.sair_da_turma(uuid) to authenticated;

revoke all on function public.criar_turma(text) from anon;
revoke all on function public.entrar_por_codigo(text) from anon;
revoke all on function public.sair_da_turma(uuid) from anon;
