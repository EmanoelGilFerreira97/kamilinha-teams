# Kamilinha Teams

App de vôlei: turmas, avaliação anônima entre quem joga e sorteio de quartetos
equilibrados toda semana. Expo + React Native na frente, Supabase (Postgres) atrás.

O anonimato das notas é o requisito central do produto, e ele vive nas policies
de RLS do Postgres — não na interface. Antes de mexer em qualquer coisa, leia
**[docs/decisoes.md](docs/decisoes.md)**: ele traz a stack, as decisões já
fechadas, o modelo de anonimato e as armadilhas que já custaram depuração.

## Configuração

1. Instale as dependências com o mesmo comando que o EAS usa:

   ```bash
   npm ci
   ```

2. Copie `.env.example` para `.env.local` e preencha os dois valores:

   ```bash
   cp .env.example .env.local
   ```

   **Sem esse arquivo o app não sobe**: `src/lib/supabase.ts` lança já no
   import. São a URL e a *anon key* do seu projeto Supabase. A `service_role`
   nunca entra aqui — ela ignora toda a RLS.

3. Aplique as migrações no seu projeto Supabase, em ordem crescente de nome.
   O passo a passo está em **[supabase/README.md](supabase/README.md)**.

4. Suba o servidor de desenvolvimento:

   ```bash
   npx expo start
   ```

## Rodar no aparelho

O app usa módulos nativos (`@expo/ui`, `expo-glass-effect`, `expo-symbols`,
`expo-dev-client`), então **o Expo Go não serve** — é preciso um development
build instalado no aparelho:

```bash
npx eas-cli@latest build --profile development --platform android
```

O `eas-cli` roda por `npx` de propósito: como dependência do projeto ele arrasta
um TypeScript conflitante e dessincroniza o lockfile. Está registrado nas
armadilhas do `docs/decisoes.md`.

Vale lembrar que **módulo nativo novo exige build novo**. O APK instalado só tem
os módulos que existiam quando ele foi gerado; adicionar um pacote com código
nativo e rodar `npx expo start` não basta.

## Antes de commitar

```bash
npx tsc --noEmit
```

E, ao mexer em dependência, a checagem que o EAS faz:

```bash
npm ci --dry-run
```

**O `tsc` precisa que o servidor tenha rodado pelo menos uma vez.** Os tipos
gerados — `expo-env.d.ts` e `.expo/types/` — nascem do `npx expo start` e estão
no `.gitignore`. Em árvore recém-clonada, antes disso, o `tsc` acusa erros que
não existem: rota inexistente nos `router.push`, e `TS2882` no import de
`src/global.css` (a declaração de módulo `*.css` vem do `expo/types`, alcançado
só pelo `expo-env.d.ts`).

## Estrutura

| Caminho | O que tem |
|---|---|
| `src/app/` | Rotas, e só rotas — layout e telas do expo-router |
| `src/lib/` | Conversa com o Supabase: auth, turmas, notas, sorteio |
| `src/components/` | Componentes de interface reaproveitados entre telas |
| `src/contexts/` | Sessão de autenticação |
| `src/hooks/` | Hooks de tema e esquema de cores |
| `src/constants/` | Paleta, espaçamentos e tipografia |
| `supabase/migrations/` | O esquema, a RLS e as funções — aplicadas à mão |
| `docs/decisoes.md` | Stack, decisões fechadas, fases e armadilhas |

Rotas ficam em `src/app`; todo o resto do código, em `src/`.

## Convenções

Estão em **[AGENTS.md](AGENTS.md)**, em resumo: código e comentários em
português, sem acento em identificador; comentário explica *por que*, não o que
o código já diz.
