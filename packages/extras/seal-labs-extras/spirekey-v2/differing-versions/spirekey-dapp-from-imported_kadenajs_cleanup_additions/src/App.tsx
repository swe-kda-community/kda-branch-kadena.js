import { ConnectStep } from './components/ConnectStep';
import { FundStep } from './components/FundStep';
import { StatusBar } from './components/StatusBar';
import { TransferStep } from './components/TransferStep';
import { useSpireKey } from './hooks/useSpireKey';
import styles from './App.module.css';

const STEPS = ['Connect', 'Fund', 'Transfer', 'Result'] as const;
const STEP_INDEX: Record<string, number> = {
  connect: 0,
  fund: 1,
  transfer: 2,
  result: 3,
};

export function App() {
  const {
    step,
    account,
    status,
    result,
    handleConnect,
    handleFund,
    handleSkipFund,
    handleTransfer,
    handleReset,
  } = useSpireKey();

  const isLoading = status.kind === 'loading';
  const currentIndex = STEP_INDEX[step];

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>SpireKey dApp</span>
        </div>
        <span className={styles.badge}>testnet04</span>
      </header>

      {/* Step progress */}
      <nav className={styles.stepper} aria-label="Steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`${styles.stepDot} ${
              i < currentIndex
                ? styles.done
                : i === currentIndex
                  ? styles.active
                  : styles.pending
            }`}
          >
            <span className={styles.dotCircle}>{i < currentIndex ? '✓' : i + 1}</span>
            <span className={styles.dotLabel}>{label}</span>
          </div>
        ))}
      </nav>

      {/* Main card */}
      <main className={styles.card}>
        <StatusBar status={status} />

        {step === 'connect' && (
          <ConnectStep onConnect={handleConnect} isLoading={isLoading} />
        )}

        {step === 'fund' && account && (
          <FundStep
            account={account}
            onFund={handleFund}
            onSkip={handleSkipFund}
            isLoading={isLoading}
          />
        )}

        {step === 'transfer' && account && (
          <TransferStep
            account={account}
            onTransfer={handleTransfer}
            onBack={handleReset}
            isLoading={isLoading}
          />
        )}

        {step === 'result' && (
          <div className={styles.result}>
            <div className={styles.resultIcon}>🎉</div>
            <h2 className={styles.resultTitle}>Transfer complete!</h2>
            <pre className={styles.resultJson}>{result}</pre>
            <button className={styles.resetBtn} onClick={handleReset}>
              Start over
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        Built with{' '}
        <a
          href="https://github.com/kadena-community/spirekey"
          target="_blank"
          rel="noopener noreferrer"
        >
          @kadena/spirekey-sdk
        </a>{' '}
        ·{' '}
        <a
          href="https://docs.kadena.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Kadena Docs
        </a>
      </footer>
    </div>
  );
}
