/**
 * KoreidExpiryBanner
 *
 * Queries the on-chain expiry status of a K-oreID attestation (p14)
 * and renders the appropriate UI state:
 *
 *   expired      → red banner, "Re-verify now" button
 *   expiring-soon → yellow banner with days remaining, "Renew" button
 *   active        → green badge with days remaining
 *   not-found     → grey — no attestation exists yet
 *
 * The `onRenew` callback lets the parent route the user back through
 * the K-oreID verification flow.
 */
import { useCallback, useEffect, useState } from 'react';
import '../styles/block.css';

export type ExpiryStatus = 'active' | 'expiring-soon' | 'expired' | 'not-found' | 'loading';

interface ExpiryResult {
  status: ExpiryStatus;
  secondsLeft: number;
  needsRenewal: boolean;
}

export interface KoreidExpiryBannerProps {
  /** Kadena account name */
  account: string;
  /** K-oreID level to check — "basic" | "standard" | "enhanced" */
  level?: string;
  /** Chainweb API base URL */
  chainwebApi: string;
  /** Network ID */
  networkId: string;
  /** Chain ID */
  chainId: string;
  /** Called when user clicks Re-verify / Renew */
  onRenew?: () => void;
  /** Poll interval in ms — default 60 000 (1 min) */
  pollMs?: number;
}

function daysLeft(seconds: number): number {
  return Math.floor(seconds / 86400);
}

function hoursLeft(seconds: number): number {
  return Math.floor((seconds % 86400) / 3600);
}

async function queryExpiryStatus(
  account: string,
  level: string,
  chainwebApi: string,
  networkId: string,
  chainId: string,
): Promise<ExpiryResult> {
  const pactCode = `(free.vx9k.p14 "${account}" "${level}")`;

  const body = {
    pactCode,
    meta: {
      chainId,
      creationTime: Math.floor(Date.now() / 1000),
      ttl: 600,
      gasLimit: 10000,
      gasPrice: 0.00000001,
      sender: '',
    },
    networkId,
    signers: [],
    nonce: String(Date.now()),
  };

  const url = `${chainwebApi}/chainweb/0.0/${networkId}/chain/${chainId}/pact/api/v1/local`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Chain query failed: ${res.status}`);
  const data = await res.json() as {
    result?: {
      status: string;
      data?: { status?: string; 'seconds-left'?: number; 'needs-renewal'?: boolean };
    };
  };

  if (data.result?.status !== 'success' || !data.result.data) {
    return { status: 'not-found', secondsLeft: -1, needsRenewal: true };
  }

  const d = data.result.data;
  return {
    status:       (d.status ?? 'not-found') as ExpiryStatus,
    secondsLeft:  d['seconds-left'] ?? -1,
    needsRenewal: d['needs-renewal'] ?? true,
  };
}

export function KoreidExpiryBanner({
  account,
  level = 'basic',
  chainwebApi,
  networkId,
  chainId,
  onRenew,
  pollMs = 60_000,
}: KoreidExpiryBannerProps) {
  const [state, setState] = useState<ExpiryResult>({
    status: 'loading',
    secondsLeft: 0,
    needsRenewal: false,
  });
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    try {
      const result = await queryExpiryStatus(account, level, chainwebApi, networkId, chainId);
      setState(result);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [account, level, chainwebApi, networkId, chainId]);

  useEffect(() => {
    check();
    const id = setInterval(check, pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  if (state.status === 'loading') return null;
  if (error) return null; // silent fail — contract may not be deployed

  const { status, secondsLeft, needsRenewal } = state;
  const days  = daysLeft(secondsLeft);
  const hours = hoursLeft(secondsLeft);

  if (status === 'not-found') return null;

  return (
    <div className={`koreid-expiry-banner koreid-expiry-${status}`}>
      <div className="koreid-expiry-info">
        <span className="koreid-expiry-icon">
          {status === 'expired'        ? '🚫' :
           status === 'expiring-soon'  ? '⚠️' : '✓'}
        </span>
        <div className="koreid-expiry-text">
          <strong>
            {status === 'expired'       ? 'K-oreID Expired' :
             status === 'expiring-soon' ? 'K-oreID Expiring Soon' :
             'K-oreID Valid'}
          </strong>
          <span>
            {status === 'expired'
              ? 'Your identity verification has expired. Re-verify to continue.'
              : status === 'expiring-soon'
                ? `Expires in ${days > 0 ? `${days}d ${hours}h` : `${hours}h`} — renew before it expires.`
                : `Valid for ${days} day${days !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
      {needsRenewal && onRenew && (
        <button className="koreid-expiry-btn" onClick={onRenew}>
          {status === 'expired' ? 'Re-verify Now' : 'Renew'}
        </button>
      )}
    </div>
  );
}
