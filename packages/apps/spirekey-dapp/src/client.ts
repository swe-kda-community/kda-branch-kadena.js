import { createClient, type ChainId } from '@kadena/client';
import { CHAINWEB_API_BASE, NETWORK_ID } from './env';

/**
 * Creates a Chainweb API URL for a given path.
 * e.g. chainwebUrl('chain/14/pact') →
 *   https://api.testnet.chainweb.com/chainweb/0.0/testnet04/chain/14/pact
 */
export const chainwebUrl = (path: string): string =>
  `${CHAINWEB_API_BASE}/chainweb/0.0/${NETWORK_ID}/${path}`;

/** Pact API URL for a given chain */
export const pactApiUrl = (chainId: ChainId): string =>
  chainwebUrl(`chain/${chainId}/pact`);

/** @kadena/client instance bound to the configured network */
export const l1Client = createClient(
  ({ chainId }: { chainId: ChainId; networkId: string }) =>
    pactApiUrl(chainId),
);
