# Crash Game — Jungle Gaming Challenge

## Setup

```bash
git clone https://github.com/limarich/crash-game.git
cd crash-game-challenge
bun install
cp services/games/.env.example services/games/.env && cp services/wallets/.env.example services/wallets/.env
bun run docker:up
```

Aguarde todos os containers subirem. O Keycloak, Kong e o banco levam alguns segundos para ficar prontos. O `docker:up` aguarda os healthchecks antes de subir os serviços de aplicação.

### Usuário de teste

| Campo    | Valor                   |
|----------|-------------------------|
| Username | `player`                |
| Password | `player123`             |
| Email    | `player@crash-game.dev` |
| Saldo inicial | R$ 1.000,00 (creditado automaticamente pelo seeder) |

### Seeder — saldo inicial do usuário de teste

O `docker:up` inclui um container one-shot (`seeder`) que roda automaticamente após o Keycloak e o Wallet Service ficarem prontos. Nenhum passo manual é necessário.

**O que faz, em ordem:**

1. Faz login no Keycloak como `player` via OIDC password grant para obter um Bearer token
2. Cria a carteira do jogador via `POST /wallets` (ignora se a carteira já existe)
3. Semeia R$1.000,00 de saldo inicial via `POST /wallets/admin/seed` (sem efeito se o saldo já for maior que zero)
4. Para automaticamente (`restart: "no"`)

O script está em `docker/seeder/seed.sh`. O serviço é configurado no `docker-compose.yml` com `depends_on` em `keycloak` e `wallets`.

> **Trade-off:** o endpoint `POST /wallets/admin/seed` é protegido por JWT mas não por role administrativa, ou seja, qualquer usuário autenticado poderia chamá-lo. Em produção esse endpoint não existiria ou exigiria uma role de admin no Keycloak.

### Serviços disponíveis

| Serviço        | URL                    |
|----------------|------------------------|
| Frontend       | http://localhost:3000  |
| API (via Kong) | http://localhost:8000  |
| Keycloak Admin | http://localhost:8080  |
| RabbitMQ UI    | http://localhost:15672 |

---

## Como rodar os testes

```bash
# Testes unitários — domínio (sem docker)
cd services/wallets && bun test tests/unit
cd services/games   && bun test tests/unit

# Testes E2E — requer docker:up
cd services/wallets && bun test tests/e2e
cd services/games   && bun test tests/e2e

# Frontend
cd frontend && bun test
```

### Testando manualmente via cURL

**1. Obter token do Keycloak:**

```bash
TOKEN=$(curl -s -X POST \
  'http://localhost:8080/realms/crash-game/protocol/openid-connect/token' \
  -d 'grant_type=password' \
  -d 'client_id=crash-game-client' \
  -d 'username=player' \
  -d 'password=player123' \
  | jq -r '.access_token')
```

**2. Criar carteira para o usuário:**

```bash
curl -s -X POST http://localhost:8000/wallets \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

**3. Consultar saldo:**

```bash
curl -s http://localhost:8000/wallets/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

**4. Fazer aposta (durante fase BETTING):**

```bash
curl -s -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountInCents": 1000}' \
  | jq
```

**5. Fazer cashout:**

```bash
curl -s -X POST http://localhost:8000/games/bet/cashout \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

---

## Arquitetura

### Visão geral

```
frontend (3000)
    ├─── HTTP/REST ──────► Kong API Gateway (8000)
    │                           ├──► game-service (4001)
    │                           └──► wallet-service (4002)
    └─── WebSocket (socket.io) ─────► game-service (4001)

game-service   ↔ RabbitMQ ↔ wallet-service
game-service   → PostgreSQL (database: games)
wallet-service → PostgreSQL (database: wallets)
```

O WebSocket conecta diretamente no `game-service` (porta 4001) sem passar pelo Kong. Kong tem suporte a WebSocket mas adicionaria complexidade de configuração desnecessária para o escopo do desafio. Em produção o WebSocket deveria passar pelo gateway para centralizar autenticação e rate limiting.

### Bounded contexts

O sistema é dividido em dois bounded contexts independentes com bancos de dados separados:

**Game Service** — responsável pelo ciclo de vida da rodada, apostas, lógica de crash, provably fair e WebSocket.

**Wallet Service** — responsável pelo saldo do jogador. Crédito e débito acontecem exclusivamente via mensageria, nunca via REST.

### Comunicação entre serviços

Os serviços se comunicam de forma assíncrona via RabbitMQ usando uma saga coreografada. Não há chamadas REST síncronas entre eles.

**Exchange:** `crash.events` (topic, durable)

| Routing key               | Publicado por  | Consumido por  | Quando                     |
|---------------------------|----------------|----------------|----------------------------|
| `wallet.debit.requested`  | Game Service   | Wallet Service | Jogador faz aposta         |
| `wallet.debit.succeeded`  | Wallet Service | Game Service   | Débito confirmado          |
| `wallet.debit.failed`     | Wallet Service | Game Service   | Saldo insuficiente ou erro |
| `wallet.credit.requested` | Game Service   | Wallet Service | Jogador faz cashout        |
| `wallet.credit.succeeded` | Wallet Service | Game Service   | Crédito confirmado         |

Cada fila de consumo tem uma Dead Letter Queue (`crash.events.dlx`) para mensagens rejeitadas após 3 tentativas.

Valores monetários trafegam como `string` no JSON — limitação do protocolo com `BigInt`.

### Fluxo de aposta (saga)

```
1. Jogador POST /games/bet
2. Game Service cria Bet(PENDING) e publica wallet.debit.requested
3. Wallet Service debita o saldo e publica wallet.debit.succeeded
4. Game Service recebe wallet.debit.succeeded → confirma Bet(CONFIRMED)
   — ou —
3. Wallet Service falha e publica wallet.debit.failed
4. Game Service recebe wallet.debit.failed → cancela Bet(CANCELLED)
```

### WebSocket

Direção exclusivamente servidor → cliente. Todas as ações do jogador (apostar, sacar) são via REST.

| Evento                  | Payload principal                               | Quando                                 |
|-------------------------|-------------------------------------------------|----------------------------------------|
| `round:sync`            | `{ round, bets, elapsedMs }`                    | Na conexão/reconexão — estado completo |
| `round:betting-started` | `{ roundId, bettingEndsAt, serverSeedHash }`    | Nova rodada inicia fase de apostas     |
| `round:started`         | `{ roundId, startedAt }`                        | BETTING → RUNNING                      |
| `round:tick`            | `{ roundId, multiplier, elapsedMs }`            | A cada 100ms durante RUNNING           |
| `round:crashed`         | `{ roundId, crashPoint, serverSeed }`           | Crash — serverSeed revelada aqui       |
| `bet:placed`            | `{ roundId, playerId, amountInCents }`          | Aposta confirmada                      |
| `bet:cashedout`         | `{ roundId, playerId, multiplier, payoutInCents }` | Cashout efetuado                    |

---

## Modelo de domínio

### Round — state machine

```
BETTING → RUNNING → CRASHED
```

O multiplicador é calculado a partir de `startedAt` + tempo decorrido — nunca de um contador em memória. Isso garante que reconexões de WebSocket e restarts do serviço não dessincronizam o estado.

```typescript
multiplier = Math.pow(1.0024, elapsedMs / 100)
// atinge ~2x em ~30s, ~4x em ~60s
```

A base `1.0024` representa crescimento de 0,24% a cada tick de 100ms (crescimento composto que produz uma curva exponencial suave). O valor foi escolhido para equilibrar tensão e jogabilidade: lento o suficiente para o jogador tomar decisões, rápido o suficiente para criar urgência.

> **Trade-off:** a fórmula é independente do `crashPoint`, o multiplicador continua subindo até o `GameEngineService` detectar que o limite foi atingido e executar o crash. O intervalo entre a detecção e a execução (latência do loop de 100ms) pode causar um overshoot de até um tick.

### Bet — state machine

```
PENDING → CONFIRMED   (wallet.debit.succeeded)
PENDING → CANCELLED   (wallet.debit.failed)
CONFIRMED → CASHED_OUT
CONFIRMED → LOST
```

O `payoutInCents` é armazenado no momento do cashout e nunca recalculado.

> **Trade-off:** o valor poderia ser derivado de `amountInCents × cashoutMultiplier` a qualquer momento, mas armazenar o resultado calculado na hora do cashout elimina o risco de inconsistência caso a fórmula do multiplicador mude no futuro.

### Round e Bet como agregados separados

`Round` não contém uma lista de `Bet[]`. A relação é mantida pelo `roundId` na entidade `Bet`. Isso evita carregar todas as apostas da rodada em memória para operações que afetam um único jogador (como cashout).

> **Trade-off:** queries que precisam de dados agregados (ex: listar apostas da rodada atual) exigem uma query separada no repositório de `Bet`. O ganho em isolamento de agregado e previsibilidade de memória supera o custo da query extra.

### Precisão monetária

Todos os valores monetários são `BIGINT` em centavos no banco e `bigint` em TypeScript. Nenhuma operação usa `number` ou `float` para dinheiro.

O cálculo do payout usa `decimal.js` para evitar imprecisão de ponto flutuante no multiplicador:

```typescript
payoutInCents = BigInt(
  new Decimal(amountInCents.toString()).mul(multiplier).floor().toFixed(0)
)
```

> **Trade-off:** a conversão `BigInt(Math.floor(Number(amountInCents) * multiplier))` seria segura dentro dos limites do desafio (máximo de 100.000 centavos, muito abaixo de `Number.MAX_SAFE_INTEGER`). O `decimal.js` foi escolhido para eliminar qualquer dependência dos limites de aposta configurados — se o máximo aumentar, o cálculo continua correto sem alterações.

---

## Provably Fair

O crash point de cada rodada é pré-determinado e verificável pelo jogador usando HMAC-SHA256 com três variáveis: `serverSeed`, `clientSeed` e `nonce`.

### Fluxo por rodada

```
1. Servidor gera serverSeed aleatório (32 bytes, hex)
2. Calcula serverSeedHash = SHA256(serverSeed)
3. Calcula crashPoint = HMAC-SHA256(serverSeed, clientSeed:nonce)
4. Publica serverSeedHash antes da rodada (commitment)
5. Durante a rodada: serverSeed e crashPoint nunca são expostos
6. Após o crash: revela serverSeed no evento round:crashed e em GET /verify
7. Jogador pode verificar: SHA256(serverSeed) === serverSeedHash
   e recalcular o crashPoint de forma independente
```

### Fórmula do crash point

```typescript
function calculateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = createHmac('sha256', serverSeed)
  hmac.update(`${clientSeed}:${nonce}`)
  const hash = hmac.digest('hex')

  const h = parseInt(hash.slice(0, 8), 16)
  const e = Math.pow(2, 32)

  // House edge de ~1%: 1 em cada 33 rodadas crasham em 1.00x
  if (h % 33 === 0) return 1.00

  return Math.floor((99 * e) / (e - h)) / 100
}
```

### Endpoint de verificação

```
GET /games/rounds/:roundId/verify
```

Retorna `serverSeed` apenas se `status === 'CRASHED'`. O jogador pode usar qualquer ferramenta HMAC-SHA256 para verificar o resultado de forma independente.

### Hash chain

Cada `serverSeed` é derivado do anterior via SHA256, formando uma cadeia imutável. Se o servidor adulterar o seed de qualquer rodada, o hash publicado antes dela não vai bater e as rodadas seguintes também ficam inválidas, porque dependem do seed adulterado.

**Derivação entre rodadas:**

```
seed[n+1]         = SHA256(seed[n])
serverSeedHash[n] = SHA256(seed[n])   ← publicado antes da rodada N começar
```

**Verificação da integridade entre duas rodadas consecutivas:**

```
1. Após o crash da rodada N, o servidor revela serverSeed[N]
2. Calcule: SHA256(SHA256(serverSeed[N]))
3. Compare com o serverSeedHash da rodada N+1 (publicado antes dela começar)
4. Se bater → a sequência é íntegra e o seed não foi manipulado
```

```typescript
function verifyChain(serverSeedN: string, serverSeedHashN1: string): boolean {
  const seedN1 = createHash('sha256').update(serverSeedN).digest('hex')
  const hashN1 = createHash('sha256').update(seedN1).digest('hex')
  return hashN1 === serverSeedHashN1
}
```

---

## Frontend

### Stack

| Camada | Biblioteca |
|--------|------------|
| Framework | TanStack Start |
| Roteamento | TanStack Router (file-based) |
| Server state | TanStack Query |
| Client state | Zustand |
| WebSocket | socket.io-client |
| UI | Tailwind CSS v4 + shadcn/ui |
| Runtime | React 19 |

### Componentes principais

**CrashGraph** — curva exponencial animada em SVG com filtro de glow via SMIL, multiplicador central em display 7-segmentos, flash vermelho ao crash, overlay de radial gradient com cross-fade por fase e countdown de apostas com barra de progresso.

**BettingPanel** — input validado com chips de valor rápido, botão BET durante a fase BETTING e botão CASH OUT durante RUNNING com payout potencial atualizado em tempo real. Auto cashout configurável com toggle. Bloqueia edição fora da fase de apostas.

**CurrentBets** — lista atualizada via WebSocket com animação de entrada por linha.

**RoundHistory** — últimos 20 crash points com código de cores (vermelho `< 2x`, âmbar `2x–10x`, verde `≥ 10x`) e animação de entrada para novos resultados.

**TopBar** — saldo e username extraídos do JWT, histórico de apostas via modal, contador de online com variação aleatória.
---

## Decisões técnicas e trade-offs

### ORM: Prisma

Escolhido pela simplicidade de configuração com `BIGINT`, tipagem automática gerada a partir do schema e API de transações direta (`$transaction`). O `SELECT ... FOR UPDATE` é implementado via `$queryRaw` no cashout e no débito da carteira, prevenindo race condition em operações concorrentes.

> **Trade-off:** `BigInt` não serializa nativamente em JSON — requer interceptor global no NestJS para converter para `string` nas respostas REST. `$queryRaw` retorna colunas em snake_case do PostgreSQL, exigindo mapeamento manual com interface tipada (`BetRawRecord`) para evitar `any[]`.

### RabbitMQ: saga coreografada vs orquestrada

Optei por saga coreografada — cada serviço reage a eventos sem um orquestrador central. É mais simples de implementar e suficiente para dois serviços com fluxos bem definidos.

> **Trade-off:** em sistemas com mais serviços e fluxos complexos, a saga coreografada dificulta rastrear o estado global da transação. Uma saga orquestrada (ex: Temporal) seria mais apropriada nesse cenário.

### `debitWithLock` retorna `null` em vez de lançar erro

O `WalletRepository.debitWithLock` retorna `null` quando a carteira não existe (em vez de lançar `WalletNotFoundError`). Isso permite que o consumer publique `wallet.debit.failed` corretamente sem que a mensagem seja rejeitada com erro não tratado, o que causaria loop infinito de retry até a DLQ.

### MessagingModule separado do GameModule e WalletModule

O `AmqpConnection` do `@golevelup/nestjs-rabbitmq` precisa ser registrado antes dos módulos consumidores. Isolar o `RabbitMQModule` em um `MessagingModule` com `global: true` resolve o problema de injeção sem criar acoplamento circular entre módulos.

### `GameEngineService` como `OnApplicationBootstrap`

O ciclo de rodadas inicia automaticamente quando o serviço sobe, sem endpoint manual. Na inicialização, o serviço verifica se há uma rodada `RUNNING` órfã no banco (causada por restart abrupto) e continua de onde parou usando o `startedAt` persistido — o multiplicador é recalculado corretamente a partir do tempo decorrido real.

### Kong: `strip_path: false`

Os controllers NestJS usam o prefixo completo (`@Controller('games')`, `@Controller('wallets')`). O Kong é configurado com `strip_path: false` para repassar o path inteiro ao serviço de destino, mantendo a rota consistente tanto via Kong quanto via acesso direto na porta do serviço.

### `clientSeed` gerado pelo servidor

Por simplicidade de implementação, o `clientSeed` é gerado pelo próprio servidor a cada seed chain. Em produção, o jogador forneceria o `clientSeed` via frontend antes da rodada, o que adiciona uma camada extra de confiança — o servidor não pode manipular o resultado porque não conhece o `clientSeed` antecipadamente.

### Provably Fair: `clientSeed` + `serverSeed` + `nonce` vs apenas `serverSeed`

Implementei o padrão completo com três variáveis por ser o padrão da indústria para crash games.

> **Trade-off:** o `clientSeed` por sessão (em vez de por rodada) simplifica a implementação mas reduz levemente a garantia de imprevisibilidade. Com mais tempo, implementaria rotação de `clientSeed` a cada rodada com confirmação do jogador.

### `@Optional()` nos gateways injetados no `GameEngineService`

O `GameGateway` e o `GameEngineService` dependem um do outro (o engine emite eventos via gateway; o gateway precisa do engine para o `round:sync`). O `forwardRef` resolve a dependência circular no módulo, e `@Optional()` evita que a inicialização do NestJS falhe caso o gateway não esteja disponível no momento da injeção.
