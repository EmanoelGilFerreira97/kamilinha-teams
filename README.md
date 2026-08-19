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

## Banco

As migrações são aplicadas à mão pelo SQL Editor do painel: não há Supabase CLI
no ambiente. A ordem e as instruções estão em
[supabase/README.md](supabase/README.md).

Lá também ficam os scripts de popular e limpar jogadores de teste, que existem
porque o piso de cinco avaliadores torna as notas impossíveis de exercitar com
uma conta só.

## Convenções

Em [AGENTS.md](AGENTS.md).
