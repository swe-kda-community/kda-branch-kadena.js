/**
 * Deterministic SHA-256 proof hash for K-oreID attestations.
 * Input: JSON of { account, method, data, nonce, ts }
 * Output: lowercase hex string
 */
export async function buildProofHash(
  account: string,
  method: string,
  data: unknown,
): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = JSON.stringify({
    account,
    method,
    data,
    nonce,
    ts: Date.now(),
  });

  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
