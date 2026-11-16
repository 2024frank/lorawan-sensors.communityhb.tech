// Keys for what the console keeps in the browser. Before the product was renamed
// they started with "fieldline_". readStored() moves a value saved under an old
// key to its new key the first time it is read, so the rename doesn't sign anyone
// out or reset their theme.
export const TOKEN_KEY = "lorawan_token";
export const THEME_KEY = "lorawan_theme";

const LEGACY_KEYS: Record<string, string> = {
  [TOKEN_KEY]: "fieldline_token",
  [THEME_KEY]: "fieldline_theme",
};

export function readStored(key: string): string | null {
  const value = localStorage.getItem(key);
  const legacy = LEGACY_KEYS[key];
  if (value !== null || !legacy) return value;
  const old = localStorage.getItem(legacy);
  if (old === null) return null;
  try {
    localStorage.setItem(key, old);
    localStorage.removeItem(legacy);
  } catch {
    // Storage is full or blocked: keep using the old key's value this time.
  }
  return old;
}

// Signing out clears the old key as well, so a value left there can't sign someone back in.
export function clearStored(key: string) {
  localStorage.removeItem(key);
  const legacy = LEGACY_KEYS[key];
  if (legacy) localStorage.removeItem(legacy);
}
