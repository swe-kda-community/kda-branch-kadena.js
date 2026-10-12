import { createTransactionBuilder, type ChainId, type ICommand } from '@kadena/client';
import { type Account, connect, initSpireKey, sign } from '@kadena/spirekey-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { l1Client } from '../client';
import { CHAIN_ID, NETWORK_ID, SPIREKEY_HOST } from '../env';

export type Step = 'connect' | 'fund' | 'transfer' | 'result';

export type AppStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string };

const WALLET_NS = 'n_eef68e581f767dd66c4d4c39ed922be944ede505';

function buildTransferTx({
  account,
  receiver,
  amount,
  chainId,
}: {
  account: Account;
  receiver: string;
  amount: number;
  chainId: ChainId;
}) {
  // r: accounts use the standard coin.transfer
  if (account.accountName.startsWith('r:')) {
    const tx = createTransactionBuilder()
      .execution(`(coin.transfer "${account.accountName}" "${receiver}" ${amount.toFixed(8)})`)
      .setMeta({ senderAccount: account.accountName, chainId });

    account.devices.forEach((device) =>
      device.guard.keys.forEach((key) =>
        tx.addSigner(
          { pubKey: key, scheme: /^WEBAUTHN-/.test(key) ? 'WebAuthn' : 'ED25519' },
          (withCap) => [
            withCap('coin.TRANSFER', account.accountName, receiver, { decimal: amount.toFixed(8) }),
            withCap('coin.GAS'),
          ],
        ),
      ),
    );
    return tx;
  }

  // Legacy webauthn-wallet accounts
  const tx = createTransactionBuilder()
    .execution(
      `(${WALLET_NS}.webauthn-wallet.transfer "${account.accountName}" "${receiver}" ${amount.toFixed(8)})`,
    )
    .setMeta({ senderAccount: account.accountName, chainId });

  account.devices.forEach((device) =>
    device.guard.keys.forEach((key) =>
      tx.addSigner(
        { pubKey: key, scheme: /^WEBAUTHN-/.test(key) ? 'WebAuthn' : 'ED25519' },
        (withCap) => [
          withCap(`${WALLET_NS}.webauthn-wallet.TRANSFER`, account.accountName, receiver, {
            decimal: amount.toFixed(8),
          }),
          withCap(`${WALLET_NS}.webauthn-wallet.GAS_PAYER`, account.accountName, { int: '1' }, { decimal: '1.0' }),
          withCap(`${WALLET_NS}.webauthn-wallet.GAS`, account.accountName),
        ],
      ),
    ),
  );
  return tx;
}

export function useSpireKey() {
  const [step, setStep] = useState<Step>('connect');
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<AppStatus>({ kind: 'idle' });
  const [result, setResult] = useState<string>('');

  // Initialise SpireKey SDK once
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initSpireKey({ hostUrl: SPIREKEY_HOST });
      initialized.current = true;
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setStatus({ kind: 'loading', label: 'Connecting via SpireKey…' });
    try {
      const connected = await connect(NETWORK_ID, CHAIN_ID as ChainId);
      const ready = await connected.isReady();
      setAccount(ready);
      setStatus({ kind: 'idle' });
      setStep('fund');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('canceled')) {
        setStatus({ kind: 'idle' });
      } else {
        setStatus({ kind: 'error', message: msg });
      }
    }
  }, []);

  const handleFund = useCallback(async () => {
    if (!account) return;
    setStatus({ kind: 'loading', label: 'Requesting testnet faucet…' });
    try {
      const res = await fetch(
        'https://faucet.testnet.chainweb.com/coin/fund-account',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: account.accountName,
            chainId: CHAIN_ID,
            amount: 20,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Faucet request failed');
      setAccount((prev) =>
        prev ? { ...prev, balance: '20.00000000' } : prev,
      );
      setStatus({ kind: 'success', message: 'Account funded with 20 KDA (testnet).' });
      setStep('transfer');
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [account]);

  const handleTransfer = useCallback(
    async (receiver: string, amount: number) => {
      if (!account) return;
      setStatus({ kind: 'loading', label: 'Signing transaction with SpireKey…' });
      try {
        const tx = buildTransferTx({ account, receiver, amount, chainId: CHAIN_ID as ChainId });
        tx.setNetworkId(NETWORK_ID);

        const { transactions, isReady } = await sign(
          [tx.createTransaction()],
          [
            {
              accountName: account.accountName,
              networkId: account.networkId,
              chainIds: account.chainIds,
              requestedFungibles: [{ fungible: 'coin', amount: amount + 0.1 }],
            },
          ],
        );

        setStatus({ kind: 'loading', label: 'Waiting for account readiness…' });
        await isReady();

        setStatus({ kind: 'loading', label: 'Submitting transaction…' });
        const results = await Promise.all(
          transactions.map(async (signedTx) => {
            const descriptor = await l1Client.submit(signedTx as ICommand);
            return l1Client.listen(descriptor);
          }),
        );

        setResult(JSON.stringify(results, null, 2));
        setStatus({ kind: 'success', message: 'Transfer complete!' });
        setStep('result');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('canceled')) {
          setStatus({ kind: 'error', message: msg });
        } else {
          setStatus({ kind: 'idle' });
        }
      }
    },
    [account],
  );

  const handleSkipFund = useCallback(() => {
    setStatus({ kind: 'idle' });
    setStep('transfer');
  }, []);

  const handleReset = useCallback(() => {
    setStep('connect');
    setAccount(null);
    setResult('');
    setStatus({ kind: 'idle' });
  }, []);

  return {
    step,
    account,
    status,
    result,
    handleConnect,
    handleFund,
    handleSkipFund,
    handleTransfer,
    handleReset,
  };
}
