import { type Account } from '@kadena/spirekey-sdk';
import { AccountCard } from './AccountCard';
import styles from './FundStep.module.css';

interface FundStepProps {
  account: Account;
  onFund: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function FundStep({ account, onFund, onSkip, isLoading }: FundStepProps) {
  const hasBalance = parseFloat(account.balance ?? '0') > 0;

  return (
    <div className={styles.step}>
      <div className={styles.icon}>💧</div>
      <h2 className={styles.title}>Step 2 — Fund your account</h2>
      <p className={styles.desc}>
        Your account needs KDA to pay for transaction gas. On testnet you can
        use the faucet to receive 20 KDA instantly.
      </p>

      <AccountCard account={account} />

      {hasBalance ? (
        <p className={styles.note}>
          ✓ You already have a balance. You can skip funding and proceed to transfer.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.btnPrimary}
          onClick={onFund}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Requesting faucet…' : 'Fund via Testnet Faucet'}
        </button>
        <button
          className={styles.btnSecondary}
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip — I already have KDA
        </button>
      </div>
    </div>
  );
}
