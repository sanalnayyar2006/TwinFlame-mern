import crypto from 'crypto'

// 6-character couple code from a CSPRNG; no 0/O/1/I so codes are easy to read out loud
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generateCoupleCode = (): string =>
  Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % CODE_CHARS.length]).join('')
