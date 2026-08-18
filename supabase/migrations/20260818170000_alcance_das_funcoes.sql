-- Fase 02 -- Corrige o alcance de execucao das funcoes.
--
-- A migracao anterior tentou tirar as funcoes do alcance do cliente anonimo, e
-- nao conseguiu: privilegio de execucao vem de duas fontes, e cada revoke de la
-- derrubava so uma delas.
--
--   1. O Postgres concede EXECUTE a PUBLIC em toda funcao nova. Revogar de
--      `anon` nao mexe no que `anon` herda de PUBLIC.
--   2. O Supabase concede EXECUTE a `anon` e `authenticated` por
--      `alter default privileges`. Revogar de PUBLIC nao mexe nesse grant
--      explicito.
--
-- O resultado media foi gerar_codigo_de_convite respondendo a um curl com a
-- anon key, e criar_turma/entrar_por_codigo/sair_da_turma sendo executadas de
-- fato -- barradas so pelo guarda `auth.uid() is null` de dentro delas.
--
-- O idioma correto, e o que vale repetir na fase 03: revogar das duas fontes
-- primeiro, conceder a quem deve ter depois.

-- Interna. Quem chama e criar_turma, que roda security definer como dona do
-- banco e portanto nao depende de grant nenhum para alcanca-la.
revoke all on function public.gerar_codigo_de_convite() from public, anon, authenticated;

-- Apoio de policy: sao avaliadas com o papel de quem consulta, entao
-- `authenticated` precisa executar. `anon` nunca chega nelas, porque as policies
-- que as invocam sao todas `to authenticated`.
revoke all on function public.e_membro(uuid) from public, anon;
revoke all on function public.compartilha_turma(uuid) from public, anon;

revoke all on function public.criar_turma(text) from public, anon;
revoke all on function public.entrar_por_codigo(text) from public, anon;
revoke all on function public.sair_da_turma(uuid) from public, anon;

grant execute on function public.e_membro(uuid) to authenticated;
grant execute on function public.compartilha_turma(uuid) to authenticated;
grant execute on function public.criar_turma(text) to authenticated;
grant execute on function public.entrar_por_codigo(text) to authenticated;
grant execute on function public.sair_da_turma(uuid) to authenticated;
