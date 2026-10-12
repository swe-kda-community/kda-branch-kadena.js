import { CHAIN_ID, NETWORK_ID, SPIREKEY_HOST } from '../env';
import styles from './ConnectStep.module.css';

interface ConnectStepProps {
  onConnect: () => void;
  isLoading: boolean;
}

export function ConnectStep({ onConnect, isLoading }: ConnectStepProps) {
  return (
    <div className={styles.step}>
      <div className={styles.icon}>🔐</div>
      <h2 className={styles.title}>Step 1 — Connect your account</h2>
      <p className={styles.desc}>
        SpireKey uses your device's built-in biometrics (Face ID, Touch ID,
        or hardware security key) to sign Kadena transactions — no seed phrase
        required.
      </p>

      <dl className={styles.config}>
        <dt>Network</dt>
        <dd>{NETWORK_ID}</dd>
        <dt>Chain</dt>
        <dd>{CHAIN_ID}</dd>
        <dt>SpireKey host</dt>
        <dd className={styles.mono}>{SPIREKEY_HOST}</dd>
      </dl>

      <button
        className={styles.btn}
        onClick={onConnect}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Waiting for SpireKey…' : 'Connect with SpireKey'}
      </button>

      <p className={styles.hint}>
        A SpireKey popup will open. Select or create an account, then
        authenticate with your biometric.
      </p>
    </div>
  );
}
