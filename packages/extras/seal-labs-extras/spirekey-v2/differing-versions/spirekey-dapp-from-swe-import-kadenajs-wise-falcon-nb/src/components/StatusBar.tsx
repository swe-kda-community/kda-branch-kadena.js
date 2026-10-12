import { type AppStatus } from '../hooks/useSpireKey';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  status: AppStatus;
}

export function StatusBar({ status }: StatusBarProps) {
  if (status.kind === 'idle') return null;

  const cls =
    status.kind === 'loading'
      ? styles.loading
      : status.kind === 'error'
        ? styles.error
        : styles.success;

  const icon =
    status.kind === 'loading' ? '⟳' : status.kind === 'error' ? '✗' : '✓';

  const text =
    status.kind === 'loading'
      ? status.label
      : status.kind === 'error'
        ? status.message
        : status.message;

  return (
    <div className={`${styles.bar} ${cls}`}>
      <span className={status.kind === 'loading' ? styles.spin : ''}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
