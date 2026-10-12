import { type Account } from '@kadena/spirekey-sdk';
import styles from './AccountCard.module.css';

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const shortName =
    account.accountName.length > 24
      ? `${account.accountName.slice(0, 12)}…${account.accountName.slice(-8)}`
      : account.accountName;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>🔑</span>
        <div>
          <p className={styles.label}>Connected account</p>
          <p className={styles.name} title={account.accountName}>
            {shortName}
          </p>
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{account.networkId}</span>
        <span className={styles.balance}>{parseFloat(account.balance ?? '0').toFixed(4)} KDA</span>
      </div>
    </div>
  );
}
