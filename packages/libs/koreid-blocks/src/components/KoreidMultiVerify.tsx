/**
 * KoreidMultiVerify
 *
 * Orchestrates multiple verification blocks in sequence.
 * Each required block must pass before the composite proof hash is produced.
 *
 * Usage:
 *   <KoreidMultiVerify
 *     account="k:abc..."
 *     blocks={['face', 'document']}
 *     level="standard"
 *     onVerified={(result) => submitToKoreid(result)}
 *   />
 *
 * The final proofHash is a SHA-256 of all individual hashes combined —
 * so it captures multi-modal verification in a single value for the oracle.
 */
import { useCallback, useState } from 'react';
import { buildProofHash } from '../utils/hash';
import { KoreidDeviceAuth } from './device/KoreidDeviceAuth';
import { KoreidDocVerify } from './KoreidDocVerify';
import { KoreidFaceLiveness } from './camera/KoreidFaceLiveness';
import { KoreidPalmVerify } from './camera/KoreidPalmVerify';
import { KoreidEarVerify } from './camera/KoreidEarVerify';
import type { KoreidBlockProps, KoreidMethod, KoreidVerifyResult } from '../utils/types';
import '../styles/block.css';

export interface KoreidMultiVerifyProps extends KoreidBlockProps {
  /** Ordered list of verification methods to require */
  blocks: KoreidMethod[];
  /** K-oreID level this multi-check targets */
  level?: 'basic' | 'standard' | 'enhanced';
}

const BLOCK_LABELS: Record<KoreidMethod, { icon: string; label: string }> = {
  device:   { icon: '🔐', label: 'Face ID / Touch ID' },
  face:     { icon: '👤', label: 'Face Liveness (camera)' },
  document: { icon: '🪪', label: 'ID Document' },
  palm:     { icon: '✋', label: 'Palm (camera)' },
  ear:      { icon: '👂', label: 'Ear (camera)' },
  multi:    { icon: '🔐', label: 'Multi-Factor' },
};

export function KoreidMultiVerify({
  account,
  blocks,
  level = 'standard',
  onVerified,
  onError,
  className = '',
}: KoreidMultiVerifyProps) {
  const [completed, setCompleted] = useState<KoreidVerifyResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finalising, setFinalising] = useState(false);

  const handleBlockVerified = useCallback(
    async (result: KoreidVerifyResult) => {
      const next = [...completed, result];
      setCompleted(next);

      if (next.length >= blocks.length) {
        // All blocks done — combine into single hash
        setFinalising(true);
        try {
          const combinedHash = await buildProofHash(account, 'multi', {
            level,
            methods: next.map((r) => r.method),
            hashes: next.map((r) => r.proofHash),
            count: next.length,
          });
          onVerified({
            proofHash: combinedHash,
            method: 'multi',
            capturedAt: Date.now(),
            description: `Multi-factor K-oreID (${level}): ${next.map((r) => r.method).join(' + ')}`,
          });
        } catch (e) {
          onError?.(e instanceof Error ? e : new Error(String(e)));
        } finally {
          setFinalising(false);
        }
      } else {
        setCurrentIdx(next.length);
      }
    },
    [completed, blocks.length, account, level, onVerified, onError],
  );

  const currentMethod = blocks[currentIdx];

  const blockProps: KoreidBlockProps = {
    account,
    onVerified: handleBlockVerified,
    onError,
  };

  return (
    <div className={`koreid-multi ${className}`}>
      {/* Progress trail */}
      <div className="koreid-multi-trail">
        {blocks.map((method, i) => {
          const info = BLOCK_LABELS[method];
          const done = i < completed.length;
          const active = i === currentIdx && !finalising;
          return (
            <div
              key={`${method}-${i}`}
              className={`koreid-trail-item ${done ? 'done' : active ? 'active' : 'pending'}`}
            >
              <div className="koreid-trail-circle">
                {done ? '✓' : info.icon}
              </div>
              <span className="koreid-trail-label">{info.label}</span>
            </div>
          );
        })}
      </div>

      {/* Completed items */}
      {completed.length > 0 && (
        <div className="koreid-completed-list">
          {completed.map((r, i) => (
            <div key={i} className="koreid-completed-item">
              <span>{BLOCK_LABELS[r.method].icon} {BLOCK_LABELS[r.method].label}</span>
              <span className="koreid-ok-badge">✓ verified</span>
            </div>
          ))}
        </div>
      )}

      {/* Active block */}
      {!finalising && currentIdx < blocks.length && (
        <div className="koreid-active-block">
          {currentMethod === 'device'   && <KoreidDeviceAuth   {...blockProps} />}
          {currentMethod === 'face'     && <KoreidFaceLiveness {...blockProps} />}
          {currentMethod === 'document' && <KoreidDocVerify    {...blockProps} />}
          {currentMethod === 'palm'     && <KoreidPalmVerify   {...blockProps} />}
          {currentMethod === 'ear'      && <KoreidEarVerify    {...blockProps} />}
        </div>
      )}

      {finalising && (
        <div className="koreid-finalising">
          <span className="koreid-spinner">⟳</span>
          Combining proofs into composite hash…
        </div>
      )}
    </div>
  );
}
