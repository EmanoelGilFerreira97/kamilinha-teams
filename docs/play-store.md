# Publicação na Play Store — fase 06

O que preencher no Play Console, com os textos prontos para copiar. Guardado no
repositório porque a próxima versão vai precisar responder às mesmas perguntas,
e porque resposta de Data Safety que não bate com o código é motivo de recusa.

**Pacote:** `com.emanoelgilferreira.kamilinhateams` (permanente — não muda mais)

---

## 1. Conta de desenvolvedor

- US$ 25, pagamento único, em <https://play.google.com/console/signup>.
- Conta **pessoal**: exige verificação de identidade com documento. Pode levar
  de horas a alguns dias, e nada anda antes disso. É o primeiro passo por ser o
  mais lento.
- Conta pessoal criada depois de 13/11/2023 — este é o caso — precisa de
  **12 testadores inscritos por 14 dias seguidos** num teste fechado antes de
  poder pedir acesso à produção. O prazo corre em paralelo ao grupo jogando.

## 2. Criar o app no console

| Campo | Resposta |
|---|---|
| Nome do app | Kamilinha Teams |
| Idioma padrão | Português (Brasil) |
| App ou jogo | App |
| Gratuito ou pago | Gratuito (não dá para mudar para pago depois) |

## 3. Ficha da loja

### Nome do app (até 30 caracteres)

```
Kamilinha Teams
```

### Descrição breve (até 80 caracteres)

```
Sorteia times de vôlei equilibrados com notas anônimas do próprio grupo.
```

### Descrição completa (até 4000 caracteres)

```
O Kamilinha Teams acaba com os quinze minutos de discussão antes do jogo.

Em vez de alguém escalar os times de cabeça, quem joga avalia quem joga. Cada
pessoa dá nota de 0 a 100 em ataque, defesa e levantada para os companheiros de
turma, e o app usa essas notas para sortear quartetos equilibrados com quem
apareceu naquele dia.

AS NOTAS SÃO ANÔNIMAS

Esse é o ponto do app, e ele é levado a sério: ninguém descobre quem deu qual
nota. Nem quem recebeu, nem quem administra a turma. Você também não vê a sua
própria nota — o que existe é a média que os outros enxergam.

A média de um jogador só aparece depois de cinco avaliadores, e nunca é a média
crua dos votos. Assim nenhum voto isolado pode ser deduzido de trás para frente,
e ninguém consegue descobrir o que você achou de alguém comparando telas.

COMO FUNCIONA

• Entre com a sua conta Google.
• Crie uma turma e passe o código de convite de seis letras para o pessoal — ou
  entre na turma de alguém com o código que te mandaram.
• Avalie quem joga com você. Mudou de ideia depois de uma partida ruim? É só
  corrigir a nota, quantas vezes quiser.
• Na hora do jogo, marque quem veio e toque em sortear. Os times saem
  equilibrados, e mudam a cada rodada mesmo com o mesmo pessoal em quadra.

FEITO PARA UM GRUPO DE VERDADE

Nada de rede social, feed, curtida ou chat. O app faz uma coisa só: escalar time
de vôlei sem briga. Não tem anúncio, não tem cobrança, não rastreia você e não
pede acesso a contatos, localização ou fotos.

Você pode apagar sua conta e todos os seus dados por dentro do app, em dois
toques. Se você era dono de uma turma, ela não some junto: passa para o membro
mais antigo, e o resto do grupo continua jogando.

O projeto é de código aberto: github.com/EmanoelGilFerreira97/kamilinha-teams
```

### Categoria e contato

| Campo | Resposta |
|---|---|
| Categoria do app | Esportes |
| Tags | vôlei, esportes, times |
| E-mail de contato | emanoelf54@gmail.com |
| Site | https://emanoelgilferreira97.github.io/kamilinha-teams/ |
| Política de privacidade | https://emanoelgilferreira97.github.io/kamilinha-teams/privacidade.html |

**As duas URLs acima só respondem depois que a fase 06 for mesclada na `main`.**
O GitHub Pages serve da `main`, pasta `/docs`, e as páginas nascem na branch da
fase. A ordem escolhida foi mesclar primeiro e preencher a ficha depois — o
gargalo de verdade é a verificação da conta de desenvolvedor, então a URL não
faz falta antes disso.

### Artes obrigatórias

| Peça | Formato | Situação |
|---|---|---|
| Ícone | PNG 512×512, 32 bits, sem transparência | Pronto: `assets/loja/icone-512.png` |
| Gráfico de destaque | PNG ou JPG 1024×500 | Pronto: `assets/loja/destaque-1024x500.png` |
| Capturas de tela do celular | mínimo 2, ideal 4 a 8; entre 320 px e 3840 px de lado | **Faltam** — tirar do aparelho com o app em uso |

As duas primeiras saem de `npm run artes`, a partir de `assets/logo.png`. Se o
logo mudar, rodar de novo em vez de editar PNG à mão.

As capturas que valem a pena: lista de turmas, tela da turma com as notas, tela
de avaliar alguém e o resultado do sorteio. Vale tirar as quatro no tema claro,
com uma turma de nomes plausíveis.

## 4. Data Safety (Segurança dos dados)

O formulário mais chato e o que mais reprova. As respostas abaixo batem com o
que o código faz hoje — se o app passar a coletar qualquer outra coisa, isto
aqui muda junto.

**Perguntas gerais**

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dados exigidos? | Sim |
| Todos os dados são criptografados em trânsito? | Sim (HTTPS) |
| Você oferece um jeito de o usuário pedir a exclusão dos dados? | Sim — URL: https://emanoelgilferreira97.github.io/kamilinha-teams/excluir-conta.html |

**Tipos de dados coletados** — nenhum é compartilhado com terceiros, nenhum é
usado para publicidade, e todos são obrigatórios (vêm do login ou do uso).

| Tipo | Categoria | Finalidade |
|---|---|---|
| Nome | Informações pessoais | Funcionalidade do app; Gerenciamento de conta |
| Endereço de e-mail | Informações pessoais | Gerenciamento de conta |
| IDs do usuário | Informações pessoais | Funcionalidade do app; Gerenciamento de conta |
| Fotos | Fotos e vídeos | Funcionalidade do app — é o endereço da foto de perfil do Google |
| Outras ações do usuário | Atividade no app | Funcionalidade do app — as notas dadas e as turmas |

Sobre a linha "Fotos": o app guarda o **endereço** da foto de perfil do Google e
hoje não a exibe em lugar nenhum. Declarar é o caminho seguro — sub-declarar é o
que derruba a ficha. Se um dia se decidir que a foto não vale a pena, sai a
coluna `avatar_url` e sai esta linha junto.

## 5. Classificação de conteúdo (IARC)

Questionário respondido no console. As respostas honestas para este app:

- Categoria: **Utilitário, produtividade, comunicação ou outro**.
- Violência, sexo, linguagem imprópria, drogas, jogos de azar: **não** em todas.
- Compartilhamento de localização: **não**.
- Compartilhamento de informações pessoais com terceiros: **não**.
- O app permite que usuários se comuniquem entre si? **Não há chat nem
  mensagens.** O que existe é o nome da turma, digitado por quem a cria, e os
  nomes vindos do Google, visíveis para quem divide turma. Se o formulário
  insistir em "conteúdo gerado pelo usuário", é isso e nada mais.
- Compras no app: **não**.

Resultado esperado: **Livre / L**.

## 6. Público-alvo e conteúdo

| Campo | Resposta |
|---|---|
| Faixa etária alvo | 13+ (não marcar nenhuma faixa infantil) |
| O app atrai crianças? | Não |
| Programa "Apps para famílias" | Não participar |
| Anúncios | O app **não** contém anúncios |
| Recursos financeiros | Nenhum |
| Apps de saúde | Não |
| Apps governamentais | Não |

## 7. Acesso ao app (App access)

O revisor da Play precisa conseguir usar o app. Aqui ele **não vê nada** só com
o login: sem turma a tela fica vazia, e a nota média depende de cinco
avaliadores.

Então, na seção "Acesso ao app", escolher **"Todas as funcionalidades exigem
acesso especial"** e escrever instruções assim:

```
O app exige login com conta Google (qualquer uma serve).

Para ver o app com conteúdo, use o código de convite abaixo, que dá acesso a
uma turma de demonstração já com jogadores e notas:

  1. Entre com qualquer conta Google.
  2. Toque em "Entrar com código".
  3. Use o código: XXXXXX
  4. A turma abre com a lista de jogadores e as notas médias.
  5. Em "Sortear times", marque quem veio e toque em sortear.

As notas individuais são anônimas por definição do produto: nenhum usuário,
nem o revisor, consegue ver quem deu qual nota.
```

Antes de enviar, criar essa turma de demonstração com
`supabase/testes/popular-turma-de-teste.sql` e trocar o `XXXXXX` pelo código
real. **A turma de demonstração é separada da turma real do grupo** — jogador de
teste na turma real polui o agregado e estraga o sorteio.

## 8. O AAB

O `eas.json` já tem o perfil de produção com `buildType: app-bundle` e
`autoIncrement`, e a versão vem do servidor (`appVersionSource: remote`).

```
npx eas-cli build --platform android --profile production
```

Lembretes que já custaram caro antes:

- **`eas-cli` não é dependência do projeto.** Rodar por `npx eas-cli`, nunca
  instalar no `package.json`: da última vez arrastou um TypeScript conflitante e
  dessincronizou o lockfile, que é o que o EAS instala com `npm ci`.
- **O build sai de um commit, não da árvore de trabalho.** Commitar antes, e
  conferir com `npx eas-cli build:list` de qual commit o build saiu antes de
  concluir que uma mudança "não funcionou".
- A chave de assinatura é gerada e guardada pelo EAS. Antes do primeiro envio,
  rodar `npx eas-cli credentials` e baixar uma cópia do keystore. Perder essa
  chave significa não conseguir mais atualizar o app.

O primeiro AAB sobe **à mão** pelo console, na trilha de teste fechado. O
`eas submit` só passa a valer depois, com uma conta de serviço do Google Cloud
ligada ao app já existente.

## 9. Teste fechado

- Criar a trilha **Teste fechado** e uma lista de e-mails com os testadores.
- São necessários **12 testadores inscritos e ativos por 14 dias seguidos**. Cada
  um precisa aceitar o convite e instalar pelo link do teste — instalar o APK
  por fora não conta.
- O relógio dos 14 dias só começa quando os 12 estiverem lá. Vale sobrar gente:
  se alguém desinstalar no meio, a contagem se ressente.
- Depois disso, o console libera o formulário de acesso à produção.

## Ordem de execução

1. [ ] Abrir e verificar a conta de desenvolvedor *(mais lento — começar já)*
2. [ ] Mesclar a fase na `main`, ligar o GitHub Pages (Settings → Pages →
   `main`, pasta `/docs`) e conferir que as três páginas abrem
3. [ ] Tirar as capturas de tela *(o ícone e o gráfico de destaque já estão em
   `assets/loja/`)*
4. [ ] Criar o app no console e preencher a ficha
5. [ ] Data Safety, classificação de conteúdo e público-alvo
6. [ ] Criar a turma de demonstração e preencher "Acesso ao app"
7. [ ] Commitar, gerar o AAB e subir na trilha de teste fechado
8. [ ] Juntar os 12 testadores e deixar os 14 dias correrem
