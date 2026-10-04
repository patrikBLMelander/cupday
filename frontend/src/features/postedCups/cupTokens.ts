/**
 * Browser-local memory of manage tokens for cups posted here. The manage link (with the token in
 * the #hash) is the real key; this only saves the organizer from pasting it on the same device.
 */
const STORAGE_KEY = 'cup.postedCups.tokens.v1';

function read(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // Storage blocked or corrupt — fall through.
  }
  return {};
}

export function getCupToken(cupId: string): string | null {
  return read()[cupId] ?? null;
}

export function saveCupToken(cupId: string, token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [cupId]: token }));
  } catch {
    // Storage blocked — the link is still the key.
  }
}

export function removeCupToken(cupId: string): void {
  const tokens = read();
  delete tokens[cupId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore.
  }
}

export function ownedCupIds(): Set<string> {
  return new Set(Object.keys(read()));
}

/** Reads the token from a manage link's #hash (remembering it), else from this browser. */
export function resolveCupToken(cupId: string, hash: string): string | null {
  const fromHash = decodeURIComponent(hash.replace(/^#/, ''));
  if (fromHash) {
    saveCupToken(cupId, fromHash);
    return fromHash;
  }
  return getCupToken(cupId);
}

export function cupAdminLink(cupId: string, token: string): string {
  return `${window.location.origin}/matcher/cup/${cupId}/hantera#${encodeURIComponent(token)}`;
}
