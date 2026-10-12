/**
 * Shared WebAuthn core for all K-oreID biometric blocks.
 *
 * Every block — face, palm, ear, fingerprint — makes the same
 * navigator.credentials call. The device uses whatever biometric
 * sensor it has (Face ID, Touch ID, fingerprint, Windows Hello).
 * The label in the UI says "Palm" or "Ear" but the hardware just
 * runs its biometric sensor — the shape being verified is a K-oreID
 * application-level concept, not a hardware-level one.
 */
import { buildProofHash } from './hash';
import type { KoreidMethod, KoreidVerifyResult } from './types';

/** Detect what biometric the device calls it */
export async function detectBiometricLabel(): Promise<string> {
  if (!window.PublicKeyCredential) return 'Device Biometric';
  const available =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) return 'Security Key';
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'Face ID / Touch ID';
  if (/Android/.test(ua)) return 'Fingerprint / Face Unlock';
  if (/Mac/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'Device Biometric';
}

/** Random 32-byte challenge */
export function randomChallenge(): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(32));
  crypto.getRandomValues(bytes);
  return bytes;
}

/** ArrayBuffer → hex */
export function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** base64url → Uint8Array */
export function base64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(padded)].map((c) => c.charCodeAt(0)));
}

/** Session storage key for a given account + method */
function credKey(account: string, method: KoreidMethod): string {
  return `koreid_cred_${method}_${account}`;
}

export interface WebAuthnVerifyOptions {
  account: string;
  method: KoreidMethod;
  /** Human label shown in the UI ("Palm Scan", "Ear Scan", "Face Scan") */
  label: string;
  /** Shown in the result description */
  description: string;
}

export interface WebAuthnVerifyResult {
  result: KoreidVerifyResult;
  /** credential ID hex — stored in session for re-auth */
  credentialId: string;
}

/**
 * Run a full WebAuthn register-or-authenticate cycle.
 * Returns the K-oreID proof result.
 *
 * On first call: registers a new passkey for this account+method combo.
 * On subsequent calls: authenticates with the stored credential.
 *
 * Each method (face / palm / ear) stores its own credential ID so they
 * are independent challenges even on the same device session.
 */
export async function webAuthnVerify(
  opts: WebAuthnVerifyOptions,
): Promise<WebAuthnVerifyResult> {
  const { account, method, label, description } = opts;

  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const storedId = sessionStorage.getItem(credKey(account, method));

  if (storedId) {
    return authenticate(account, method, label, description, storedId);
  }
  return register(account, method, label, description);
}

/** Register a new passkey */
async function register(
  account: string,
  method: KoreidMethod,
  label: string,
  description: string,
): Promise<WebAuthnVerifyResult> {
  const challenge = randomChallenge();

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: `K-oreID — ${label}`, id: window.location.hostname },
      user: {
        // Unique per account+method so palm/ear/face have separate credentials
        id: new TextEncoder().encode(`${account}::${method}`),
        name: `${account} (${method})`,
        displayName: `${account} — K-oreID ${label}`,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 — same as SpireKey
        { type: 'public-key', alg: -257 },  // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 120000,
      attestation: 'none',
    },
  })) as PublicKeyCredential;

  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = bufToHex(credential.rawId);

  sessionStorage.setItem(credKey(account, method), credentialId);

  const proofHash = await buildProofHash(account, method, {
    credentialId,
    clientDataHash: bufToHex(
      await crypto.subtle.digest('SHA-256', response.clientDataJSON),
    ),
    challenge: bufToHex(challenge.buffer as ArrayBuffer),
    label,
    type: 'registration',
  });

  return {
    result: {
      proofHash,
      method,
      capturedAt: Date.now(),
      description: `${description} — credential registered, hardware-backed`,
    },
    credentialId,
  };
}

/** Authenticate with an existing passkey */
async function authenticate(
  account: string,
  method: KoreidMethod,
  label: string,
  description: string,
  storedCredId: string,
): Promise<WebAuthnVerifyResult> {
  const challenge = randomChallenge();

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      allowCredentials: [
        {
          type: 'public-key',
          id: base64urlToBytes(storedCredId).buffer as ArrayBuffer,
          transports: ['internal'],
        },
      ],
      timeout: 120000,
    },
  })) as PublicKeyCredential;

  const response = assertion.response as AuthenticatorAssertionResponse;

  // Verify userVerification flag (bit 2 of flags byte at offset 32)
  const flags = new Uint8Array(response.authenticatorData)[32];
  if ((flags & 0x04) === 0) {
    throw new Error(
      `${label} biometric check did not pass — please try again`,
    );
  }

  const credentialId = bufToHex(assertion.rawId);

  const proofHash = await buildProofHash(account, method, {
    credentialId,
    authenticatorDataHash: bufToHex(
      await crypto.subtle.digest('SHA-256', response.authenticatorData),
    ),
    challenge: bufToHex(challenge.buffer as ArrayBuffer),
    label,
    type: 'authentication',
  });

  return {
    result: {
      proofHash,
      method,
      capturedAt: Date.now(),
      description: `${description} — device biometric confirmed, UV bit set`,
    },
    credentialId,
  };
}
