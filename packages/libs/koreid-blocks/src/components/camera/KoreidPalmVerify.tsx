/**
 * KoreidPalmVerify
 *
 * Palm print biometric using the device camera.
 *
 * Captures two layers of palm data:
 *
 * 1. PALM PRINT LINES (edge detection)
 *    - Converts the palm region to greyscale
 *    - Applies Sobel edge detection to extract wrinkles, creases, and ridges
 *    - Divides the palm into a 12×12 grid and computes edge density per cell
 *    - This produces a 144-element "palm print vector" similar in principle
 *      to a fingerprint minutiae map — unique per person
 *
 * 2. HAND GEOMETRY (MediaPipe Hands — 21 landmarks)
 *    - Finger length ratios, palm width/length, knuckle angles
 *    - Used as secondary identifier + to locate the palm ROI for step 1
 *
 * Both are combined and SHA-256 hashed for the proof.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildProofHash } from '../../utils/hash';
import { loadHands, startCamera, stopCamera } from '../../utils/camera';
import type { KoreidBlockProps } from '../../utils/types';
import '../../styles/block.css';

// ── MediaPipe Hands landmark indices ──
// 0=wrist, 1-4=thumb, 5-8=index, 9-12=middle, 13-16=ring, 17-20=pinky
const FRAMES_NEEDED  = 8;   // frames to average for stable palm print
const GRID_SIZE      = 12;  // 12×12 = 144-cell edge density grid

// ── Hand geometry ──
function dist2(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function extractHandGeometry(lm: number[][]): Record<string, number> {
  const palmLen = dist2(lm[0], lm[12]) || 1;
  const palmW   = dist2(lm[5], lm[17]) || 1;
  return {
    thumb:       dist2(lm[0],  lm[4])  / palmLen,
    index:       dist2(lm[5],  lm[8])  / palmLen,
    middle:      dist2(lm[9],  lm[12]) / palmLen,
    ring:        dist2(lm[13], lm[16]) / palmLen,
    pinky:       dist2(lm[17], lm[20]) / palmLen,
    palmRatio:   palmW / palmLen,
    thumbSpread: dist2(lm[4],  lm[8])  / palmLen,
  };
}

// ── Palm print — Sobel edge density grid ──
// Extract the palm ROI from the video frame, apply Sobel edge detection,
// divide into GRID_SIZE×GRID_SIZE cells, compute edge density per cell.
// This captures wrinkle and crease line patterns unique to each palm.
function extractPalmPrint(
  video: HTMLVideoElement,
  landmarks: { x: number; y: number }[],
  auxCanvas: HTMLCanvasElement,
): number[] {
  const W = video.videoWidth  || 640;
  const H = video.videoHeight || 480;

  // Bounding box of palm landmarks (wrist + knuckles: 0,5,9,13,17)
  const palmIdx = [0, 5, 9, 13, 17];
  const xs = palmIdx.map((i) => landmarks[i].x * W);
  const ys = palmIdx.map((i) => landmarks[i].y * H);
  const minX = Math.max(0, Math.min(...xs) - 20);
  const minY = Math.max(0, Math.min(...ys) - 20);
  const maxX = Math.min(W, Math.max(...xs) + 20);
  const maxY = Math.min(H, Math.max(...ys) + 20);
  const roiW = Math.max(1, maxX - minX);
  const roiH = Math.max(1, maxY - minY);

  // Draw ROI onto aux canvas
  auxCanvas.width  = roiW;
  auxCanvas.height = roiH;
  const ctx = auxCanvas.getContext('2d')!;
  ctx.drawImage(video, minX, minY, roiW, roiH, 0, 0, roiW, roiH);

  const img = ctx.getImageData(0, 0, roiW, roiH);
  const d   = img.data;

  // Convert to greyscale
  const grey = new Float32Array(roiW * roiH);
  for (let i = 0; i < grey.length; i++) {
    grey[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }

  // Sobel edge magnitude
  const edges = new Float32Array(roiW * roiH);
  for (let y = 1; y < roiH - 1; y++) {
    for (let x = 1; x < roiW - 1; x++) {
      const idx = y * roiW + x;
      const gx =
        -grey[(y - 1) * roiW + x - 1] + grey[(y - 1) * roiW + x + 1]
        - 2 * grey[y * roiW + x - 1] + 2 * grey[y * roiW + x + 1]
        - grey[(y + 1) * roiW + x - 1] + grey[(y + 1) * roiW + x + 1];
      const gy =
        -grey[(y - 1) * roiW + x - 1] - 2 * grey[(y - 1) * roiW + x] - grey[(y - 1) * roiW + x + 1]
        + grey[(y + 1) * roiW + x - 1] + 2 * grey[(y + 1) * roiW + x] + grey[(y + 1) * roiW + x + 1];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Divide into GRID_SIZE×GRID_SIZE cells, compute average edge density
  const cellW = roiW / GRID_SIZE;
  const cellH = roiH / GRID_SIZE;
  const grid: number[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      let sum = 0;
      let count = 0;
      for (let y = Math.floor(row * cellH); y < Math.floor((row + 1) * cellH); y++) {
        for (let x = Math.floor(col * cellW); x < Math.floor((col + 1) * cellW); x++) {
          sum += edges[y * roiW + x];
          count++;
        }
      }
      grid.push(count > 0 ? sum / count : 0);
    }
  }

  // Normalise to 0–1 range
  const max = Math.max(...grid) || 1;
  return grid.map((v) => Math.round((v / max) * 1000) / 1000);
}

// Draw edge map back onto the visible canvas as an overlay
function drawEdgeOverlay(
  canvas: HTMLCanvasElement,
  palmPrint: number[],
  video: HTMLVideoElement,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cw = canvas.width / GRID_SIZE;
  const ch = canvas.height / GRID_SIZE;
  palmPrint.forEach((density, i) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    if (density > 0.15) {
      ctx.fillStyle = `rgba(162,100,255,${density * 0.6})`;
      ctx.fillRect(col * cw, row * ch, cw, ch);
    }
  });
}

type Phase = 'idle' | 'loading' | 'scanning' | 'done' | 'error';

interface PalmFrame {
  geometry: Record<string, number>;
  palmPrint: number[];
}

export function KoreidPalmVerify({
  account,
  onVerified,
  onError,
  className = '',
}: KoreidBlockProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);   // edge overlay shown to user
  const auxCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas')); // offscreen
  const streamRef = useRef<MediaStream | null>(null);
  const framesBuf = useRef<PalmFrame[]>([]);
  const runRef    = useRef(false);

  const [phase,    setPhase]    = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [msg,      setMsg]      = useState('');

  const stop = useCallback(() => {
    runRef.current = false;
    if (videoRef.current) stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  const finalize = useCallback(async (frames: PalmFrame[]) => {
    stop();
    setPhase('loading');
    setMsg('Computing palm print template…');
    try {
      // Average geometry
      const geoKeys = Object.keys(frames[0].geometry);
      const avgGeo: Record<string, number> = {};
      for (const k of geoKeys) {
        avgGeo[k] = frames.reduce((s, f) => s + f.geometry[k], 0) / frames.length;
      }

      // Average palm print grid (element-wise)
      const avgPrint = frames[0].palmPrint.map(
        (_, i) => frames.reduce((s, f) => s + f.palmPrint[i], 0) / frames.length,
      );

      const proofHash = await buildProofHash(account, 'palm', {
        geometry:   avgGeo,
        palmPrint:  avgPrint,
        gridSize:   GRID_SIZE,
        cells:      avgPrint.length,
        frames:     frames.length,
      });

      setPhase('done');
      setMsg(`Palm print captured — ${avgPrint.length} grid cells, ${geoKeys.length} geometry features ✓`);
      onVerified({
        proofHash,
        method: 'palm',
        capturedAt: Date.now(),
        description: `Palm print — ${GRID_SIZE}×${GRID_SIZE} Sobel edge density grid + hand geometry, ${frames.length} frames averaged`,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error'); setMsg(err.message); onError?.(err);
    }
  }, [account, onVerified, onError, stop]);

  const start = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase('loading');
    setMsg('Loading hand detection…');
    framesBuf.current = [];
    runRef.current = true;

    try {
      const [Hands] = await Promise.all([
        loadHands(),
        startCamera(videoRef.current, 'environment').then((s) => { streamRef.current = s; }),
      ]);

      setPhase('scanning');
      setMsg('Open your palm flat — fingers spread, lines visible');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hands = new (Hands as any)({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });

      hands.setOptions({
        maxNumHands: 1, modelComplexity: 1,
        minDetectionConfidence: 0.7, minTrackingConfidence: 0.7,
      });

      hands.onResults((results: { multiHandLandmarks?: { x: number; y: number; z: number }[][] }) => {
        if (!runRef.current || framesBuf.current.length >= FRAMES_NEEDED) return;

        if (!results.multiHandLandmarks?.length) {
          setMsg('No hand found — hold palm flat facing the back camera');
          return;
        }

        const raw = results.multiHandLandmarks[0];
        const lm  = raw.map((p) => [p.x, p.y, p.z]);

        const geometry  = extractHandGeometry(lm);
        const palmPrint = videoRef.current
          ? extractPalmPrint(videoRef.current, raw, auxCanvas.current)
          : [];

        framesBuf.current.push({ geometry, palmPrint });
        const count = framesBuf.current.length;
        setProgress(count);

        // ── Edge overlay + landmark skeleton ──
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (canvas && video && palmPrint.length) {
          drawEdgeOverlay(canvas, palmPrint, video);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const cw = canvas.width;
            const ch = canvas.height;
            // Draw hand skeleton on top
            const CONNECTIONS: [number,number][] = [
              [0,1],[1,2],[2,3],[3,4],
              [0,5],[5,6],[6,7],[7,8],
              [0,9],[9,10],[10,11],[11,12],
              [0,13],[13,14],[14,15],[15,16],
              [0,17],[17,18],[18,19],[19,20],
              [5,9],[9,13],[13,17],
            ];
            ctx.strokeStyle = 'rgba(162,100,255,0.55)';
            ctx.lineWidth   = 2;
            for (const [a, b] of CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(raw[a].x * cw, raw[a].y * ch);
              ctx.lineTo(raw[b].x * cw, raw[b].y * ch);
              ctx.stroke();
            }
            ctx.fillStyle = '#a264ff';
            for (const pt of raw) {
              ctx.beginPath();
              ctx.arc(pt.x * cw, pt.y * ch, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        if (count >= FRAMES_NEEDED) {
          finalize(framesBuf.current.slice(0, FRAMES_NEEDED));
        } else {
          setMsg(`Reading palm print… ${count}/${FRAMES_NEEDED}`);
        }
      });

      const sendFrame = async () => {
        if (!runRef.current || framesBuf.current.length >= FRAMES_NEEDED) return;
        if (videoRef.current) await hands.send({ image: videoRef.current });
        requestAnimationFrame(sendFrame);
      };
      requestAnimationFrame(sendFrame);

    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error'); setMsg(err.message); onError?.(err); stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className={`koreid-block ${className}`}>
      <div className="koreid-block-header">
        <span className="koreid-block-icon">✋</span>
        <div>
          <h3>Palm Print</h3>
          <p>Wrinkle &amp; crease edge map · hand geometry</p>
        </div>
      </div>

      {/* Palm camera frame with guide rectangle */}
      <div className="koreid-palm-frame">
        <video ref={videoRef} className="koreid-palm-video" playsInline muted />
        <canvas ref={canvasRef} className="koreid-palm-canvas" />
        {phase === 'idle' && <div className="koreid-palm-guide" />}
        {phase === 'scanning' && (
          <div className="koreid-progress-bar">
            <div className="koreid-progress-fill"
              style={{ width: `${(progress / FRAMES_NEEDED) * 100}%` }} />
          </div>
        )}
      </div>

      {msg && (
        <p className={`koreid-msg ${phase === 'error' ? 'error' : phase === 'done' ? 'ok' : ''}`}>
          {phase === 'loading' && <span className="koreid-spinner">⟳ </span>}
          {msg}
        </p>
      )}

      <div className="koreid-actions">
        {phase === 'idle' && (
          <button className="koreid-btn-primary" onClick={start}>
            Start Palm Scan
          </button>
        )}
        {(phase === 'scanning' || phase === 'loading') && (
          <button className="koreid-btn-secondary"
            onClick={() => { stop(); setPhase('idle'); setMsg(''); setProgress(0); }}>
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
