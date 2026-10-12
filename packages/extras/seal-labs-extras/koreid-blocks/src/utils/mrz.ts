/**
 * MRZ (Machine Readable Zone) utilities
 *
 * Implements ICAO 9303 check digit algorithm and full MRZ parsing/validation.
 * A valid check digit proves the document data is internally consistent —
 * catching most forgeries that don't know the algorithm, and all typos.
 */

// ICAO 9303 character weights
const WEIGHTS = [7, 3, 1];
const CHAR_MAP: Record<string, number> = { '<': 0 };
for (let i = 0; i < 26; i++) CHAR_MAP[String.fromCharCode(65 + i)] = i + 10;
for (let i = 0; i < 10; i++) CHAR_MAP[String(i)] = i;

/** Compute ICAO 9303 check digit for a string field */
export function checkDigit(field: string): string {
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const val = CHAR_MAP[field[i].toUpperCase()] ?? 0;
    sum += val * WEIGHTS[i % 3];
  }
  return String(sum % 10);
}

/** Validate a field + its check digit character */
export function validCheck(field: string, digit: string): boolean {
  return checkDigit(field) === digit;
}

export interface MrzData {
  documentType : string;
  country      : string;
  surname      : string;
  givenNames   : string;
  documentNumber : string;
  nationality  : string;
  dateOfBirth  : string;
  sex          : string;
  expiryDate   : string;
  raw          : string[];
  // validity
  checksValid  : boolean;
  checksDetail : {
    docNumber : boolean;
    dob       : boolean;
    expiry    : boolean;
    composite : boolean;
  };
}

/** Parse and validate a TD3 passport MRZ (2 × 44 chars) */
function parseTD3(l1: string, l2: string): MrzData | null {
  if (l1.length !== 44 || l2.length !== 44) return null;

  const docNumber    = l2.slice(0, 9);
  const docCheck    = l2[9];
  const dob          = l2.slice(13, 19);
  const dobCheck    = l2[19];
  const expiry       = l2.slice(21, 27);
  const expiryCheck = l2[27];
  // Composite: docNumber+check + optional + dob+check + expiry+check
  const composite    = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 28) + l2.slice(28, 42);
  const compositeCheck = l2[42];

  const checksDetail = {
    docNumber : validCheck(docNumber, docCheck),
    dob       : validCheck(dob, dobCheck),
    expiry    : validCheck(expiry, expiryCheck),
    composite : validCheck(composite, compositeCheck),
  };

  const nameField = l1.slice(5, 44).split('<<');

  return {
    documentType   : l1.slice(0, 2).replace(/<+$/, ''),
    country        : l1.slice(2, 5),
    surname        : (nameField[0] ?? '').replace(/</g, ' ').trim(),
    givenNames     : (nameField[1] ?? '').replace(/</g, ' ').trim(),
    documentNumber : docNumber.replace(/</g, ''),
    nationality    : l2.slice(10, 13),
    dateOfBirth    : dob,
    sex            : l2[20],
    expiryDate     : expiry,
    raw            : [l1, l2],
    checksValid    : Object.values(checksDetail).every(Boolean),
    checksDetail,
  };
}

/** Parse and validate a TD1 ID card MRZ (3 × 30 chars) */
function parseTD1(l1: string, l2: string, l3: string): MrzData | null {
  if (l1.length !== 30 || l2.length !== 30 || l3.length !== 30) return null;

  const docNumber   = l1.slice(5, 14);
  const docCheck   = l1[14];
  const dob         = l2.slice(0, 6);
  const dobCheck   = l2[6];
  const expiry      = l2.slice(8, 14);
  const expiryCheck = l2[14];
  const composite   = l1.slice(5) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
  const compositeCheck = l2[29];

  const checksDetail = {
    docNumber : validCheck(docNumber, docCheck),
    dob       : validCheck(dob, dobCheck),
    expiry    : validCheck(expiry, expiryCheck),
    composite : validCheck(composite, compositeCheck),
  };

  const nameField = l3.split('<<');

  return {
    documentType   : l1.slice(0, 2).replace(/<+$/, ''),
    country        : l1.slice(2, 5),
    surname        : (nameField[0] ?? '').replace(/</g, ' ').trim(),
    givenNames     : (nameField[1] ?? '').replace(/</g, ' ').trim(),
    documentNumber : docNumber.replace(/</g, ''),
    nationality    : l2.slice(15, 18),
    dateOfBirth    : dob,
    sex            : l2[7],
    expiryDate     : expiry,
    raw            : [l1, l2, l3],
    checksValid    : Object.values(checksDetail).every(Boolean),
    checksDetail,
  };
}

/** Auto-detect and parse MRZ from an array of raw OCR lines */
export function parseMrz(lines: string[]): MrzData | null {
  // Normalise — strip spaces, uppercase, keep only valid MRZ chars
  const norm = lines
    .map((l) => l.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 30);

  // TD3 passport — 2 × 44
  for (let i = 0; i < norm.length - 1; i++) {
    if (norm[i].length === 44 && norm[i + 1].length === 44) {
      const r = parseTD3(norm[i], norm[i + 1]);
      if (r) return r;
    }
  }

  // TD1 ID card — 3 × 30
  for (let i = 0; i < norm.length - 2; i++) {
    if (norm[i].length === 30 && norm[i + 1].length === 30 && norm[i + 2].length === 30) {
      const r = parseTD1(norm[i], norm[i + 1], norm[i + 2]);
      if (r) return r;
    }
  }

  return null;
}

/**
 * Derive Basic Access Control (BAC) keys from MRZ fields.
 * Used to unlock the NFC chip on an e-passport.
 * Key seed = SHA-1( docNumber+docCheck + dob+dobCheck + expiry+expiryCheck )
 */
export async function deriveBacSeed(mrz: MrzData): Promise<string> {
  const [l1, l2] = mrz.raw;
  let seed: string;
  if (l2.length === 44) {
    // TD3 — docNumber[0..9] + dob[13..19]+check + expiry[21..27]+check
    seed = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 28);
  } else {
    // TD1 — docNumber[5..14]+check[14] + dob[0..6]+check[6] + expiry[8..14]+check[14]
    seed = l1.slice(5, 15) + l2.slice(0, 7) + l2.slice(8, 15);
  }
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
