const PIN_PATTERN = /^\d{4,6}$/

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin)
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new Error('Invalid PIN')
  if (!globalThis.crypto?.subtle) throw new Error('crypto.subtle unavailable')

  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!isValidPin(pin) || !hash) return false
  const next = await hashPin(pin)
  return next === hash
}
