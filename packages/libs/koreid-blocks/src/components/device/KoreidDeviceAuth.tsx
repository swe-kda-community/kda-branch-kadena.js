/**
 * KoreidDeviceAuth — Face Scan
 *
 * Face biometric verification using the device's native biometric sensor.
 * On iPhone this triggers Face ID / Touch ID via the Secure Enclave.
 * On Android this triggers fingerprint or face unlock via the TEE.
 *
 * Uses navigator.credentials (WebAuthn) — the same API SpireKey uses
 * for transaction signing. Independent credential from palm and ear blocks.
 */
import { useCallback, useEffect, useState } from 'react';
import { detectBiometricLabel, webAuthnVerify } from '../../utils/webauthn';
import type { KoreidBlockProps } from '../../utils/types';
import '../../styles/block.css';

type Phase = 'idle' | 'busy' | 'done' | 'error' | 'unsupported';

export function KoreidDeviceAuth({
  account,
  onVerified,
  onError,
  className = '',
}: KoreidBlockProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Device Biometric');

  useEffect(() => {
    detectBiometricLabel().then(setDeviceLabel);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setPhase('unsupported');
      setMsg('WebAuthn not supported — use Safari on iOS or Chrome on Android.');
      return;
    }

    setPhase('busy');
    setMsg(`Verifying face with ${deviceLabel}…`);

    try {
      const { result } = await webAuthnVerify({
        account,
        method: 'device',
        label: 'Face Scan',
        description: `Face biometric verified via ${deviceLabel}`,
      });

      setPhase('done');
      setMsg(`Face verified with ${deviceLabel} ✓`);
      onVerified(result);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === 'NotAllowedError') {
        setPhase('idle');
        setMsg('Cancelled — tap to try again.');
      } else {
        setPhase('error');
        setMsg(err.message);
        onError?.(err);
      }
    }
  }, [account, deviceLabel, onVerified, onError]);

  return (
    <div className={`koreid-block ${className}`}>
      <div className="koreid-block-header">
        <span className="koreid-block-icon">🔐</span>
        <div>
          <h3>Face Scan</h3>
          <p>Verified with {deviceLabel}</p>
        </div>
      </div>

      <div className="koreid-device-info">
        <div className="koreid-device-row">
          <span className="koreid-device-icon">🔒</span>
          <div>
            <strong>Secure Enclave / TEE</strong>
            <span>
              Private key never leaves the device chip — same as Apple Pay,
              SpireKey, and Google Pay.
            </span>
          </div>
        </div>
        <div className="koreid-device-row">
          <span className="koreid-device-icon">⬡</span>
          <div>
            <strong>ES256 — Kadena compatible</strong>
            <span>
              Same ECDSA P-256 algorithm as SpireKey. Two independent
              biometric challenges: K-oreID verification + SpireKey signing.
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <p className={`koreid-msg ${phase === 'error' || phase === 'unsupported' ? 'error' : phase === 'done' ? 'ok' : ''}`}>
          {phase === 'busy' && <span className="koreid-spinner">⟳ </span>}
          {msg}
        </p>
      )}

      <div className="koreid-actions">
        {(phase === 'idle' || phase === 'error') && (
          <button className="koreid-btn-primary" onClick={handleVerify}>
            Scan Face with {deviceLabel}
          </button>
        )}
        {phase === 'done' && (
          <button
            className="koreid-btn-secondary"
            onClick={() => { setPhase('idle'); setMsg(''); }}
          >
            Verify again
          </button>
        )}
      </div>
    </div>
  );
}
