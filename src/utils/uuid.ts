/**
 * Generates an RFC4122 v4 compliant UUID string.
 * Uses `crypto.randomUUID()` when available (HTTPS or localhost in modern browsers),
 * and falls back to `crypto.getRandomValues()` or `Math.random()` for non-secure HTTP contexts.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const num = Number(c)
    const getRandomByte = (): number => {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        return crypto.getRandomValues(new Uint8Array(1))[0]
      }
      return Math.floor(Math.random() * 16)
    }
    return (num ^ (getRandomByte() & (15 >> (num / 4)))).toString(16)
  })
}
