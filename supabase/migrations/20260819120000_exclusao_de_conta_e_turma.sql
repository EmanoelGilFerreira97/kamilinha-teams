-- Fase 06 -- Exclusao de conta e de turma.
--
-- A Play exige que todo app com cadastro ofereca exclusao da conta dentro do
-- app, e que a exclusao leve os dados junto. Aqui isso e uma funcao so, porque
-- o caminho ingenuo destroi turma alheia.
--
-- ---------------------------------------------------------------------------
-- Por que a posse e transferida antes
-- ---------------------------------------------------------------------------
--
-- `grupos.dono_id` referencia `perfis` com `on delete cascade`, e `perfis.id`
-- referencia `auth.users` com `on delete cascade`. Entao apagar o usuario
-- derruba, em cascata: o perfil, as turmas de que ele e dono, os membros dessas
-- turmas e as notas de todo mundo dentro delas.
--
-- Uma pessoa saindo do app levaria junto a turma do grupo inteiro. Por isso a
-- funcao passa turma por turma antes: quem herda e o membro mais antigo, e a
-- turma so vai junto quando nao sobra mais ninguem nela.
--
-- ---------------------------------------------------------------------------
-- Sobre o delete em auth.users
-- ---------------------------------------------------------------------------
--
-- A tabela pertence a `supabase_auth_admin`; quem alcanca e o dono desta funcao
-- (`postgres`, que e quem roda o SQL Editor). Antes de acreditar que funcionou,
-- confira:
--
--   select has_table_privilege('postgres', 'auth.users', 'delete');
--
-- Se der `false`, o caminho passa a ser uma Edge Function com a service_role
-- chamando `auth.admin.deleteUser()`. O resto desta migracao continua valendo:
-- so a ultima linha de `excluir_conta()` mudaria de lugar.

-- ---------------------------------------------------------------------------
-- Excluir turma
-- ---------------------------------------------------------------------------

-- Passa por funcao pelo mesmo motivo de `sair_da_turma`: a recusa a quem nao e
-- dono precisa chegar como erro. Uma policy de delete que nao casasse com a
-- linha apagaria zero linhas, e zero linhas e sucesso para o PostgREST -- a tela
-- diria que excluiu.
create or replace function public.excluir_turma(p_grupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para excluir uma turma.';
  end if;

  if not exists (
    select 1 from public.grupos g where g.id = p_grupo and g.dono_id = v_usuario
  ) then
    raise exception 'Só quem criou a turma pode excluí-la.';
  end if;

  -- A cascata a partir de `grupos` leva os membros e as notas daquela turma. As
  -- notas de outras turmas nao sao tocadas: `notas` carrega `grupo_id`.
  delete from public.grupos g where g.id = p_grupo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Excluir conta
-- ---------------------------------------------------------------------------

create or replace function public.excluir_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_turma uuid;
  v_herdeiro uuid;
begin
  if v_usuario is null then
    raise exception 'Precisa estar logado para excluir a conta.';
  end if;

  for v_turma in
    select g.id from public.grupos g where g.dono_id = v_usuario
  loop
    -- O membro mais antigo herda. O desempate por usuario_id existe para duas
    -- pessoas que entraram no mesmo instante nao dependerem da ordem que o
    -- planejador escolher naquele dia.
    select m.usuario_id into v_herdeiro
    from public.membros m
    where m.grupo_id = v_turma
      and m.usuario_id <> v_usuario
    order by m.entrou_em, m.usuario_id
    limit 1;

    if v_herdeiro is null then
      -- Turma so com o dono: vai junto. Deixa-la orfa manteria um codigo de
      -- convite valido para uma sala de onde ninguem responde.
      delete from public.grupos g where g.id = v_turma;
    else
      update public.grupos g set dono_id = v_herdeiro where g.id = v_turma;
    end if;
  end loop;

  -- Daqui a cascata leva o perfil, as inscricoes nas turmas dos outros e as
  -- notas -- tanto as que esta pessoa deu quanto as que recebeu. As medias das
  -- turmas em que ela jogava mudam, e e isso mesmo: exclusao de conta que
  -- deixasse os votos para tras nao seria exclusao.
  delete from auth.users u where u.id = v_usuario;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- Privilegio de execucao vem de duas fontes -- o EXECUTE que o Postgres da a
-- PUBLIC em toda funcao nova, e o que o Supabase da a anon e authenticated por
-- `alter default privileges`. Derrubar as duas antes de conceder e o unico
-- idioma que nao falha calado. Ver 20260818170000_alcance_das_funcoes.sql.
-- ---------------------------------------------------------------------------

revoke all on function public.excluir_turma(uuid) from public, anon, authenticated;
revoke all on function public.excluir_conta() from public, anon, authenticated;

grant execute on function public.excluir_turma(uuid) to authenticated;
grant execute on function public.excluir_conta() to authenticated;
