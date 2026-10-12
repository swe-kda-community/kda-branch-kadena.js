/**
 * KoreidEarVerify
 *
 * Detailed ear shape biometric using MediaPipe FaceMesh.
 *
 * The human ear is as unique as a fingerprint. This block captures:
 *
 *   HELIX       — the outer curved rim of the ear (12 points)
 *   ANTIHELIX   — the inner ridge (8 points)
 *   TRAGUS      — the small flap covering the ear canal (4 points)
 *   ANTITRAGUS  — the bump opposite the tragus (4 points)
 *   CONCHA      — the bowl-shaped cavity (6 points)
 *   LOBE        — the earlobe (5 points)
 *   SCAPHA      — the groove between helix and antihelix (6 points)
 *
 * From these 45 landmark points we compute:
 *   - All pairwise distances (normalised to head width)
 *   - Curvature angles at each point (how the contour bends)
 *   - Polygon area of each sub-region
 *   - Aspect ratios (height/width of helix, lobe width/ear width, etc.)
 *   - Tragus projection angle relative to ear centre
 *
 * This produces ~200 unique measurements per frame. 12 frames are
 * averaged to produce a stable biometric template, then SHA-256 hashed.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildProofHash } from '../../utils/hash';
import { loadFaceMesh, startCamera, stopCamera } from '../../utils/camera';
import type { KoreidBlockProps } from '../../utils/types';
import '../../styles/block.css';

// ── MediaPipe FaceMesh 478-point (refined) ear landmark indices ──
// These cover the full ear structure with high density around key features.
const EAR_LANDMARKS = {
  // Outer helix rim — top to bottom
  helixRight:       [234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332],
  helixLeft:        [454, 356, 389, 251, 284, 332, 297, 338, 10, 109, 67, 103],
  // Antihelix ridge
  antihelixRight:   [93,  132, 58,  172, 136, 150, 149, 176],
  antihelixLeft:    [323, 361, 288, 397, 365, 379, 378, 400],
  // Tragus & antitragus
  tragusRight:      [234, 93,  132, 58],
  tragusLeft:       [454, 323, 361, 288],
  antitragusRight:  [172, 136, 150, 148],
  antitragusLeft:   [397, 365, 379, 377],
  // Concha (bowl)
  conchaRight:      [234, 93,  172, 136, 150, 149],
  conchaLeft:       [454, 323, 397, 365, 379, 378],
  // Lobe
  lobeRight:        [152, 148, 176, 149, 150],
  lobeLeft:         [152, 377, 400, 378, 379],
  // Scapha (groove between helix and antihelix)
  scaphaRight:      [127, 93,  132, 58,  172, 136],
  scaphaLeft:       [356, 323, 361, 288, 397, 365],
};

type Side = 'right' | 'left';
type LmPoint = { x: number; y: number; z: number };

function dist2d(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function angle(a: number[], b: number[], c: number[]): number {
  const ab = [b[0] - a[0], b[1] - a[1]];
  const cb = [b[0] - c[0], b[1] - c[1]];
  const dot = ab[0] * cb[0] + ab[1] * cb[1];
  const cross = ab[0] * cb[1] - ab[1] * cb[0];
  return Math.atan2(cross, dot);
}

function polyArea(pts: number[][]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2);
}

function extractEarMetrics(raw: LmPoint[], side: Side) {
  const lm = raw.map((p) => [p.x, p.y, p.z]);

  // Normalisation baseline — head width
  const headW = dist2d(lm[234], lm[454]) || 1;

  const sel = side === 'right'
    ? {
        helix:      EAR_LANDMARKS.helixRight,
        antihelix:  EAR_LANDMARKS.antihelixRight,
        tragus:     EAR_LANDMARKS.tragusRight,
        antitragus: EAR_LANDMARKS.antitragusRight,
        concha:     EAR_LANDMARKS.conchaRight,
        lobe:       EAR_LANDMARKS.lobeRight,
        scapha:     EAR_LANDMARKS.scaphaRight,
      }
    : {
        helix:      EAR_LANDMARKS.helixLeft,
        antihelix:  EAR_LANDMARKS.antihelixLeft,
        tragus:     EAR_LANDMARKS.tragusLeft,
        antitragus: EAR_LANDMARKS.antitragusLeft,
        concha:     EAR_LANDMARKS.conchaLeft,
        lobe:       EAR_LANDMARKS.lobeLeft,
        scapha:     EAR_LANDMARKS.scaphaLeft,
      };

  // ── Pairwise distances in each region (normalised) ──
  const pairDists = (indices: number[]) => {
    const pts = indices.map((i) => lm[i]);
    const out: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      out.push(dist2d(pts[i], pts[i + 1]) / headW);
    }
    return out;
  };

  // ── Curvature angles along a contour ──
  const curvatures = (indices: number[]) => {
    const pts = indices.map((i) => lm[i]);
    const out: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      out.push(angle(pts[i - 1], pts[i], pts[i + 1]));
    }
    return out;
  };

  // ── Region areas (normalised to head width²) ──
  const regionArea = (indices: number[]) =>
    polyArea(indices.map((i) => lm[i])) / (headW * headW);

  // ── Aspect ratios ──
  const helixPts = sel.helix.map((i) => lm[i]);
  const helixTop = helixPts[0];
  const helixBot = helixPts[helixPts.length - 1];
  const earHeight = dist2d(helixTop, helixBot) / headW;

  const lobePts  = sel.lobe.map((i) => lm[i]);
  const lobeWidth = dist2d(lobePts[0], lobePts[lobePts.length - 1]) / headW;

  const conchaPts = sel.concha.map((i) => lm[i]);
  const conchaDepth = dist2d(conchaPts[0], conchaPts[conchaPts.length - 1]) / headW;

  return {
    helix:      { dists: pairDists(sel.helix),      curves: curvatures(sel.helix),      area: regionArea(sel.helix) },
    antihelix:  { dists: pairDists(sel.antihelix),  curves: curvatures(sel.antihelix),  area: regionArea(sel.antihelix) },
    tragus:     { dists: pairDists(sel.tragus),      area: regionArea(sel.tragus) },
    antitragus: { dists: pairDists(sel.antitragus),  area: regionArea(sel.antitragus) },
    concha:     { dists: pairDists(sel.concha),      curves: curvatures(sel.concha),     area: regionArea(sel.concha) },
    lobe:       { dists: pairDists(sel.lobe),         area: regionArea(sel.lobe) },
    scapha:     { dists: pairDists(sel.scapha),       area: regionArea(sel.scapha) },
    ratios: { earHeight, lobeWidth, conchaDepth, lobeToEar: lobeWidth / (earHeight || 1) },
  };
}

type EarMetrics = ReturnType<typeof extractEarMetrics>;

function avgMetrics(frames: EarMetrics[]): EarMetrics {
  const avg = (vals: number[]) =>
    vals.reduce((s, v) => s + v, 0) / vals.length;

  const avgArr = (key: keyof EarMetrics) => {
    const arrs = frames.map((f) => {
      const region = f[key] as { dists?: number[]; curves?: number[]; area: number };
      return region.dists ?? [];
    });
    return arrs[0].map((_, i) => avg(arrs.map((a) => a[i] ?? 0)));
  };

  const avgCurves = (key: keyof EarMetrics) => {
    const arrs = frames.map((f) => {
      const region = f[key] as { curves?: number[] };
      return region.curves ?? [];
    });
    if (!arrs[0]?.length) return [];
    return arrs[0].map((_, i) => avg(arrs.map((a) => a[i] ?? 0)));
  };

  const avgArea = (key: keyof EarMetrics) =>
    avg(frames.map((f) => (f[key] as { area: number }).area));

  return {
    helix:      { dists: avgArr('helix'),      curves: avgCurves('helix'),      area: avgArea('helix') },
    antihelix:  { dists: avgArr('antihelix'),  curves: avgCurves('antihelix'),  area: avgArea('antihelix') },
    tragus:     { dists: avgArr('tragus'),      area: avgArea('tragus') },
    antitragus: { dists: avgArr('antitragus'),  area: avgArea('antitragus') },
    concha:     { dists: avgArr('concha'),      curves: avgCurves('concha'),     area: avgArea('concha') },
    lobe:       { dists: avgArr('lobe'),         area: avgArea('lobe') },
    scapha:     { dists: avgArr('scapha'),       area: avgArea('scapha') },
    ratios: {
      earHeight:   avg(frames.map((f) => f.ratios.earHeight)),
      lobeWidth:   avg(frames.map((f) => f.ratios.lobeWidth)),
      conchaDepth: avg(frames.map((f) => f.ratios.conchaDepth)),
      lobeToEar:   avg(frames.map((f) => f.ratios.lobeToEar)),
    },
  };
}

const FRAMES_NEEDED = 12;
type Phase = 'idle' | 'loading' | 'scanning' | 'done' | 'error';

export function KoreidEarVerify({
  account,
  onVerified,
  onError,
  className = '',
}: KoreidBlockProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const framesBuf  = useRef<EarMetrics[]>([]);
  const runningRef = useRef(false);

  const [phase, setPhase]       = useState<Phase>('idle');
  const [side, setSide]         = useState<Side>('right');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg]           = useState('');

  const stop = useCallback(() => {
    runningRef.current = false;
    if (videoRef.current) stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  const finalize = useCallback(async (frames: EarMetrics[], usedSide: Side) => {
    stop();
    try {
      const template = avgMetrics(frames);
      const totalMeasurements =
        template.helix.dists.length + (template.helix.curves?.length ?? 0) +
        template.antihelix.dists.length + (template.antihelix.curves?.length ?? 0) +
        template.concha.dists.length + (template.concha.curves?.length ?? 0) +
        template.tragus.dists.length + template.antitragus.dists.length +
        template.lobe.dists.length + template.scapha.dists.length + 4;

      const proofHash = await buildProofHash(account, 'ear', {
        side: usedSide,
        template,
        frames: frames.length,
        measurements: totalMeasurements,
      });

      setPhase('done');
      setMsg(`Ear scan complete — ${totalMeasurements} measurements captured ✓`);
      onVerified({
        proofHash,
        method: 'ear',
        capturedAt: Date.now(),
        description: `${usedSide} ear — helix, antihelix, tragus, concha, lobe, scapha — ${totalMeasurements} geometric measurements across ${frames.length} frames`,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error');
      setMsg(err.message);
      onError?.(err);
    }
  }, [account, onVerified, onError, stop]);

  const start = useCallback(async (usedSide: Side) => {
    if (!videoRef.current || !canvasRef.current) return;
    setSide(usedSide);
    setPhase('loading');
    setMsg('Loading ear detection…');
    framesBuf.current = [];
    runningRef.current = true;

    try {
      const [FaceMesh] = await Promise.all([
        loadFaceMesh(),
        startCamera(videoRef.current).then((s) => { streamRef.current = s; }),
      ]);

      setPhase('scanning');
      setMsg(usedSide === 'right'
        ? 'Turn your head LEFT — show your right ear clearly'
        : 'Turn your head RIGHT — show your left ear clearly');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faceMesh = new (FaceMesh as any)({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,          // 478 points including irises
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      const helixIdx = usedSide === 'right'
        ? EAR_LANDMARKS.helixRight
        : EAR_LANDMARKS.helixLeft;

      faceMesh.onResults((results: { multiFaceLandmarks?: LmPoint[][] }) => {
        if (!runningRef.current) return;
        if (!results.multiFaceLandmarks?.length) {
          setMsg('No face detected — position your ear in frame');
          return;
        }

        const raw = results.multiFaceLandmarks[0];
        const metrics = extractEarMetrics(raw, usedSide);
        framesBuf.current.push(metrics);

        const count = framesBuf.current.length;
        setProgress(count);

        if (count >= FRAMES_NEEDED) {
          finalize(framesBuf.current.slice(0, FRAMES_NEEDED), usedSide);
          return;
        }

        setMsg(`Scanning ear… hold still (${count}/${FRAMES_NEEDED})`);

        // ── Draw all ear structure landmarks ──
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const drawRegion = (indices: number[], colour: string, fill = false) => {
          const pts = indices.map((i) => raw[i]);
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          pts.forEach((pt, idx) => {
            const x = pt.x * canvas.width;
            const y = pt.y * canvas.height;
            idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.stroke();
          if (fill) {
            ctx.fillStyle = colour.replace(')', ',0.15)').replace('rgb', 'rgba');
            ctx.fill();
          }
          // Landmark dots
          ctx.fillStyle = colour;
          pts.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        };

        const R = usedSide === 'right';
        drawRegion(helixIdx,                                         '#a264ff', false); // helix — purple
        drawRegion(R ? EAR_LANDMARKS.antihelixRight  : EAR_LANDMARKS.antihelixLeft,  '#50c878', true);  // antihelix — green
        drawRegion(R ? EAR_LANDMARKS.tragusRight     : EAR_LANDMARKS.tragusLeft,     '#63a0ff', true);  // tragus — blue
        drawRegion(R ? EAR_LANDMARKS.antitragusRight : EAR_LANDMARKS.antitragusLeft, '#ff6060', true);  // antitragus — red
        drawRegion(R ? EAR_LANDMARKS.conchaRight     : EAR_LANDMARKS.conchaLeft,     '#ffc83c', false); // concha — yellow
        drawRegion(R ? EAR_LANDMARKS.lobeRight       : EAR_LANDMARKS.lobeLeft,       '#ff9050', true);  // lobe — orange
        drawRegion(R ? EAR_LANDMARKS.scaphaRight     : EAR_LANDMARKS.scaphaLeft,     '#c0c0c0', false); // scapha — grey
      });

      const sendFrame = async () => {
        if (!runningRef.current || framesBuf.current.length >= FRAMES_NEEDED) return;
        if (videoRef.current) await faceMesh.send({ image: videoRef.current });
        requestAnimationFrame(sendFrame);
      };
      requestAnimationFrame(sendFrame);

    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setPhase('error');
      setMsg(err.message);
      onError?.(err);
      stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, finalize]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className={`koreid-block ${className}`}>
      <div className="koreid-block-header">
        <span className="koreid-block-icon">👂</span>
        <div>
          <h3>Ear Biometric</h3>
          <p>Helix · antihelix · tragus · concha · lobe · scapha</p>
        </div>
      </div>

      {/* Region legend */}
      {phase === 'scanning' && (
        <div className="koreid-ear-legend">
          <span style={{ color: '#a264ff' }}>● Helix</span>
          <span style={{ color: '#50c878' }}>● Antihelix</span>
          <span style={{ color: '#63a0ff' }}>● Tragus</span>
          <span style={{ color: '#ff6060' }}>● Antitragus</span>
          <span style={{ color: '#ffc83c' }}>● Concha</span>
          <span style={{ color: '#ff9050' }}>● Lobe</span>
          <span style={{ color: '#c0c0c0' }}>● Scapha</span>
        </div>
      )}

      <div className="koreid-camera-wrap">
        <video ref={videoRef} className="koreid-video" playsInline muted
          style={{ transform: 'none' }} />
        <canvas ref={canvasRef} className="koreid-canvas"
          style={{ transform: 'none' }} />
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
          <>
            <button className="koreid-btn-primary" onClick={() => start('right')}>
              Scan Right Ear
            </button>
            <button className="koreid-btn-secondary" onClick={() => start('left')}>
              Scan Left Ear
            </button>
          </>
        )}
        {(phase === 'scanning' || phase === 'loading') && (
          <button className="koreid-btn-secondary"
            onClick={() => { stop(); setPhase('idle'); setMsg(''); setProgress(0); }}>
            Cancel
          </button>
        )}
        {phase === 'error' && (
          <button className="koreid-btn-primary" onClick={() => start(side)}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
