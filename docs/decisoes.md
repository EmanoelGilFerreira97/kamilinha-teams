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

## O anonimato — não afrouxar sem pensar

O modelo inteiro depende de o Postgres recusar a leitura, não de a tela não
exibir. Qualquer pessoa com a anon key consulta a API REST direto.

1. RLS ligada em `ratings`, com policies apenas de INSERT e UPDATE, ambas
   restritas a `rater_id = auth.uid()` e a membros do grupo.
2. **Nenhuma policy de SELECT.** Essa ausência é o anonimato.
3. Agregados só por função `security definer`, que:
   - exige **piso de 5 avaliadores** — 5 e não 3 por causa da escala larga:
     em 0–100 um voto é quase uma impressão digital, e o trio de atributos
     identifica o avaliador melhor ainda;
   - devolve **média bayesiana** `(5·m + soma) / (5 + n)`, nunca a média crua,
     para o número exibido não ser aritmética reversível dos votos;
   - **nunca devolve a contagem** de votos, só um booleano `confiavel` —
     contagem exata alimenta o ataque por diferença entre dois momentos;
   - filtra `rated_id <> auth.uid()` para a própria nota não sair do banco.

Limite conhecido e aceito: em turma pequena, conluio deliberado quebra o
anonimato. O objetivo é inviabilizar a desanonimização casual.

## Fases

- **00 — Ambiente.** Concluída.
- **01 — Login Google.** Concluída. OAuth por navegador via Supabase.
- **02 — Turmas e perfis.** Esquema `grupos` / `membros` / perfis, RLS, código
  de convite, lista da turma.
- **03 — Notas e anonimato.** O esquema acima. Fase mais sensível do projeto.
- **04 — Sorteio.** Snake draft pelo overall, embaralhando empates para os times
  variarem a cada rodada. Roda no aparelho, sem custo de servidor.
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

## Ambiente

Windows, sem Mac. Rede classificada como `Public`, então o firewall bloqueia o
celular alcançando a porta 8081 — desenvolver com
`npx expo start --dev-client --tunnel`.
