# spirekey-dapp

A production-ready **SpireKey WebAuthn dApp** built with **Vite + React + TypeScript** that demonstrates the three core SpireKey flows:

1. **Connect** — link a SpireKey account via biometric (Face ID, Touch ID, or hardware key)
2. **Fund** — call the testnet faucet to top up the account
3. **Transfer KDA** — build, sign (biometric prompt), submit, and poll a KDA transfer

---

## What is SpireKey?

SpireKey is Kadena's WebAuthn wallet. Instead of a seed phrase it uses your device's built-in biometric authenticator (passkey). This dApp embeds SpireKey as an invisible iframe and communicates with it via `postMessage`.

SpireKey vs Chainweaver at a glance:

| | SpireKey | Chainweaver |
|---|---|---|
| Auth | WebAuthn / Passkey | Ed25519 key file |
| Seed phrase | ✗ never | ✓ required |
| Mobile-friendly | ✓ | limited |
| Hosted | chainweaver.kadena-community.org | self-hosted or desktop |

---

## Quick start

```bash
# Install dependencies
npm install        # or: pnpm install

# Copy env and edit if needed
cp .env.example .env

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SPIREKEY_HOST` | `https://chainweaver.kadena-community.org` | SpireKey wallet host |
| `VITE_NETWORK_ID` | `testnet06` | Kadena network |
| `VITE_CHAIN_ID` | `14` | Default chain ID (0–19) |
| `VITE_CHAINWEB_API_BASE` | `https://api.testnet.chainweb-community.org` | Chainweb node base URL |

### Using a local SpireKey instance

```bash
VITE_SPIREKEY_HOST=http://localhost:1337
VITE_NETWORK_ID=development
VITE_CHAIN_ID=0
VITE_CHAINWEB_API_BASE=http://localhost:8080
```

### Using a self-hosted K-oreID / SpireKey gateway

```bash
VITE_SPIREKEY_HOST=https://your-kyc-gateway.example.com
```

---

## Project structure

```
spirekey-dapp/
├── .env.example              # env template
├── contracts/                # Pact smart contracts (reference / deployment)
│   ├── spirekey-gas-station.pact
│   ├── spirekey-escrow.pact
│   └── spirekey-nft-mint.pact
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Root component — step router
    ├── App.module.css
    ├── env.ts                # Typed env variables
    ├── client.ts             # @kadena/client factory
    ├── hooks/
    │   └── useSpireKey.ts    # All SDK state & flow logic
    ├── components/
    │   ├── ConnectStep.tsx   # Step 1: connect via SpireKey
    │   ├── FundStep.tsx      # Step 2: testnet faucet
    │   ├── TransferStep.tsx  # Step 3: build + sign + submit transfer
    │   ├── AccountCard.tsx   # Reusable account display
    │   └── StatusBar.tsx     # Loading / error / success bar
    └── styles/
        └── index.css         # Global CSS (custom properties, reset)
```

---

## SDK usage

```ts
import { initSpireKey, connect, sign } from '@kadena/spirekey-sdk';

// Initialise once (e.g. in useEffect)
initSpireKey({ hostUrl: 'https://chainweaver.kadena-community.org' });

// Connect — opens a SpireKey popup, returns the account when done
const account = await connect('testnet04', '14');
const ready = await account.isReady(); // waits for on-chain registration

// Sign a transaction
const { transactions, isReady } = await sign([unsignedTx], [accountHint]);
await isReady(); // waits for cross-chain preflight
await client.submit(transactions[0]);
```

---

## Pact contracts

The `contracts/` directory contains Pact modules that are compatible with
SpireKey biometric signing:

| File | Description |
|------|-------------|
| `spirekey-gas-station.pact` | Gas station that pays fees for SpireKey users |
| `spirekey-escrow.pact` | Atomic two-step escrow (buyer → seller) |
| `spirekey-nft-mint.pact` | NFT minting with biometric guard |

Deploy these on devnet or testnet with [`kadena-cli`](https://github.com/kadena-community/kadena.js/tree/main/packages/tools/kadena-cli) or the
[Pact REPL](https://pact-language.readthedocs.io).

---

## Build

```bash
npm run build    # type-check + Vite production build → dist/
npm run preview  # serve the production build locally
```

---

## Related

- [SpireKey SDK source](https://github.com/kadena-community/spirekey)
- [`@kadena/spirekey-sdk` on npm](https://www.npmjs.com/package/@kadena/spirekey-sdk)
- [Kadena Documentation](https://docs.kadena.io)
- [kadena.js monorepo](https://github.com/kadena-community/kadena.js)
