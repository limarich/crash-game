# Crash Game — Jungle Gaming Challenge

## Setup

```bash
git clone https://github.com/SEU_USER/crash-game-challenge
cd crash-game-challenge
bun install
bun run docker:up
```

Aguarde todos os containers subirem.

### Usuário de teste

| Campo    | Valor                    |
|----------|--------------------------|
| Username | `player`                 |
| Password | `player123`              |
| Email    | `player@crash-game.dev`  |


### Serviços disponíveis

| Serviço            | URL                          |
|--------------------|------------------------------|
| Frontend           | http://localhost:3000        |
| API (via Kong)     | http://localhost:8000        |
| Keycloak Admin     | http://localhost:8080        |
| RabbitMQ UI        | http://localhost:15672       |

---

## Como rodar os testes

```bash
# Testes unitários — domínio (sem docker)
cd services/wallets && bun test tests/unit
cd services/games   && bun test tests/unit

# Testes E2E — requer docker:up
cd services/wallets && bun test tests/e2e
cd services/games   && bun test tests/e2e
```

---

## Arquitetura

### Visão geral

```
frontend (3000)
    ↓ HTTP / WebSocket
Kong API Gateway (8000)
    ↓                ↓
game-service (4001)   wallet-service (4002)
    ↓    ↕ RabbitMQ ↕    ↓
PostgreSQL            PostgreSQL
(database: games)     (database: wallets)
```

### Bounded contexts

O sistema é dividido em dois bounded contexts independentes com bancos de dados separados:

**Game Service**:  responsável pelo ciclo de vida da rodada, apostas, lógica de crash, provably fair e WebSocket.

**Wallet Service**: responsável pelo saldo do jogador. Crédito e débito acontecem exclusivamente via mensageria, nunca via REST.

### Comunicação entre serviços

Os serviços se comunicam de forma assíncrona via RabbitMQ usando uma saga coreografada. Não há chamadas REST síncronas entre eles.

**Exchange:** `crash.events` (topic, durable)

| Routing key               | Publicado por  | Consumido por  | Quando                          |
|---------------------------|----------------|----------------|---------------------------------|
| `wallet.debit.requested`  | Game Service   | Wallet Service | Jogador faz aposta              |
| `wallet.debit.succeeded`  | Wallet Service | Game Service   | Débito confirmado               |
| `wallet.debit.failed`     | Wallet Service | Game Service   | Saldo insuficiente ou erro      |
| `wallet.credit.requested` | Game Service   | Wallet Service | Jogador faz cashout             |
| `wallet.credit.succeeded` | Wallet Service | Game Service   | Crédito confirmado              |

Cada fila de consumo tem uma Dead Letter Queue (`crash.events.dlx`) para mensagens rejeitadas.

### Fluxo de aposta (saga)

```
1. Jogador POST /games/bet
2. Game Service cria Bet(PENDING) e publica wallet.debit.requested
3. Wallet Service debita o saldo e publica wallet.debit.succeeded
4. Game Service recebe wallet.debit.succeeded e confirma Bet(CONFIRMED)
   — ou —
3. Wallet Service falha e publica wallet.debit.failed
4. Game Service recebe wallet.debit.failed e cancela Bet(CANCELLED)
```

### WebSocket

Direção exclusivamente servidor → cliente. Todas as ações do jogador (apostar, sacar) são via REST.

| Evento                  | Quando                                    |
|-------------------------|-------------------------------------------|
| `round:sync`            | Na conexão/reconexão — estado completo    |
| `round:betting-started` | Nova rodada inicia fase de apostas        |
| `round:started`         | BETTING → RUNNING                         |
| `round:tick`            | A cada 100ms durante RUNNING              |
| `round:crashed`         | Crash — serverSeed revelada aqui          |
| `bet:placed`            | Aposta confirmada                         |
| `bet:cashedout`         | Cashout efetuado                          |

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

A base `1.0024` representa crescimento de 0,24% a cada tick de 100ms — crescimento composto que produz uma curva exponencial suave. O valor foi escolhido para equilibrar tensão e jogabilidade: lento o suficiente para o jogador tomar decisões, rápido o suficiente para criar urgência.

> **Trade-off:** a fórmula é independente do `crashPoint` — o multiplicador continua subindo além do crash point até o `GameEngineService` detectar que o limite foi atingido e executar o crash. O intervalo entre a detecção e a execução (latência do loop) pode causar um overshoot de até 100ms.
```

### Bet — state machine

```
PENDING → CONFIRMED  (wallet.debit.succeeded)
PENDING → CANCELLED  (wallet.debit.failed)
CONFIRMED → CASHED_OUT
CONFIRMED → LOST

O `payoutInCents` é armazenado no momento do cashout e nunca recalculado.

> **Trade-off:** O valor poderia ser derivado de `amountInCents × cashoutMultiplier` a qualquer momento, mas armazenar o resultado calculado na hora do cashout elimina o risco de inconsistência caso a fórmula do multiplicador mude no futuro. O objetivo é que o registro de pagamento reflita o que foi efetivamente pago, não o que seria calculado hoje.

### Precisão monetária

Todos os valores monetários trafegam como `BIGINT` em centavos. Nenhuma operação usa `number` ou `float` para dinheiro. 

Valores monetários trafegam como `string` no JSON (RabbitMQ e REST) por limitação do protocolo com BigInt.

O cálculo do payout usa `decimal.js` para evitar imprecisão de ponto flutuante no multiplicador — valores decimais como `1.337` não têm representação exata em IEEE 754, o que poderia introduzir erro de centavos em apostas maiores.

> **Trade-off:** A conversão nativa `BigInt(Math.floor(Number(amountInCents) * multiplier))` seria segura dentro dos limites do desafio (máximo de 100.000 centavos, muito abaixo do `Number.MAX_SAFE_INTEGER`). O `decimal.js` foi escolhido por eliminar qualquer dependência dos limites de aposta configurados, assim se o máximo aumentasse no futuro, o cálculo continua correto sem necessidade de alterações.

---

## Provably Fair

O crash point de cada rodada é pré-determinado e verificável pelo jogador usando HMAC-SHA256 com três variáveis: `serverSeed`, `clientSeed` e `nonce`.

### Fluxo por rodada

```
1. Servidor gera serverSeed aleatório
2. Calcula serverSeedHash = SHA256(serverSeed)
3. Calcula crashPoint = HMAC-SHA256(serverSeed, clientSeed, nonce)
4. Publica serverSeedHash antes da rodada (commitment)
5. Durante a rodada: serverSeed e crashPoint nunca são expostos
6. Após o crash: revela serverSeed no evento round:crashed
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

  // House edge de 1%: 1 em cada 33 rodadas crasham em 1.00x
  if (h % 33 === 0) return 1.00

  return Math.floor((99 * e) / (e - h)) / 100
}
```

### Verificação

```
GET /games/rounds/:roundId/verify
```

Retorna `serverSeed` apenas se `status === 'CRASHED'`. O jogador pode usar qualquer ferramenta HMAC-SHA256 online para verificar o resultado.

---

## Decisões técnicas e trade-offs

### ORM: Prisma

Escolhido pela simplicidade de configuração com `BIGINT`, tipagem automática e API de transações direta (`$transaction`). O `SELECT ... FOR UPDATE` é implementado via `$queryRaw` para o cashout, prevenindo race condition de cashout duplo simultâneo.

> **Trade-off:** `BigInt` não serializa nativamente em JSON — requer interceptor global no NestJS para converter para `string` nas respostas.

### RabbitMQ: saga coreografada vs orquestrada

Optei por saga coreografada — cada serviço reage a eventos sem um orquestrador central. É mais simples de implementar e suficiente para dois serviços com fluxos bem definidos.

> **Trade-off:** em sistemas com mais serviços e fluxos complexos, a saga coreografada dificulta rastrear o estado global da transação. Uma saga orquestrada seria mais apropriada nesse cenário.

### Provably Fair: clientSeed + serverSeed + nonce vs serverSeed apenas

Implementei o padrão completo com três variáveis por ser o padrão da indústria para crash games. O `clientSeed` adiciona uma camada de confiança — o provedor do jogo não pode manipular o resultado porque não conhece o clientSeed antecipadamente.

> **Trade-off:** o `clientSeed` por sessão (em vez de por rodada) simplifica a implementação mas reduz levemente a garantia de imprevisibilidade. Com mais tempo, implementaria rotação de `clientSeed` a cada rodada com confirmação do jogador.

### Estado do round: banco como fonte da verdade

O multiplicador atual é sempre calculado a partir de `startedAt` (timestamp do banco) + tempo decorrido. Não há estado em memória que precise ser sincronizado.

> **Trade-off:** cada tick do WebSocket (100ms) lê `startedAt` do objeto em memória, não do banco. O objeto `Round` é carregado uma vez quando a rodada começa e mantido em memória pelo `GameEngineService` durante o ciclo ativo. Em caso de restart, o serviço recarrega a rodada ativa do banco e continua de onde parou.

### Separação de agregados: Round e Bet

`Round` não contém uma lista de `Bet[]`. A relação é mantida pelo `roundId` na entidade `Bet`. Isso evita carregar todas as apostas da rodada em memória para operações simples como cashout de um único jogador.

> **Trade-off:** queries que precisam de dados agregados (ex: listar apostas da rodada atual) exigem uma query separada no repositório de `Bet`.
