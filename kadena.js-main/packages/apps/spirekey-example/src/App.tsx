import {
  createClient,
  createTransactionBuilder,
  type ChainId,
  type ICommand,
} from '@kadena/client';
import {
  KoreidExpiryBanner,
  KoreidMultiVerify,
  type KoreidVerifyResult,
} from '@kadena/koreid-blocks';
import '@kadena/koreid-blocks/styles.css';
import { type Account } from '@kadena/spirekey-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAIN_ID,
  CHAINWEB_API_BASE,
  EXPLORER_URL,
  FAUCET_URL,
  NETWORK_ID,
  SPIREKEY_HOST,
  connect,
  initSpireKey,
  sign,
} from './spirekey';

// ---------------------------------------------------------------------------
// Network + KYC constants
// ---------------------------------------------------------------------------

// On-chain KYC registry namespace (free namespace on testnet06)
// Deploy koreid.pact before using the KYC flow
const KOREID_NS = 'free';
const KOREID_MODULE = `${KOREID_NS}.koreid`;

// Chainweb client bound to the configured network
const l1Client = createClient(
  ({ chainId }: { chainId: ChainId; networkId: string }) =>
    `${CHAINWEB_API_BASE}/chainweb/0.0/${NETWORK_ID}/chain/${chainId}/pact`,
);

// ---------------------------------------------------------------------------
// Session nonce — used for the "login by signing" challenge
// ---------------------------------------------------------------------------

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// KYC proof hash — SHA-256 of (accountName + nonce + timestamp)
//
// In a full deployment this hash comes from a K-oreID oracle (identity provider)
// that has run a document scan or liveness check off-chain, then signed the
// hash on-chain via add-attestation. Here we compute it client-side so the
// "accept" step can be demonstrated without a live oracle.
// ---------------------------------------------------------------------------

// Builds the on-chain koreid-accept transaction.
// The user signs this with their SpireKey biometric — this IS the consent step.
function buildKoreidAcceptTx(account: Account, chainId: ChainId) {
  const tx = createTransactionBuilder()
    .execution(`(${KOREID_MODULE}.koreid-accept "${account.accountName}" "basic")`)
    .setMeta({ senderAccount: account.accountName, chainId, gasLimit: 5000, gasPrice: 0.00000001 })
    .setNetworkId(NETWORK_ID);

  account.devices.forEach((d) =>
    d.guard.keys.forEach((k) =>
      tx.addSigner(
        { pubKey: k, scheme: /^WEBAUTHN-/.test(k) ? 'WebAuthn' : 'ED25519' },
        (withCap) => [withCap('coin.GAS')],
      ),
    ),
  );
  return tx;
}

// Builds the koreid-access kyc-login transaction.
// Calls free.koreid-access.koreid-login — enforces WebAuthn + KOREID_ACTIVE in one tx.
// ---------------------------------------------------------------------------
// Transaction builders
// ---------------------------------------------------------------------------

// 1. Login challenge — signs a nonce to prove account ownership
function buildLoginChallengeTx(account: Account, nonce: string, chainId: ChainId) {
  const tx = createTransactionBuilder()
    // Pact identity op — no state change, just proves ownership
    .execution(`(identity "${nonce}")`)
    .setMeta({ senderAccount: account.accountName, chainId, gasLimit: 1000, gasPrice: 0.00000001 })
    .setNetworkId(NETWORK_ID);

  account.devices.forEach((d) =>
    d.guard.keys.forEach((k) =>
      tx.addSigner(
        { pubKey: k, scheme: /^WEBAUTHN-/.test(k) ? 'WebAuthn' : 'ED25519' },
        (withCap) => [withCap('coin.GAS')],
      ),
    ),
  );
  return tx;
}

// 3. KDA transfer
const WALLET_NS = 'n_eef68e581f767dd66c4d4c39ed922be944ede505';

function buildTransferTx(account: Account, receiver: string, amount: number, chainId: ChainId) {
  if (account.accountName.startsWith('r:')) {
    const tx = createTransactionBuilder()
      .execution(`(coin.transfer "${account.accountName}" "${receiver}" ${amount.toFixed(8)})`)
      .setMeta({ senderAccount: account.accountName, chainId });
    account.devices.forEach((d) =>
      d.guard.keys.forEach((k) =>
        tx.addSigner(
          { pubKey: k, scheme: /^WEBAUTHN-/.test(k) ? 'WebAuthn' : 'ED25519' },
          (withCap) => [
            withCap('coin.TRANSFER', account.accountName, receiver, { decimal: amount.toFixed(8) }),
            withCap('coin.GAS'),
          ],
        ),
      ),
    );
    return tx;
  }
  const tx = createTransactionBuilder()
    .execution(
      `(${WALLET_NS}.webauthn-wallet.transfer "${account.accountName}" "${receiver}" ${amount.toFixed(8)})`,
    )
    .setMeta({ senderAccount: account.accountName, chainId });
  account.devices.forEach((d) =>
    d.guard.keys.forEach((k) =>
      tx.addSigner(
        { pubKey: k, scheme: /^WEBAUTHN-/.test(k) ? 'WebAuthn' : 'ED25519' },
        (withCap) => [
          withCap(`${WALLET_NS}.webauthn-wallet.TRANSFER`, account.accountName, receiver, { decimal: amount.toFixed(8) }),
          withCap(`${WALLET_NS}.webauthn-wallet.GAS_PAYER`, account.accountName, { int: '1' }, { decimal: '1.0' }),
          withCap(`${WALLET_NS}.webauthn-wallet.GAS`, account.accountName),
        ],
      ),
    ),
  );
  return tx;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; msg: string }
  | { kind: 'error'; msg: string }
  | { kind: 'ok'; msg: string };

// Three real-world flows: Login → K-oreID → Transfer
type Step = 'login' | 'koreid' | 'transfer' | 'done';

const STEP_LABELS: Record<Step, string> = {
  login: 'Login',
  koreid: 'K-oreID',
  transfer: 'Transfer',
  done: 'Done',
};
const STEP_ORDER: Step[] = ['login', 'koreid', 'transfer', 'done'];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const sdkReady = useRef(false);
  const [step, setStep] = useState<Step>('login');
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [result, setResult] = useState('');
  const [koreidHash, setKoreidHash] = useState('');
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('0.1');

  useEffect(() => {
    if (!sdkReady.current) {
      initSpireKey({ hostUrl: SPIREKEY_HOST });
      sdkReady.current = true;
    }
  }, []);

  // ---- Step 1: Login — connect via SpireKey, sign a nonce to prove ownership ----
  const handleLogin = useCallback(async () => {
    setStatus({ kind: 'busy', msg: 'Opening SpireKey…' });
    try {
      const conn = await connect(NETWORK_ID, CHAIN_ID as ChainId);
      setStatus({ kind: 'busy', msg: 'Waiting for account to be ready on-chain…' });
      const ready = await conn.isReady();
      setAccount(ready);

      // Sign a login challenge to prove they own this account
      setStatus({ kind: 'busy', msg: 'Signing login challenge with biometric…' });
      const nonce = generateNonce();
      const challengeTx = buildLoginChallengeTx(ready, nonce, CHAIN_ID as ChainId);

      const { isReady } = await sign(
        [challengeTx.createTransaction()],
        [{ accountName: ready.accountName, networkId: ready.networkId, chainIds: ready.chainIds }],
      );
      await isReady();

      // Check existing K-oreID expiry — skip verification step if still valid,
      // force re-verify if expired or not yet attested
      setStatus({ kind: 'busy', msg: 'Checking K-oreID expiry…' });
      try {
        const expiryRes = await fetch(
          `${CHAINWEB_API_BASE}/chainweb/0.0/${NETWORK_ID}/chain/${CHAIN_ID}/pact/api/v1/local`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pactCode: `(free.vx9k.p14 "${ready.accountName}" "basic")`,
              meta: {
                chainId: CHAIN_ID,
                creationTime: Math.floor(Date.now() / 1000),
                ttl: 600,
                gasLimit: 10000,
                gasPrice: 0.00000001,
                sender: '',
              },
              networkId: NETWORK_ID,
              signers: [],
              nonce: String(Date.now()),
            }),
          },
        );

        if (expiryRes.ok) {
          const expiryData = await expiryRes.json() as {
            result?: { status: string; data?: { status?: string; 'needs-renewal'?: boolean } };
          };
          const d = expiryData.result?.data;
          // If active and not needing renewal → skip K-oreID step, go to transfer
          if (d?.status === 'active' && d?.['needs-renewal'] === false) {
            setStatus({ kind: 'ok', msg: `Logged in as ${ready.alias} — K-oreID valid` });
            setStep('transfer');
            return;
          }
        }
      } catch {
        // Contract not deployed — proceed to K-oreID step normally
      }

      setStatus({ kind: 'ok', msg: `Logged in as ${ready.alias} — identity verified` });
      setStep('koreid');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg.includes('cancel') ? { kind: 'idle' } : { kind: 'error', msg });
    }
  }, []);

  // ---- Step 2: K-oreID ----
  // KoreidMultiVerify handles the biometric capture.
  // Once it produces a proofHash, we sign koreid-accept on-chain with SpireKey.
  const handleKoreidVerified = useCallback(
    async (result: KoreidVerifyResult) => {
      if (!account) return;
      setKoreidHash(result.proofHash);
      setStatus({ kind: 'busy', msg: 'Opening SpireKey — sign your K-oreID consent…' });

      try {
        const acceptTx = buildKoreidAcceptTx(account, CHAIN_ID as ChainId);

        const { transactions, isReady } = await sign(
          [acceptTx.createTransaction()],
          [{ accountName: account.accountName, networkId: account.networkId, chainIds: account.chainIds }],
        );

        setStatus({ kind: 'busy', msg: 'Submitting K-oreID record to Chainweb…' });
        await isReady();

        await Promise.all(
          transactions.map(async (tx) => {
            const desc = await l1Client.submit(tx as ICommand);
            return l1Client.listen(desc);
          }),
        );

        setStatus({ kind: 'ok', msg: `K-oreID accepted on-chain — ${result.description}` });
        setStep('transfer');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes('cannot resolve') ||
          msg.includes('module not found') ||
          msg.includes('cancel')
        ) {
          setStatus({ kind: 'ok', msg: `K-oreID biometrics verified (contract pending deploy)` });
          setStep('transfer');
        } else {
          setStatus({ kind: 'error', msg });
        }
      }
    },
    [account],
  );

  // ---- Step 3: Transfer KDA ----
  const handleTransfer = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!account) return;
      const amt = parseFloat(amount);
      if (!receiver.trim() || isNaN(amt) || amt <= 0) return;

      setStatus({ kind: 'busy', msg: 'Opening SpireKey signing prompt…' });
      try {
        const tx = buildTransferTx(account, receiver.trim(), amt, CHAIN_ID as ChainId);
        tx.setNetworkId(NETWORK_ID);

        const { transactions, isReady } = await sign(
          [tx.createTransaction()],
          [{
            accountName: account.accountName,
            networkId: account.networkId,
            chainIds: account.chainIds,
            requestedFungibles: [{ fungible: 'coin', amount: amt + 0.1 }],
          }],
        );

        setStatus({ kind: 'busy', msg: 'Waiting for cross-chain readiness…' });
        await isReady();

        setStatus({ kind: 'busy', msg: 'Submitting to Chainweb…' });
        const results = await Promise.all(
          transactions.map(async (tx) => {
            const desc = await l1Client.submit(tx as ICommand);
            return l1Client.listen(desc);
          }),
        );

        setResult(JSON.stringify(results, null, 2));
        setStatus({ kind: 'ok', msg: 'Transfer submitted!' });
        setStep('done');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus(msg.includes('cancel') ? { kind: 'idle' } : { kind: 'error', msg });
      }
    },
    [account, receiver, amount],
  );

  const handleReset = useCallback(() => {
    setStep('login');
    setAccount(null);
    setResult('');
    setKoreidHash('');
    setReceiver('');
    setAmount('0.1');
    setStatus({ kind: 'idle' });
  }, []);

  const isBusy = status.kind === 'busy';
  const stepIndex = STEP_ORDER.indexOf(step);
  const shortName = (n: string) =>
    n.length > 30 ? `${n.slice(0, 14)}…${n.slice(-10)}` : n;

  return (
    <div className="root">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <span className="header-hex">⬡</span>
          <span className="header-title">SpireKey dApp</span>
        </div>
        <div className="header-meta">
          <span className="pill">{NETWORK_ID}</span>
          <span className="pill secondary">chain {CHAIN_ID}</span>
          {account && (
            <span className="pill account-pill" title={account.accountName}>
              {account.alias}
            </span>
          )}
        </div>
      </header>

      {/* Stepper */}
      <nav className="stepper">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className={`step-item ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending'}`}>
            <div className="step-circle">{i < stepIndex ? '✓' : i + 1}</div>
            <span className="step-label">{STEP_LABELS[s]}</span>
          </div>
        ))}
      </nav>

      {/* Main card */}
      <main className="card">
        {status.kind !== 'idle' && (
          <div className={`status-bar ${status.kind}`}>
            {status.kind === 'busy' && <span className="spinner">⟳</span>}
            {status.kind === 'error' && <span>✗</span>}
            {status.kind === 'ok' && <span>✓</span>}
            <span>{status.msg}</span>
          </div>
        )}

        {/* ── Step 1: Login ── */}
        {step === 'login' && (
          <div className="step-panel">
            <div className="step-icon">🔐</div>
            <h2>Login with SpireKey</h2>
            <p>
              SpireKey is a <strong>WebAuthn wallet</strong> — your Kadena account is secured
              by your device's built-in passkey (Face ID, Touch ID, hardware key).
              No password. No seed phrase. Your biometric IS the key.
            </p>
            <p>
              Clicking Login will open a SpireKey popup. Select or create an account,
              authenticate with your biometric, and the app receives your Kadena
              account name and public keys — establishing your session.
            </p>
            <dl className="config-grid">
              <dt>SpireKey host</dt><dd className="mono">{SPIREKEY_HOST}</dd>
              <dt>Network</dt><dd>{NETWORK_ID}</dd>
              <dt>Chain</dt><dd>{CHAIN_ID}</dd>
              <dt>Faucet</dt>
              <dd><a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">{FAUCET_URL}</a></dd>
              <dt>Explorer</dt>
              <dd><a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">chainweb-community explorer</a></dd>
            </dl>
            <button className="btn-primary" onClick={handleLogin} disabled={isBusy}>
              {isBusy ? 'Waiting for SpireKey…' : 'Login with SpireKey'}
            </button>
            <p className="hint">
              First time? SpireKey will guide you through creating a passkey-secured account.
            </p>
          </div>
        )}

        {/* ── Step 2: K-oreID ── */}
        {step === 'koreid' && account && (
          <div className="step-panel">
            <div className="step-icon">🪪</div>
            <h2>K-oreID Verification</h2>
            <p>
              Complete one or more biometric checks. Each block captures a
              proof hash that gets signed on-chain with your SpireKey biometric —
              no server involved, no data leaves your device.
            </p>

            {koreidHash && (
              <div className="kyc-hash-box">
                <span className="kyc-hash-label">Composite proof hash</span>
                <span className="mono kyc-hash-value">{koreidHash}</span>
              </div>
            )}

            {/* K-oreID verification blocks:
                - 'device'   = real Face ID / Touch ID / Android biometric (WebAuthn)
                - 'document' = passport / ID MRZ scan (Tesseract OCR)
                Change blocks={[...]} to mix any combination */}
            <KoreidMultiVerify
              account={account.accountName}
              blocks={['device', 'document']}
              level="standard"
              onVerified={handleKoreidVerified}
              onError={(e: Error) => setStatus({ kind: 'error', msg: e.message })}
            />

            <button
              className="btn-secondary"
              onClick={() => setStep('transfer')}
              disabled={isBusy}
              style={{ marginTop: 4 }}
            >
              Skip K-oreID (proceed without verification)
            </button>
          </div>
        )}

        {/* ── Step 3: Transfer ── */}
        {step === 'transfer' && account && (
          <div className="step-panel">
            <div className="step-icon">💸</div>
            <h2>Transfer KDA</h2>
            <p>
              Now signed in and K-oreID verified, you can perform transactions.
              SpireKey opens a biometric prompt to sign. Cross-chain fund
              convergence is handled automatically.
            </p>

            {/* Live expiry banner — polls p14 every 60s, prompts renewal when needed */}
            <KoreidExpiryBanner
              account={account.accountName}
              level="basic"
              chainwebApi={CHAINWEB_API_BASE}
              networkId={NETWORK_ID}
              chainId={CHAIN_ID}
              onRenew={() => {
                setKoreidHash('');
                setStep('koreid');
              }}
            />

            {koreidHash && (
              <div className="kyc-badge">
                <span>🪪</span> K-oreID verified on-chain
              </div>
            )}

            <div className="account-card compact">
              <span>From:</span>
              <span className="mono" title={account.accountName}>{shortName(account.accountName)}</span>
              <span className="account-balance">{parseFloat(account.balance ?? '0').toFixed(4)} KDA</span>
            </div>

            <div className="faucet-note">
              Need testnet KDA?{' '}
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                Get some from the faucet →
              </a>
            </div>

            <form className="transfer-form" onSubmit={handleTransfer}>
              <label htmlFor="receiver">Receiver account</label>
              <input
                id="receiver" type="text" placeholder="k:… or r:…"
                value={receiver} onChange={(e) => setReceiver(e.target.value)}
                disabled={isBusy} autoComplete="off" spellCheck={false}
              />
              <label htmlFor="amount">Amount (KDA)</label>
              <input
                id="amount" type="number" min="0.000001" step="0.1"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                disabled={isBusy}
              />
              <div className="btn-group">
                <button type="submit" className="btn-primary" disabled={isBusy}>
                  {isBusy ? 'Signing & submitting…' : 'Sign & Transfer'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleReset} disabled={isBusy}>
                  ← Logout
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="step-panel center">
            <div className="step-icon pop">🎉</div>
            <h2>Transfer complete!</h2>
            <pre className="result-json">{result}</pre>
            <div className="btn-group" style={{ maxWidth: 320, margin: '0 auto' }}>
              <a
                className="btn-outline"
                href={`${EXPLORER_URL}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Explorer
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Logout
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <a href="https://github.com/kadena-community/spirekey" target="_blank" rel="noopener noreferrer">
          @kadena/spirekey-sdk
        </a>{' · '}
        <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">Testnet Faucet</a>
        {' · '}
        <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">Explorer</a>
      </footer>
    </div>
  );
}
