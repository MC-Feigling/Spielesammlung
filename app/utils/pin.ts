const PIN_PATTERN = /^\d{4,6}$/
const PIN_MAX_LENGTH = 6

export function normalizePin(pin: string): string {
  return pin.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)
}

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const SHA256_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
] as const

const sha256W = new Uint32Array(64)

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** Processes one 64-byte block at `offset` of `data`, updating `h` in place. */
function sha256Block(h: Uint32Array, data: Uint8Array, offset: number): void {
  const w = sha256W
  for (let j = 0; j < 16; j++) {
    const i = offset + j * 4
    w[j] = ((data[i]! << 24) | (data[i + 1]! << 16) | (data[i + 2]! << 8) | data[i + 3]!) >>> 0
  }
  for (let j = 16; j < 64; j++) {
    const w15 = w[j - 15]!
    const w2 = w[j - 2]!
    const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)
    const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)
    w[j] = (w[j - 16]! + s0 + w[j - 7]! + s1) >>> 0
  }

  let a = h[0]!
  let b = h[1]!
  let c = h[2]!
  let d = h[3]!
  let e = h[4]!
  let f = h[5]!
  let g = h[6]!
  let hh = h[7]!

  for (let j = 0; j < 64; j++) {
    const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
    const ch = (e & f) ^ (~e & g)
    const temp1 = (hh + S1 + ch + SHA256_K[j]! + w[j]!) >>> 0
    const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
    const maj = (a & b) ^ (a & c) ^ (b & c)
    const temp2 = (S0 + maj) >>> 0

    hh = g
    g = f
    f = e
    e = (d + temp1) >>> 0
    d = c
    c = b
    b = a
    a = (temp1 + temp2) >>> 0
  }

  h[0] = (h[0]! + a) >>> 0
  h[1] = (h[1]! + b) >>> 0
  h[2] = (h[2]! + c) >>> 0
  h[3] = (h[3]! + d) >>> 0
  h[4] = (h[4]! + e) >>> 0
  h[5] = (h[5]! + f) >>> 0
  h[6] = (h[6]! + g) >>> 0
  h[7] = (h[7]! + hh) >>> 0
}

function sha256State(): Uint32Array {
  return Uint32Array.from(SHA256_INIT)
}

function stateToBytes(h: Uint32Array): Uint8Array {
  const out = new Uint8Array(32)
  for (let i = 0; i < 8; i++) {
    out[i * 4] = h[i]! >>> 24
    out[i * 4 + 1] = (h[i]! >>> 16) & 0xff
    out[i * 4 + 2] = (h[i]! >>> 8) & 0xff
    out[i * 4 + 3] = h[i]! & 0xff
  }
  return out
}

/**
 * Finishes a hash: `state` already absorbed `prefixLength` bytes (a multiple of 64);
 * `tail` holds the remaining message bytes.
 */
function sha256Finish(state: Uint32Array, prefixLength: number, tail: Uint8Array): Uint8Array {
  const total = prefixLength + tail.length
  const padded = new Uint8Array((tail.length + 9 + 63) & ~63)
  padded.set(tail)
  padded[tail.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, Math.floor((total * 8) / 0x100000000), false)
  view.setUint32(padded.length - 4, (total * 8) >>> 0, false)
  for (let i = 0; i < padded.length; i += 64) sha256Block(state, padded, i)
  return stateToBytes(state)
}

/** Pure JS SHA-256 for insecure contexts where crypto.subtle is missing (e.g. http://LAN-IP). */
function sha256FallbackBytes(bytes: Uint8Array): Uint8Array {
  return sha256Finish(sha256State(), 0, bytes)
}

/** Unsalted SHA-256 hex, only used to verify legacy hashes. */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return toHex(new Uint8Array(digest))
  }
  return toHex(sha256FallbackBytes(data))
}

/* ---- Salted PBKDF2-HMAC-SHA256 ----------------------------------------- */

const PBKDF2_PREFIX = 'pbkdf2'
export const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/** Pure JS PBKDF2 (one 32-byte block) for contexts without crypto.subtle. */
function pbkdf2Fallback(password: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array {
  const blockSize = 64
  const key = password.length > blockSize ? sha256FallbackBytes(password) : password
  const ipad = new Uint8Array(blockSize).fill(0x36)
  const opad = new Uint8Array(blockSize).fill(0x5c)
  for (let i = 0; i < key.length; i++) {
    ipad[i]! ^= key[i]!
    opad[i]! ^= key[i]!
  }
  // Midstates after absorbing the (constant) ipad/opad blocks: each HMAC then costs 2 compressions.
  const innerState = sha256State()
  sha256Block(innerState, ipad, 0)
  const outerState = sha256State()
  sha256Block(outerState, opad, 0)
  const hmac = (message: Uint8Array) => {
    const inner = sha256Finish(Uint32Array.from(innerState), blockSize, message)
    return sha256Finish(Uint32Array.from(outerState), blockSize, inner)
  }

  let u = hmac(concat(salt, new Uint8Array([0, 0, 0, 1])))
  const result = Uint8Array.from(u)
  for (let i = 1; i < iterations; i++) {
    u = hmac(u)
    for (let j = 0; j < result.length; j++) result[j]! ^= u[j]!
  }
  return result
}

async function pbkdf2Hex(secret: string, salt: Uint8Array, iterations: number): Promise<string> {
  const password = new TextEncoder().encode(secret)
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
      key,
      256,
    )
    return toHex(new Uint8Array(bits))
  }
  return toHex(pbkdf2Fallback(password, salt, iterations))
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const digest = await pbkdf2Hex(secret, salt, PBKDF2_ITERATIONS)
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${digest}`
}

/** Checks a salted hash, or the old unsalted SHA-256 hex format (legacy). */
async function verifySecret(secret: string, hash: string): Promise<boolean> {
  if (!hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    return constantTimeEqual(await sha256Hex(secret), hash)
  }
  const [, iterationText, saltHex, digest] = hash.split('$')
  const iterations = Number(iterationText)
  if (
    !Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000
    || !saltHex || !digest || !/^[0-9a-f]+$/.test(saltHex) || saltHex.length % 2 !== 0
  ) {
    return false
  }
  return constantTimeEqual(await pbkdf2Hex(secret, fromHex(saltHex), iterations), digest)
}

/** True for hashes in the old unsalted format that should be upgraded after a successful login. */
export function isLegacyHash(hash: string | null): boolean {
  return !!hash && !hash.startsWith(`${PBKDF2_PREFIX}$`)
}

export async function hashPin(pin: string): Promise<string> {
  const normalized = normalizePin(pin)
  if (!isValidPin(normalized)) throw new Error('Invalid PIN')
  return hashSecret(normalized)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const normalized = normalizePin(pin)
  if (!isValidPin(normalized) || !hash) return false
  return verifySecret(normalized, hash)
}

/** Length of the one-time recovery code shown when parental controls are set up. */
export const RECOVERY_CODE_LENGTH = 8

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH)
}

export function isValidRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === RECOVERY_CODE_LENGTH
}

/** Random 8-digit code (unbiased: bytes >= 250 are rejected). */
export function generateRecoveryCode(): string {
  let digits = ''
  while (digits.length < RECOVERY_CODE_LENGTH) {
    const bytes = new Uint8Array(16)
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes)
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    }
    for (const byte of bytes) {
      if (byte < 250 && digits.length < RECOVERY_CODE_LENGTH) digits += String(byte % 10)
    }
  }
  return digits
}

/** "12345678" -> "1234 5678" for display. */
export function formatRecoveryCode(code: string): string {
  const normalized = normalizeRecoveryCode(code)
  return `${normalized.slice(0, 4)} ${normalized.slice(4)}`.trim()
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = normalizeRecoveryCode(code)
  if (!isValidRecoveryCode(normalized)) throw new Error('Invalid recovery code')
  return hashSecret(`recovery:${normalized}`)
}

export async function verifyRecoveryCode(code: string, hash: string | null): Promise<boolean> {
  if (!hash || !isValidRecoveryCode(code)) return false
  return verifySecret(`recovery:${normalizeRecoveryCode(code)}`, hash)
}

/** True when the entered PIN matches the stored parental PIN hash. */
export async function verifyParentalAccess(
  pin: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return false
  return verifyPin(pin, hash)
}
