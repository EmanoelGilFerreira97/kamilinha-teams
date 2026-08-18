-- Fase 02 -- Acentua as mensagens que chegam na tela.
--
-- As excecoes destas funcoes nao ficam no log: elas sobem pelo PostgREST, o
-- cliente le `error.message` e mostra o texto como esta. Sao copy de produto, e
-- por isso levam acento, ao contrario dos identificadores e dos comentarios.
--
-- Tres funcoes, e nao quatro: as mensagens de criar_turma nao tem palavra
-- acentuada.
--
-- `create or replace` preserva dono e privilegios da funcao. Mesmo assim os
-- revoke e grant estao repetidos no fim: depois de a fase 02 descobrir que um
-- revoke pode falhar calado, afirmar de novo custa tres linhas e dispensa
-- confiar na leitura que fiz da documentacao.

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

  raise exception 'Não foi possível gerar um código de convite livre.';
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
    raise exception 'Código de convite inválido.';
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
    raise exception 'Quem criou a turma não pode sair dela.';
  end if;

  delete from public.membros m
  where m.grupo_id = p_grupo
    and m.usuario_id = v_usuario;
end;
$$;

revoke all on function public.gerar_codigo_de_convite() from public, anon, authenticated;

revoke all on function public.entrar_por_codigo(text) from public, anon;
revoke all on function public.sair_da_turma(uuid) from public, anon;

grant execute on function public.entrar_por_codigo(text) to authenticated;
grant execute on function public.sair_da_turma(uuid) to authenticated;
