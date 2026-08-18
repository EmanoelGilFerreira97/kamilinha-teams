-- Desfaz o popular-turma-de-teste.sql.
--
-- Uma linha basta: `perfis` cai por cascata a partir de `auth.users`, e
-- `membros` e `notas` caem por cascata a partir de `perfis`.
--
-- Rode antes de publicar. Jogador de teste na turma estraga o sorteio da fase
-- 04 e polui o agregado de quem e de verdade.

delete from auth.users where email like '%@teste.kamilinha';

select count(*) as perfis_de_teste_restantes
from public.perfis p
join auth.users u on u.id = p.id
where u.email like '%@teste.kamilinha';
