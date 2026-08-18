# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Isso vale também para APIs que parecem óbvias: `makeRedirectUri()` já custou um
ciclo de depuração por mudar de comportamento entre development build e build
standalone.

# Kamilinha Teams

Leia **[docs/decisoes.md](docs/decisoes.md)** antes de começar qualquer fase.
Ele traz a stack, as decisões já fechadas, o modelo de anonimato das notas, a
lista de fases e as armadilhas já encontradas.

O anonimato das notas é o requisito central do produto, e ele vive nas policies
de RLS do Postgres — não na interface. Não afrouxe nada dessa seção sem que a
mudança seja pedida explicitamente.

## Convenções

- Código e comentários em português, sem acento em identificador.
- Comentário explica **por que**, não o que o código já diz.
- Rotas em `src/app`, resto do código em `src/`.
- Rodar `npx tsc --noEmit` antes de commitar.
- Rodar `npm ci --dry-run` ao mexer em dependência: é a checagem que o EAS faz.
