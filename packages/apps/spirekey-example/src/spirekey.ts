/**
 * SpireKey SDK helpers.
 *
 * The old redirect-based KadenaSpireKey class has been replaced by the
 * official @kadena/spirekey-sdk which uses an embedded iframe + postMessage
 * instead of page redirects. This file re-exports SDK functions and exposes
 * typed env config.
 *
 * Network notes (as of March 2026):
 *  - testnet04 was abandoned by Kadena LLC (shut down Oct 2025) — do NOT use.
 *  - testnet06 is the live community testnet on chainweb-community.org.
 *  - Faucet: https://tools.chainweb-community.org
 */
export {
  connect,
  initSpireKey,
  sign,
  type ConnectedAccount,
  type SignedTransactions,
} from '@kadena/spirekey-sdk';
export type { Account } from '@kadena/spirekey-sdk';

/**
 * SpireKey host (embedded wallet).
 * Live Chainweaver:  https://chainweaver.kadena.io  (default)
 * Local SpireKey:    http://localhost:1337
 */
export const SPIREKEY_HOST: string =
  (import.meta.env.VITE_SPIREKEY_HOST as string | undefined) ??
  'https://chainweaver.kadena.io';

/**
 * testnet06 — the live KDA Community Edition testnet (Feb 2026+).
 * API: https://api.testnet.chainweb-community.org
 * Explorer: https://explorer.chainweb-community.org/testnet
 * Faucet: https://tools.chainweb-community.org
 */
export const NETWORK_ID: string =
  (import.meta.env.VITE_NETWORK_ID as string | undefined) ?? 'testnet06';

export const CHAIN_ID: string =
  (import.meta.env.VITE_CHAIN_ID as string | undefined) ?? '1';

export const CHAINWEB_API_BASE: string =
  (import.meta.env.VITE_CHAINWEB_API_BASE as string | undefined) ??
  'https://api.testnet.chainweb-community.org';

/** Web faucet for testnet06 KDA — opens in a new tab */
export const FAUCET_URL = 'https://tools.chainweb-community.org';

/** Block explorer for testnet06 */
export const EXPLORER_URL = 'https://explorer.chainweb-community.org/testnet';
