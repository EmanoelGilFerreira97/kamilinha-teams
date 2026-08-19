# Kamilinha Teams — decisões de projeto

App de sorteio de quartetos de vôlei. Os jogadores se avaliam entre si de forma
anônima, e as notas alimentam o sorteio de times equilibrados.

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| App | Expo / React Native / TypeScript | Build iOS na nuvem a partir do Windows, sem Mac |
| Rotas | expo-router, raiz em `src/app` | Padrão do template SDK 57 |
| Backend | Supabase (Postgres + RLS) | RLS expressa "grava sim, lê nunca" — base do anonimato |
| Build | EAS Build | `eas.json` com perfis development / preview / production |

Alvo: **Android primeiro**. iOS fica para quando valer os US$ 99/ano da Apple.
O código já sai pronto para os dois.

## Decisões fechadas

- **Escala 0–100**, estilo carta do FIFA.
- **Três atributos**: Ataque, Defesa, Levantada. O overall é a média dos três.
- **Turmas com código de convite.** Toda tabela e toda policy carregam `grupo_id`.
- **O jogador não vê a própria nota.** Filtrado no SQL, não na tela.
- **Sorteio só por força**, sem posição. Dá para derivar da nota de Levantada
  depois, sem migração.
- Package Android: `com.emanoelgilferreira.kamilinhateams` (permanente).
- **Código de convite de 6 caracteres**, no alfabeto sem I, L, O, 0 e 1: o
  código é ditado em quadra e transcrito no celular do outro. São 31⁶ ≈ 887
  milhões de combinações.
- **Só se entra em turma por código.** `membros` não tem policy de INSERT.
- **`perfis` espelha `auth.users`.** O cliente não lê `auth.users`, e o
  PostgREST só monta join sobre chave estrangeira que aponte para `public`.
- **Escrever em `grupos` e `membros` passa por função `security definer`.**
  Criar, entrar e sair são RPC; as tabelas só carregam policy de leitura. É o
  que garante que toda escrita atravesse uma regra escrita uma vez só.
- **Migrações versionadas em `supabase/migrations/`, aplicadas à mão** no SQL
  Editor do painel: não há Supabase CLI no ambiente. Ver `supabase/README.md`.
- **O sorteio roda no banco, não no aparelho.** O documento previa o contrário,
  mas `notas_da_turma()` não devolve a nota de quem pergunta, e o snake draft
  precisa dela para escalar essa pessoa. `sortear_times()` usa o overall de todo
  mundo e devolve só a composição dos times. O "custo de servidor" que a
  previsão original queria evitar não se materializa: é uma função, não um
  processo.
- **A fórmula bayesiana vive em `overall_do_grupo()`,** que não filtra quem
  pergunta e por isso **não tem grant para ninguém**. É a única função do
  sistema que devolveria a própria nota. Quem a chama são `notas_da_turma()` e
  `sortear_times()`, que rodam como donas do banco. Conceder `execute` nela a
  `authenticated` entrega a nota de cada um para o próprio.
- **Quartetos, e o último time joga curto.** São `ceil(n/4)` times: os primeiros
  levam quatro e o último leva o que sobrar. Com n ≡ 1 (mod 4) — 5, 9, 13 — o
  último fica com uma pessoa só, e a tela avisa antes de sortear em vez de
  produzir isso calado.
- **O sorteio revela o seu rank por aproximação.** O draft ordena por overall, e
  você já enxerga o overall dos outros — dá para simular o sorteio com o seu
  valor como incógnita e cercar onde caiu. Não fere o anonimato dos avaliadores,
  que é a regra dura; fere por aproximação a regra branda de não ver a própria
  nota. Mitigado listando cada time em ordem alfabética, nunca de escolha, e não
  devolvendo nota nem soma de time — soma de time com três companheiros
  conhecidos resolveria o seu número exatamente. Limite aceito, como o do
  conluio.
- **Texto que a pessoa lê leva acento; identificador e comentário, não.** Isso
  inclui as mensagens de `raise exception` das funções: elas sobem pelo
  PostgREST e o cliente mostra `error.message` como está, então são copy de
  produto, não log.

## O anonimato — não afrouxar sem pensar

O modelo inteiro depende de o Postgres recusar a leitura, não de a tela não
exibir. Qualquer pessoa com a anon key consulta a API REST direto.

A tabela é `notas`, com `avaliador_id` e `avaliado_id` — e não `ratings` /
`rater_id` / `rated_id`, como este documento dizia antes de a fase 03 existir.
Português, como o resto do esquema.

1. RLS ligada em `notas`, e **nenhuma policy**. Nenhuma mesmo: nem de SELECT,
   nem de INSERT, nem de UPDATE. A tabela fica inalcançável pelo cliente, e as
   três funções abaixo são a única porta. Confere-se com uma consulta só —
   `pg_policies` não pode ter uma linha sequer para `notas`.
2. **`avaliar()`** é a única escrita. Checa que o avaliador é quem está logado,
   que os dois são membros da turma, e que ninguém se autoavalia.
3. **`minhas_notas()`** é a única leitura de linha crua, restrita a
   `avaliador_id = auth.uid()`. Reler o próprio voto não revela voto de mais
   ninguém, e é o que faz a avaliação ser correção em vez de chute novo a cada
   rodada.
4. **`notas_da_turma()`** é o agregado, e:
   - **exige que quem chama seja membro.** A função roda `security definer`,
     então precisa fazer ela mesma o que a RLS faria — sem essa linha, qualquer
     pessoa logada leria o agregado de qualquer turma só passando o id;
   - exige **piso de 5 avaliadores** — 5 e não 3 por causa da escala larga: em
     0–100 um voto é quase uma impressão digital, e o trio de atributos
     identifica o avaliador melhor ainda;
   - devolve **média bayesiana** `(5·m + soma) / (5 + n)`, nunca a média crua,
     para o número exibido não ser aritmética reversível dos votos;
   - **abaixo do piso devolve o prior puro (50)**, e não a conta. Número fixo
     não carrega informação de voto nenhum, e ainda entrega valor usável para o
     sorteio. A tela mostra `–` nesse caso; o 50 é para o algoritmo;
   - **nunca devolve a contagem** de votos, só o booleano `confiavel` —
     contagem exata alimenta o ataque por diferença entre dois momentos;
   - filtra `avaliado_id <> auth.uid()` para a própria nota não sair do banco.

### Por que nenhuma policy, e não as de INSERT e UPDATE

Este documento pedia policy de INSERT e de UPDATE, e nenhuma de SELECT. Esse
desenho não fecha, e a tabela 297 do `CREATE POLICY` diz por quê: em
`insert ... on conflict do update` a policy de **SELECT** é aplicada para checar
a linha existente, e um `update` comum precisa de um `where` para achar a linha
— o que exige direito de leitura e faz valer as policies de SELECT junto com as
de UPDATE.

Sem policy de SELECT, então, a policy de UPDATE nunca dispararia: o update
casaria com zero linhas. E casar com zero linhas **não dá erro** — é a mesma
armadilha que fez `sair_da_turma` virar função na fase 02. Ninguém conseguiria
corrigir uma nota, e a tela diria que corrigiu.

A saída aperta em vez de afrouxar. Zero policy é invariante mais forte que
"nenhuma de SELECT", e mais fácil de conferir: em vez de ler um predicado, se
confere uma ausência.

Limite conhecido e aceito: em turma pequena, conluio deliberado quebra o
anonimato. O objetivo é inviabilizar a desanonimização casual.

## Fases

- **00 — Ambiente.** Concluída.
- **01 — Login Google.** Concluída. OAuth por navegador via Supabase.
- **02 — Turmas e perfis.** Concluída. Esquema `perfis` / `grupos` / `membros`,
  RLS, código de convite, lista da turma e saída da turma. Fluxo testado no
  aparelho, e a RLS testada de fora com a anon key: leitura, contagem por
  agregado, escrita direta e execução de função, todas barradas.
- **03 — Notas e anonimato.** Concluída. `notas` com RLS ligada e nenhuma
  policy; `avaliar()`, `minhas_notas()` e o agregado com piso de 5 e média
  bayesiana. Verificado no aparelho com seis jogadores semeados: a escada de
  notas bateu com a fórmula, e a correção de nota sobreviveu à reabertura. De
  fora, com a anon key: leitura, contagem por agregado, escrita direta e as
  quatro funções, todas barradas.
- **04 — Sorteio.** Código pronto. Falta rodar `20260818210000_sorteio.sql` no
  painel e testar no aparelho. Snake draft pelo overall, com quem veio hoje
  escolhido na tela, embaralhando empates para os times variarem a cada rodada.
- **05 — Acabamento e publicação.**

## Armadilhas já encontradas

- **`makeRedirectUri()` sem argumentos muda conforme o ambiente**: devolve o
  scheme do app só em build standalone; em development build devolve
  `exp://127.0.0.1:8081/--/`. Usar sempre `{ native: 'kamilinhateams://auth' }`.
- **O deep link do OAuth chega em paralelo** com o `openAuthSessionAsync`. Por
  isso existe a rota `src/app/auth.tsx`. Ela não pode repetir a troca do código
  por sessão: o código do PKCE é de uso único.
- **Ferramenta de CLI não é dependência do app.** `eas-cli` no projeto arrastou
  um typescript conflitante e dessincronizou o lockfile; o EAS instala com
  `npm ci`, que recusa lockfile fora de sincronia. Rodar `npm ci --dry-run`
  antes de commitar mudança de dependência.
  Exceção: `@expo/ngrok` **precisa** ser local, porque o Expo o carrega por
  `require` a partir do projeto.
- **EAS respeita o `.gitignore`**, então `.env.local` não sobe. As variáveis
  `EXPO_PUBLIC_` estão duplicadas nos perfis do `eas.json`. Trocar de projeto
  Supabase exige mudar nos dois lugares.

- **Policy que consulta a própria tabela entra em recursão infinita.** A leitura
  de `membros` precisa saber se você é membro, o que exigiria ler `membros`. Por
  isso a checagem vive em `e_membro()`, `security definer`, que roda por fora da
  RLS e corta o ciclo. Toda policy nova que dependa de pertencimento passa por
  ela.
- **`security definer` sem `set search_path = ''` é buraco de segurança**, e o
  Advisors do painel acusa. A função roda como dono do banco; sem o search_path
  fixo, um schema no caminho de busca pode sequestrar a resolução de nome.
- **Delete que não casa com nenhuma linha é sucesso para o PostgREST.** Uma
  policy que barrasse o dono de sair da turma não geraria erro nenhum — a tela
  diria que saiu. Por isso sair da turma é RPC, que recusa com mensagem.
- **`.returns<T>()` do supabase-js está deprecado** em favor de
  `.overrideTypes<T, { merge: false }>()`. E função que devolve *uma* linha
  precisa de `.maybeSingle()` antes: o PostgREST responde com o objeto direto, e
  sem isso o TypeScript acusa conversão de lista para objeto.
- **Os tipos de rota só existem depois que o dev server roda.**
  `.expo/types/router.d.ts` é gerado pelo `npx expo start` e está no
  `.gitignore`. Em árvore recém-clonada, `npx tsc --noEmit` acusa rota
  inexistente até subir o servidor uma vez.
- **`useLocalSearchParams` com a string da rota devolve `string | string[]`**,
  porque o codegen não distingue `[id]` de `[...id]`. Para segmento simples, o
  formato de params — `useLocalSearchParams<{ id: string }>()` — é o que
  descreve a rota de verdade.
- **Módulo nativo novo exige novo development build.** O APK instalado só tem os
  módulos que existiam quando ele foi gerado. Por isso o convite usa o `Share`
  do React Native, que é core, em vez de `expo-clipboard`: a fase 02 inteira
  roda no build que já está no celular.

- **Privilégio de execução de função vem de duas fontes, e revogar uma não
  basta.** O Postgres concede `EXECUTE` a `PUBLIC` em toda função nova; o
  Supabase concede a `anon` e `authenticated` por `alter default privileges`.
  Então `revoke ... from anon` deixa passar o que vem de `PUBLIC`, e
  `revoke ... from public` deixa passar o grant explícito. Foi assim que
  `gerar_codigo_de_convite` respondeu a um `curl` com a anon key, mesmo com o
  revoke escrito. O idioma certo é derrubar as duas e conceder depois:

  ```sql
  revoke all on function public.f() from public, anon, authenticated;
  grant execute on function public.f() to authenticated;
  ```

  **Isso vale dobrado na fase 03.** É o mesmo `revoke` que vai trancar as
  funções de agregado das notas, e lá a falha silenciosa não é um incômodo — é o
  modelo inteiro. Depois de escrever qualquer `grant`, testar de fora com a anon
  key antes de acreditar.
- **A anon key tem grant de INSERT nas tabelas**, por padrão do Supabase. O que
  barra a escrita anônima é só a RLS, que devolve `42501`. Não é margem de
  segurança sobrando: é a RLS sendo, literalmente, a única fronteira.

- **Policy de UPDATE sem policy de SELECT é policy morta.** Todo `update` vindo
  do cliente precisa de um `where` para achar a linha, e isso faz valer as
  policies de SELECT junto com as de UPDATE. Sem nenhuma de SELECT, o update
  casa com zero linhas — calado, porque zero linhas é sucesso. O mesmo vale para
  `insert ... on conflict do update`. Ver a seção do anonimato.
- **Sem os tipos gerados do banco, o postgrest-js chuta o retorno das RPC.** Ele
  não conhece o esquema, então erra para os dois lados: função que devolve uma
  linha precisa de `.maybeSingle()` antes do `overrideTypes`, e função que
  devolve conjunto reclama de "cannot cast single object to array". Enquanto não
  houver `supabase gen types`, asserção explícita na borda é mais honesta que
  brigar com a inferência — o contrato de verdade está na migração.

## Ambiente

Windows, sem Mac. Rede classificada como `Public`, então o firewall bloqueia o
celular alcançando a porta 8081 — desenvolver com
`npx expo start --dev-client --tunnel`.
