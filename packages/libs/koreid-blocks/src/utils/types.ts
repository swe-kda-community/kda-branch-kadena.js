/** Result returned by every K-oreID verification block */
export interface KoreidVerifyResult {
  /** SHA-256 hex of the captured biometric data + account + nonce */
  proofHash: string;
  /** Which method produced this hash */
  method: KoreidMethod;
  /** Unix timestamp of verification (ms) */
  capturedAt: number;
  /** Human-readable description of what was captured */
  description: string;
}

export type KoreidMethod =
  | 'device'     // Real WebAuthn — Face ID / Touch ID / Android biometric
  | 'face'       // Camera liveness (MediaPipe) — supplement, not native
  | 'document'   // Passport / ID document MRZ via Tesseract OCR
  | 'palm'       // Camera palm geometry (MediaPipe Hands)
  | 'ear'        // Camera ear contour (MediaPipe FaceMesh)
  | 'multi';     // Composite of N blocks

export type KoreidLevel = 'basic' | 'standard' | 'enhanced';

/** Props shared by every verification block */
export interface KoreidBlockProps {
  /** The user's Kadena account name (included in the hash) */
  account: string;
  /** Called when verification succeeds with the proof result */
  onVerified: (result: KoreidVerifyResult) => void;
  /** Called if the user cancels or an error occurs */
  onError?: (err: Error) => void;
  /** Optional extra className for the wrapper div */
  className?: string;
}
