// ── Device biometric blocks (REAL — Face ID, Touch ID, Android, Windows Hello) ──
export { KoreidDeviceAuth } from './components/device/KoreidDeviceAuth';

// ── Document verification (MRZ + check digits, NFC chip, UV features, Oracle) ──
export { KoreidDocVerify } from './components/KoreidDocVerify';
export type { KoreidDocVerifyProps } from './components/KoreidDocVerify';

// ── Camera-based blocks (supplement — MediaPipe, NOT native biometrics) ──
export { KoreidFaceLiveness } from './components/camera/KoreidFaceLiveness';
export { KoreidPalmVerify } from './components/camera/KoreidPalmVerify';
export { KoreidEarVerify } from './components/camera/KoreidEarVerify';

// ── Expiry banner (queries p14 on-chain, shows days remaining / renewal prompt) ──
export { KoreidExpiryBanner } from './components/KoreidExpiryBanner';
export type { KoreidExpiryBannerProps, ExpiryStatus } from './components/KoreidExpiryBanner';

// ── Multi-block orchestrator ──
export { KoreidMultiVerify } from './components/KoreidMultiVerify';
export type { KoreidMultiVerifyProps } from './components/KoreidMultiVerify';

// ── Types ──
export type {
  KoreidBlockProps,
  KoreidVerifyResult,
  KoreidMethod,
  KoreidLevel,
} from './utils/types';
