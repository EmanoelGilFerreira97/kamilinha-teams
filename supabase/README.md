# Migracoes

Nao ha Supabase CLI neste ambiente, entao as migracoes sao aplicadas a mao:
abra o **SQL Editor** do projeto, cole o conteudo do arquivo e rode. Em ordem
crescente de nome, uma vez cada.

Todo arquivo aqui e escrito para ser idempotente (`if not exists`,
`create or replace`, `drop policy if exists`), entao rodar de novo e seguro
quando houver duvida se ja rodou.

O nome usa o padrao `<timestamp>_<assunto>.sql` do proprio CLI, para o dia em
que o projeto adotar `supabase db push` nao precisar renomear nada.

| Arquivo | Fase | O que faz |
|---|---|---|
| `20260818120000_turmas_e_perfis.sql` | 02 | `perfis`, `grupos`, `membros`, RLS e as RPC de criar, entrar e sair |
| `20260818170000_alcance_das_funcoes.sql` | 02 | Corrige os `revoke` do arquivo acima, que nao pegaram |
| `20260818180000_mensagens_acentuadas.sql` | 02 | Acentua as mensagens das RPC, que aparecem na tela |
| `20260818200000_notas_e_anonimato.sql` | 03 | `notas` sem policy nenhuma, `avaliar()`, `minhas_notas()` e o agregado |

## Conferindo que a RLS pegou

Depois de rodar, o **Advisors > Security** do painel nao pode listar tabela sem
RLS em `public`. E o teste que importa e o de fora: com a anon key na mao, um
`GET /rest/v1/grupos` sem token de sessao tem de voltar lista vazia, nunca as
turmas de alguem.

## Um aviso sobre o primeiro arquivo

A secao `-- Permissoes` de `20260818120000_turmas_e_perfis.sql` afirma que
`gerar_codigo_de_convite` fica fora do alcance do cliente. **Nao fica** — quem
conserta isso e a migracao seguinte. O arquivo original ficou intocado de
proposito: migracao aplicada e historico, e edita-la depois faria o
`supabase db push` de um dia pular a correcao por ja conhecer aquele nome.

O motivo de o revoke ter falhado, e o idioma certo, estao comentados na
`20260818170000_alcance_das_funcoes.sql`. Vale ler antes de escrever qualquer
`grant` na fase 03.

## Jogadores de teste

`testes/` nao e migracao. Sao dois scripts para popular uma turma com seis
jogadores ficticios que ja se avaliaram entre si, e assim ver o agregado acima
do piso de 5 avaliadores sem precisar de seis pessoas de verdade.

- `popular-turma-de-teste.sql` -- leia o cabecalho: exige criar seis usuarios
  pelo painel antes, e trocar o codigo da turma em tres lugares.
- `limpar-turma-de-teste.sql` -- desfaz tudo por cascata. Rodar antes de
  publicar: jogador de teste polui o agregado e estraga o sorteio.
