import { type Account } from '@kadena/spirekey-sdk';
import { useState } from 'react';
import { AccountCard } from './AccountCard';
import styles from './TransferStep.module.css';

interface TransferStepProps {
  account: Account;
  onTransfer: (receiver: string, amount: number) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TransferStep({
  account,
  onTransfer,
  onBack,
  isLoading,
}: TransferStepProps) {
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!receiver.trim()) {
      setError('Receiver account name is required.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    onTransfer(receiver.trim(), amt);
  };

  return (
    <div className={styles.step}>
      <div className={styles.icon}>💸</div>
      <h2 className={styles.title}>Step 3 — Transfer KDA</h2>
      <p className={styles.desc}>
        SpireKey will open a biometric prompt to sign your transfer. Your KDA
        may be spread across multiple chains — SpireKey handles convergence
        automatically.
      </p>

      <AccountCard account={account} />

      <form className={styles.form} onSubmit={handleSubmit} autoComplete="on">
        <label className={styles.label} htmlFor="receiver">
          Receiver account
        </label>
        <input
          id="receiver"
          className={styles.input}
          type="text"
          name="receiver"
          placeholder="k:abc123… or r:abc123…"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
          spellCheck={false}
        />

        <label className={styles.label} htmlFor="amount">
          Amount (KDA)
        </label>
        <input
          id="amount"
          className={styles.input}
          type="number"
          name="amount"
          min="0.000001"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
        />

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing & submitting…' : 'Sign & Transfer'}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </button>
        </div>
      </form>
    </div>
  );
}
