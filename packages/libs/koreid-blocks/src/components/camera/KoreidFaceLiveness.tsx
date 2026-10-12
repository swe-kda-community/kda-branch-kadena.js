/**
 * KoreidFaceLiveness
 *
 * Face liveness detection with Apple Face ID–style tick ring UI,
 * ported from the KYC biometric-app project.
 *
 * UI features:
 *   - Circular tick ring (72 segments) showing scan progress across 2 passes
 *   - Conic gradient progress border that fills as the scan completes
 *   - Blurred oval video feed inside the target circle
 *   - Liveness checklist (blink / mouth / head turn) with green fill on complete
 *   - "Pass 1 of 2 / Pass 2 of 2" label
 *
 * Biometrics captured:
 *   - Blink detection (eye aspect ratio)
 *   - Mouth open detection (jaw landmark gap)
 *   - Head turn detection (nose yaw relative to baseline)
 *   - Face landmark geometry snapshot at completion
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildProofHash } from '../../utils/hash';
import { loadFaceMesh, startCamera, stopCamera } from '../../utils/camera';
import type { KoreidBlockProps } from '../../utils/types';
import '../../styles/block.css';

const TICK_COUNT    = 72;
const PASS_COUNT    = 2;
const PASS_MS       = 2800;
const TRAIL_LEN     = 8;

const LEFT_EYE  = [33,  160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

type LmPt = { x: number; y: number; z: number };
type Phase = 'idle' | 'loading' | 'scanning' | 'done' | 'error';

interface LivenessState { blink: boolean; mouth: boolean; head: boolean }

export function KoreidFaceLiveness({
  account,
  onVerified,
  onError,
  className = '',
}: KoreidBlockProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);  // landmark overlay
  const frameRef  = useRef<HTMLDivElement>(null);
  const ticksRef  = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef    = useRef(false);

  const [phase, setPhase]   = useState<Phase>('idle');
  const [msg, setMsg]       = useState('');
  const [liveness, setLiveness] = useState<LivenessState>({ blink: false, mouth: false, head: false });
  
  
  const [passLabel, setPassLabel] = useState('Pass 1 of 2');

  const stop = useCallback(() => {
    runRef.current = false;
    if (videoRef.current) stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  // Build tick ring
  function buildTicks() {
    const el = ticksRef.current;
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < TICK_COUNT; i++) {
      const tick = document.createElement('span');
      tick.className = 'koreid-tick';
      // position around circle: rotate around centre, translateY by radius
      const angle = (i / TICK_COUNT) * 360;
      tick.style.transform = `rotate(${angle}deg) translateY(-50%)`;
      tick.style.top = '50%';
      tick.style.marginTop = '-7px';
      tick.dataset.idx = String(i);
      el.appendChild(tick);
    }
  }

  function updateTicks(progress: number, currentPass: number, done: boolean) {
    const el = ticksRef.current;
    if (!el) return;
    const completed = Math.floor(progress * TICK_COUNT);
    const headIdx   = completed % TICK_COUNT;
    const isP2      = currentPass === 2;
    el.querySelectorAll<HTMLElement>('.koreid-tick').forEach((tick, i) => {
      const d = (headIdx - i + TICK_COUNT) % TICK_COUNT;
      tick.classList.toggle('is-complete', i < completed);
      tick.classList.toggle('is-head',     d === 0 && !done);
      tick.classList.toggle('is-trail',    d > 0 && d <= TRAIL_LEN && !done);
      tick.classList.toggle('pass-2',      isP2);
    });
    // Update conic progress ring via CSS variable
    if (frameRef.current) {
      frameRef.current.style.setProperty('--scan-progress', `${progress * 100}%`);
    }
    
    setPassLabel(done ? 'Scan complete' : `Pass ${currentPass} of ${PASS_COUNT}`);
  }

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setPhase('loading');
    setMsg('Loading face detection…');
    buildTicks();
    runRef.current = true;

    const live: LivenessState = { blink: false, mouth: false, head: false };
    const scan = { pass: 1, progress: 0, lastTs: 0, done: false };
    let baselineYaw: number | null = null;
    let baselineSamples = 0;
    let lastLandmarks: LmPt[] | null = null;

    try {
      const [FaceMesh] = await Promise.all([
        loadFaceMesh(),
        startCamera(videoRef.current).then((s) => { streamRef.current = s; }),
      ]);

      // Sync canvas size to video
      if (videoRef.current && canvasRef.current) {
        canvasRef.current.width  = videoRef.current.videoWidth  || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
      }

      setPhase('scanning');
      setMsg('Move your head slowly in a circle');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faceMesh = new (FaceMesh as any)({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1, refineLandmarks: true,
        minDetectionConfidence: 0.55, minTrackingConfidence: 0.55,
      });

      faceMesh.onResults((results: { multiFaceLandmarks?: LmPt[][] }) => {
        if (!runRef.current) return;

        // ── Tick ring animation ──
        const now = performance.now();
        if (!scan.done) {
          if (!scan.lastTs) scan.lastTs = now;
          scan.progress += (now - scan.lastTs) / PASS_MS;
          scan.lastTs = now;
          if (scan.progress >= 1) {
            if (scan.pass === 1) { scan.pass = 2; scan.progress = 0; }
            else                 { scan.progress = 1; scan.done = true; }
          }
          updateTicks(scan.progress, scan.pass, scan.done);
        }

        if (!results.multiFaceLandmarks?.length) {
          setMsg('No face detected — centre your face in the frame');
          return;
        }

        const lm = results.multiFaceLandmarks[0];
        lastLandmarks = lm;

        // ── Liveness checks ──
        const eyeL = [33, 160, 158, 133, 153, 144].map((i) => lm[i]);
        const eyeR = [362, 385, 387, 263, 373, 380].map((i) => lm[i]);
        const earL = calcEAR(eyeL);
        const earR = calcEAR(eyeR);
        if (!live.blink && Math.min(earL, earR) < 0.18) live.blink = true;

        const mTop = lm[13]; const mBot = lm[14];
        if (!live.mouth && mTop && mBot && Math.abs(mTop.y - mBot.y) > 0.025) live.mouth = true;

        const nose = lm[1];
        const eL = lm[33]; const eR = lm[263];
        const eyeDist = eL && eR ? Math.abs(eR.x - eL.x) : 0;
        const faceCX  = eL && eR ? (eL.x + eR.x) / 2 : nose.x;
        const yawRatio = eyeDist > 0 ? (nose.x - faceCX) / eyeDist : 0;
        if (baselineSamples < 20) {
          baselineYaw = baselineYaw === null
            ? yawRatio
            : (baselineYaw * baselineSamples + yawRatio) / (baselineSamples + 1);
          baselineSamples++;
        }
        if (!live.head && baselineYaw !== null && Math.abs(yawRatio - baselineYaw) > 0.14) {
          live.head = true;
        }

        const updated = { ...live };
        setLiveness(updated);

        const allDone = updated.blink && updated.mouth && updated.head && scan.done;

        if (!allDone) {
          const hints = [
            !updated.blink  && 'blink once',
            !updated.mouth  && 'open your mouth',
            !updated.head   && 'turn your head',
          ].filter(Boolean).join(', ');
          setMsg(hints ? `Next: ${hints}` : 'Keep moving your head…');
        } else {
          finalize(lastLandmarks, updated);
        }

        // Draw minimal face dot overlay
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (canvas && video) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(162,100,255,0.6)';
            [1, 33, 263, 61, 291, 199].forEach((idx) => {
              const pt = lm[idx];
              if (!pt) return;
              ctx.beginPath();
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      });

      const sendFrame = async () => {
        if (!runRef.current) return;
        if (videoRef.current) await faceMesh.send({ image: videoRef.current });
        requestAnimationFrame(sendFrame);
      };
      requestAnimationFrame(sendFrame);

    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error'); setMsg(err.message); onError?.(err); stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  function calcEAR(pts: LmPt[]): number {
    if (pts.length < 6) return 1;
    const vert = (Math.abs(pts[1].y - pts[5].y) + Math.abs(pts[2].y - pts[4].y)) / 2;
    const horiz = Math.abs(pts[0].x - pts[3].x);
    return horiz < 0.001 ? 1 : vert / horiz;
  }

  const finalize = useCallback(async (landmarks: LmPt[] | null, live: LivenessState) => {
    stop();
    setPhase('loading');
    setMsg('Generating proof hash…');
    // Mark ring as done
    if (frameRef.current) {
      frameRef.current.classList.add('is-done');
      frameRef.current.style.setProperty('--scan-progress', '100%');
    }
    try {
      const geometry = landmarks
        ? {
            leftEye:  LEFT_EYE.map((i)  => landmarks[i]),
            rightEye: RIGHT_EYE.map((i) => landmarks[i]),
            nose:     landmarks[1],
            chin:     landmarks[152],
          }
        : null;

      const proofHash = await buildProofHash(account, 'face', { geometry, liveness: live });
      setPhase('done');
      setMsg('Face liveness verified ✓');
      onVerified({
        proofHash, method: 'face', capturedAt: Date.now(),
        description: `Liveness: blink ✓ mouth ✓ head turn ✓ — 2-pass scan complete`,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error'); setMsg(err.message); onError?.(err);
    }
  }, [account, onVerified, onError, stop]);

  useEffect(() => () => stop(), [stop]);

  const pct = Number(Number(liveness.blink) + Number(liveness.mouth) + Number(liveness.head)) / 3 * 100;

  return (
    <div className={`koreid-block ${className}`}>
      <div className="koreid-block-header">
        <span className="koreid-block-icon">👤</span>
        <div>
          <h3>Face Liveness</h3>
          <p>Blink · open mouth · turn head · 2-pass ring scan</p>
        </div>
      </div>

      {/* Face ID-style oval + tick ring frame */}
      <div className="koreid-scan-frame" ref={frameRef} style={{ '--scan-progress': '0%' } as React.CSSProperties}>
        <video ref={videoRef} className="koreid-scan-video" playsInline muted />
        <canvas ref={canvasRef} className="koreid-scan-canvas-overlay" />

        {/* Circular target with conic gradient ring */}
        <div className="koreid-face-target">
          {/* Tick ring */}
          <div className="koreid-tick-ring" ref={ticksRef} />
        </div>
      </div>

      {/* Pass label */}
      {phase === 'scanning' && (
        <p className="koreid-scan-pass-label">{passLabel}</p>
      )}

      {/* Liveness checklist */}
      {(phase === 'scanning' || phase === 'loading') && (
        <ul className="koreid-liveness-list">
          <li className={`koreid-liveness-item ${liveness.blink ? 'done' : ''}`}>Blink once</li>
          <li className={`koreid-liveness-item ${liveness.mouth ? 'done' : ''}`}>Open your mouth</li>
          <li className={`koreid-liveness-item ${liveness.head  ? 'done' : ''}`}>Turn your head left or right</li>
        </ul>
      )}

      {/* Progress bar */}
      {phase === 'scanning' && (
        <div className="koreid-progress-bar">
          <div className="koreid-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {msg && (
        <p className={`koreid-msg ${phase === 'error' ? 'error' : phase === 'done' ? 'ok' : ''}`}>
          {phase === 'loading' && <span className="koreid-spinner">⟳ </span>}
          {msg}
        </p>
      )}

      <div className="koreid-actions">
        {phase === 'idle' && (
          <button className="koreid-btn-primary" onClick={start}>Start Face Scan</button>
        )}
        {(phase === 'scanning' || phase === 'loading') && (
          <button className="koreid-btn-secondary" onClick={() => { stop(); setPhase('idle'); setMsg(''); }}>
            Cancel
          </button>
        )}
        {phase === 'error' && (
          <button className="koreid-btn-primary" onClick={start}>Retry</button>
        )}
      </div>
    </div>
  );
}
