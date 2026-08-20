# Kamilinha Teams

App de sorteio de quartetos de vôlei. Os jogadores se avaliam entre si de forma
anônima, e as notas alimentam o sorteio de times equilibrados.

- Entra com a conta Google.
- Cria uma turma, ou entra em uma com o código de convite.
- Avalia os outros em Ataque, Defesa e Levantada, de 0 a 100.
- Marca quem veio hoje e sorteia os quartetos.

**O anonimato das avaliações é o requisito central do produto**, e ele vive nas
policies de RLS do Postgres — não na interface. Quem for mexer nisso leia
[docs/decisoes.md](docs/decisoes.md) antes.

## Stack

| Camada | Escolha |
|---|---|
| App | Expo SDK 57 / React Native / TypeScript |
| Rotas | expo-router, raiz em `src/app` |
| Backend | Supabase (Postgres + RLS) |
| Build | EAS Build |

Alvo é Android. O código já sai pronto para iOS, que fica para quando valer os
US$ 99/ano da Apple.

## Rodando

Precisa de Node 22.13 ou mais novo, e de um projeto Supabase com as migrações de
[supabase/migrations/](supabase/migrations/) aplicadas.

```bash
npm install
cp .env.example .env.local   # e preencha os dois valores
npx expo start --dev-client --tunnel
```

O `--dev-client` exige um development build instalado no aparelho: o Expo Go não
serve, porque o projeto usa módulos nativos.

O `--tunnel` é necessário quando a rede está classificada como `Public` no
Windows — o firewall bloqueia o celular alcançando a porta 8081.

## Build

```bash
npx eas-cli build --profile development --platform android   # para desenvolver
npx eas-cli build --profile preview --platform android       # APK para distribuir
```

O `eas-cli` roda por `npx` de propósito. Como dependência do projeto ele arrasta
um TypeScript conflitante e dessincroniza o lockfile — que é justamente o que o
EAS instala, com `npm ci`.

As variáveis `EXPO_PUBLIC_` estão duplicadas: em `.env.local` para o
desenvolvimento, e nos três perfis do `eas.json` para os builds, porque o EAS
respeita o `.gitignore` e `.env.local` não sobe. **Trocar de projeto Supabase
exige mudar nos dois lugares.**

## Ícones

```bash
npm run icones
```

Gera todos os PNGs de `assets/images/` a partir da paleta da marca, sem
dependência externa — PNG é um formato simples e o Node já traz o `zlib`. Ver
[scripts/gerar-icones.js](scripts/gerar-icones.js).

```bash
npm run artes
```

Gera as duas peças que a ficha da Play exige — o ícone de 512×512 e o gráfico de
destaque de 1024×500 — em `assets/loja/`, que fica fora do bundle do app. Mesmo
encoder, mesmo recorte do logo.

```bash
npm run contraste
```

Confere a razão de contraste da WCAG entre os pares de cor que as telas usam,
nos dois temas. Rodar depois de mexer na paleta: contraste ruim compila limpo
e só aparece na tela.

## Loja

A ficha da Play, o formulário de Data Safety e o que mais o console pergunta
estão respondidos em [docs/play-store.md](docs/play-store.md), com os textos
prontos para copiar.

As páginas públicas que a Play exige — política de privacidade e instruções de
exclusão de conta — são HTML estático em `docs/`, servido pelo GitHub Pages a
partir da `main`:

- <https://emanoelgilferreira97.github.io/kamilinha-teams/>
- <https://emanoelgilferreira97.github.io/kamilinha-teams/privacidade.html>
- <https://emanoelgilferreira97.github.io/kamilinha-teams/excluir-conta.html>

**O que essas páginas dizem tem de continuar batendo com o que o código faz.**
Mudou o que o app guarda, mudam as três — e muda o Data Safety junto.

## Banco

As migrações são aplicadas à mão pelo SQL Editor do painel: não há Supabase CLI
no ambiente. A ordem e as instruções estão em
[supabase/README.md](supabase/README.md).

Lá também ficam os scripts de popular e limpar jogadores de teste, que existem
porque o piso de cinco avaliadores torna as notas impossíveis de exercitar com
uma conta só.

## Antes de commitar

```bash
npx tsc --noEmit
```

Ao mexer em dependência, a checagem que o EAS faz:

```bash
npm ci --dry-run
```

Ao mexer na paleta:

```bash
npm run contraste
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
| `src/contexts/` | Sessão de autenticação e tema |
| `src/hooks/` | Hooks de tema e esquema de cores |
| `src/constants/` | Paleta, espaçamentos e tipografia |
| `scripts/` | Geração de ícones e artes de loja, leitura e escrita de PNG, checagem de contraste |
| `assets/loja/` | Ícone e gráfico de destaque da ficha da Play — fora do bundle |
| `supabase/migrations/` | O esquema, a RLS e as funções — aplicadas à mão |
| `supabase/testes/` | Popular e limpar jogadores de teste |
| `docs/decisoes.md` | Stack, decisões fechadas, fases e armadilhas |
| `docs/play-store.md` | Respostas do Play Console e textos da ficha |
| `docs/*.html` | Páginas públicas do GitHub Pages: privacidade e exclusão de conta |

Rotas ficam em `src/app`; todo o resto do código, em `src/`.

## Convenções

Em [AGENTS.md](AGENTS.md).
