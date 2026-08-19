-- Popula uma turma com seis jogadores de teste que ja se avaliaram entre si.
--
-- Serve para ver o agregado funcionando acima do piso de 5 avaliadores sem
-- precisar de seis pessoas de verdade. NAO e migracao: nao rode isto em
-- producao, e rode `limpar-turma-de-teste.sql` quando terminar.
--
-- ---------------------------------------------------------------------------
-- ANTES DE RODAR
-- ---------------------------------------------------------------------------
--
-- 1. No painel, em Authentication > Users > Add user, crie os onze e-mails
--    abaixo (senha qualquer; estas contas nunca fazem login). Criar por ali e
--    nao por SQL de proposito: as colunas obrigatorias de `auth.users` mudam
--    entre versoes do GoTrue, e a API do painel nao quebra com isso.
--
--      ana@teste.kamilinha      fabio@teste.kamilinha     joao@teste.kamilinha
--      bruno@teste.kamilinha    gabi@teste.kamilinha      lucas@teste.kamilinha
--      carla@teste.kamilinha    heitor@teste.kamilinha
--      diego@teste.kamilinha    ines@teste.kamilinha
--      elisa@teste.kamilinha
--
--    Os onze existem para dar 12 jogadores com voce, que sao tres quartetos.
--    Criar menos funciona: o script so alcanca quem existe. Com k semeados,
--    cada um recebe k-1 votos, e a media bayesiana sai (250 + (k-1)*v)/(4+k).
--
--    O gatilho `ao_criar_usuario` cria o perfil de cada um sozinho.
--
-- 2. Troque o codigo da turma nas TRES ocorrencias de 'TROQUE' abaixo pelo
--    codigo de convite da sua turma.
--
-- ---------------------------------------------------------------------------

-- Nome bonito no lugar do e-mail, que e o que o gatilho usa quando nao ha
-- full_name nos metadados.
update public.perfis p
set nome = dados.nome
from (values
  ('ana@teste.kamilinha',    'Ana Teste'),
  ('bruno@teste.kamilinha',  'Bruno Teste'),
  ('carla@teste.kamilinha',  'Carla Teste'),
  ('diego@teste.kamilinha',  'Diego Teste'),
  ('elisa@teste.kamilinha',  'Elisa Teste'),
  ('fabio@teste.kamilinha',  'Fabio Teste'),
  ('gabi@teste.kamilinha',   'Gabi Teste'),
  ('heitor@teste.kamilinha', 'Heitor Teste'),
  ('ines@teste.kamilinha',   'Ines Teste'),
  ('joao@teste.kamilinha',   'Joao Teste'),
  ('lucas@teste.kamilinha',  'Lucas Teste')
) as dados(email, nome)
join auth.users u on u.email = dados.email
where p.id = u.id;

-- Entra na turma. Sem passar por entrar_por_codigo() porque aqui rodamos como
-- dono do banco e nao ha sessao -- auth.uid() e nulo no SQL Editor.
insert into public.membros (grupo_id, usuario_id)
select g.id, u.id
from public.grupos g
cross join auth.users u
where g.codigo = 'TROQUE'
  and u.email like '%@teste.kamilinha'
on conflict do nothing;

-- Cada um avalia todos os outros cinco com a "habilidade real" do avaliado.
-- Voto identico de proposito: deixa a conta bayesiana previsivel, entao da
-- para conferir o numero da tela contra a formula.
insert into public.notas (grupo_id, avaliador_id, avaliado_id, ataque, defesa, levantada)
select g.id, avaliador.id, avaliado.id, alvo.ataque, alvo.defesa, alvo.levantada
from public.grupos g
cross join (values
  ('ana@teste.kamilinha',    90, 80, 70),
  ('gabi@teste.kamilinha',   85, 75, 65),
  ('bruno@teste.kamilinha',  80, 70, 60),
  ('heitor@teste.kamilinha', 75, 65, 55),
  ('carla@teste.kamilinha',  70, 60, 50),
  ('ines@teste.kamilinha',   65, 55, 45),
  ('diego@teste.kamilinha',  60, 50, 40),
  ('joao@teste.kamilinha',   55, 45, 35),
  ('elisa@teste.kamilinha',  50, 40, 30),
  ('lucas@teste.kamilinha',  45, 35, 25),
  ('fabio@teste.kamilinha',  40, 30, 20)
) as alvo(email, ataque, defesa, levantada)
join auth.users avaliado on avaliado.email = alvo.email
join auth.users avaliador
  on avaliador.email like '%@teste.kamilinha'
  and avaliador.id <> avaliado.id
where g.codigo = 'TROQUE'
on conflict (grupo_id, avaliador_id, avaliado_id) do update
  set ataque = excluded.ataque,
      defesa = excluded.defesa,
      levantada = excluded.levantada,
      atualizado_em = now();

-- Conferencia. Seis linhas, cinco avaliadores cada. Zero linha aqui significa
-- que o codigo da turma nao foi trocado.
select p.nome, count(*) as avaliadores
from public.notas n
join public.perfis p on p.id = n.avaliado_id
join public.grupos g on g.id = n.grupo_id
where g.codigo = 'TROQUE'
group by p.nome
order by p.nome;
