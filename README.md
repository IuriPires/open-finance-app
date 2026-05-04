# Open Finance App

App React Native (Expo SDK 55, New Architecture) que demonstra integração com a [Pluggy](https://www.pluggy.ai) — Open Finance Brasil — em ambiente sandbox.

Mostra agregação multi-banco, contas, transações categorizadas, identidade do titular, cartão de crédito (limite + fatura), portfolio de investimentos, insights de gastos e iniciação de pagamento PIX.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 55 (Dev Client) + React Native 0.83.6 + New Architecture |
| Roteamento | `expo-router` (file-based, typed routes) |
| Estado/cache | TanStack Query v5 |
| Widget Pluggy | `react-native-pluggy-connect` 1.4.1 (módulo nativo) |
| Pagamento | `expo-web-browser` (página hospedada da Pluggy) |
| Ícones | `@expo/vector-icons` (Ionicons) |
| Linguagem | TypeScript |

## Pré-requisitos

- Node 20+ e npm
- Xcode 15+ com simulador iOS (macOS) ou Android Studio com emulador (qualquer SO)
- CocoaPods (`sudo gem install cocoapods`) para builds iOS
- **Backend da Pluggy POC rodando** — este app não funciona sozinho. Você precisa de um backend Node que faça a ponte com a API da Pluggy usando `CLIENT_ID`/`CLIENT_SECRET` (não dá pra colocar credenciais no app)

## Setup

```bash
# 1. Instala dependências (use --legacy-peer-deps por causa do React 19)
npm install --legacy-peer-deps

# 2. Configura a URL do backend
cp .env.example .env
# edite .env: troque o IP pelo IP da sua máquina onde o backend está rodando
# (use `ifconfig | grep "inet 192"` no macOS, NUNCA "localhost" se for testar
# em device físico — em simulador iOS, "localhost" também funciona)

# 3. Gera os projetos nativos iOS/Android
npx expo prebuild

# 4. Roda no simulador
npx expo run:ios          # primeira build leva ~5min, build incrementais ~30s
# ou
npx expo run:android      # precisa do Android Studio + emulador rodando
```

A primeira execução compila ~95 pods nativos no iOS e configura o Gradle no Android. Builds posteriores usam cache.

## Variáveis de ambiente

| Variável | Obrigatório | Exemplo | Descrição |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | sim | `http://192.168.1.10:3000` | URL do backend Node (sem barra no fim) |

⚠️ **Não use `localhost`** se rodar em device físico. Em simulador iOS funciona; em Android emulador use `http://10.0.2.2:3000`.

## Por que não Expo Go

O `react-native-pluggy-connect` é módulo nativo (usa `react-native-webview`). Expo Go não suporta módulos nativos arbitrários, então usamos **Expo Dev Client** + `expo prebuild`. O fluxo é o padrão Expo moderno (recomendado para novos apps a partir de SDK 50+).

## Telas

```
app/
├── index.tsx                    # Home: hero patrimônio total + lista de items + CTAs
├── accounts/[itemId].tsx        # Contas e transações de um item, com filtro por categoria
├── account/[accountId].tsx      # Detalhe de uma conta (visual de cartão pra crédito)
├── identity/[itemId].tsx        # Perfil do titular (nome, CPF, contato, endereços)
├── investments/[itemId].tsx     # Portfolio: holdings agrupados por tipo
├── insights/[itemId].tsx        # Gastos do mês por categoria + comparativo mês a mês
└── payment/
    ├── new.tsx                  # Form de pagamento PIX
    └── [requestId].tsx          # Status do PaymentIntent (polling)
```

## Fluxos

### Fluxo 1 — Conectar conta + ler dados

1. Home → "Conectar conta"
2. Backend cria `connectToken` (30 min)
3. App abre `<PluggyConnect>` em Modal fullscreen
4. Usuário escolhe banco sandbox e autentica
5. `onSuccess` → app registra `itemId` no backend (`POST /api/items`) e navega para `/accounts/{id}`
6. Tela faz polling no backend até `item.status === 'UPDATED'`, então renderiza contas + transações

### Fluxo 2 — Iniciar PIX

1. Home → "Iniciar PIX" → form de valor + descrição
2. Backend cria `PaymentRequest` com `isSandbox: true` e devolve `paymentUrl`
3. App abre `paymentUrl` em `expo-web-browser` (página hospedada da Pluggy)
4. Usuário escolhe banco-pagador sandbox e autoriza
5. App vai pra `/payment/{requestId}` e faz polling até estado terminal (`PAYMENT_COMPLETED`, `CONSENT_REJECTED`, etc.)

## Sandbox — credenciais de teste

| Campo | Valor |
|---|---|
| Usuário | `user-ok` |
| Senha | `password-ok` |
| MFA | `123456` |
| CPF (Open Finance) | `761.092.776-73` |

No widget escolha um connector com tag **Sandbox** (ex: "Pluggy Bank").

## Estrutura

```
.
├── app/                  # Telas (Expo Router file-based)
├── lib/
│   ├── api.ts            # Cliente HTTP do backend + tipos
│   └── categories.ts     # Mapping de categoryId Pluggy → ícone/cor/label PT
├── app.json              # Expo config (newArchEnabled, scheme pluggypoc, bundle IDs)
├── package.json
├── tsconfig.json
└── .env.example
```

## Backend correspondente

Este app não funciona sem um backend que implemente:

```
POST /api/connect-token
GET  /api/items
POST /api/items
GET  /api/items/:id/snapshot
GET  /api/items/:id/identity
GET  /api/items/:id/investments
GET  /api/items/:id/insights?month=YYYY-MM
GET  /api/accounts/:id
POST /api/payments
GET  /api/payments/:requestId/intent
```

O backend usa `pluggy-sdk` no Node + `CLIENT_ID`/`CLIENT_SECRET` da Pluggy ([dashboard.pluggy.ai](https://dashboard.pluggy.ai)).

## Limitações conhecidas (POC)

- **Sem persistência real** — backend usa Map in-memory; reiniciar zera os items conectados
- **Sem auth** — `clientUserId` fixo (`pluggy-poc-demo-user`)
- **Polling em vez de webhooks** — em produção troca por webhook (`item/updated`, `transactions/created`)
- **Produção exige homologação BCB** — sandbox é livre, produção requer autorização do Banco Central do Brasil
- **`expo-linear-gradient` não está em uso** — substituído por Views empilhadas pra evitar rebuild nativo

## Troubleshooting

| Problema | Solução |
|---|---|
| `npm install` falha por peer deps | use `--legacy-peer-deps` |
| Build iOS falha em `RNScreens` | rode `npx expo install --fix` pra alinhar versões com SDK 55 |
| App fica em "Sincronizando dados…" | confira logs do backend; status do item provavelmente é `UPDATING` (espera) ou `LOGIN_ERROR` (recriar item) |
| Widget abre como retângulo branco no rodapé | ele precisa estar dentro de `<Modal presentationStyle="fullScreen">` (já está) |
| Simulador não responde tap em campos | `Cmd+K` no Mac com simulador focado para alternar teclado de software |

## Licença

POC interna — sem licença pública.
