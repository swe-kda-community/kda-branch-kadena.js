/** Start a front-facing camera stream on a <video> element */
export async function startCamera(
  video: HTMLVideoElement,
  facingMode: 'user' | 'environment' = 'user',
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
  return stream;
}

/** Stop all tracks on a stream and clear the video src */
export function stopCamera(
  stream: MediaStream | null,
  video: HTMLVideoElement,
): void {
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}

/** Capture a single frame from <video> into a canvas and return the ImageData */
export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): ImageData {
  const ctx = canvas.getContext('2d')!;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Convert a canvas to a base64 JPEG data-URL */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Load a <script> tag from CDN — used to pull MediaPipe lazily.
 * Returns a promise that resolves when the script is ready.
 */
export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

/** Load MediaPipe FaceMesh from CDN */
export async function loadFaceMesh(): Promise<unknown> {
  await loadScript(
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  );
  await loadScript(
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  );
  return (window as unknown as Record<string, unknown>)['FaceMesh'];
}

/** Load MediaPipe Hands from CDN */
export async function loadHands(): Promise<unknown> {
  await loadScript(
    'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  );
  return (window as unknown as Record<string, unknown>)['Hands'];
}
