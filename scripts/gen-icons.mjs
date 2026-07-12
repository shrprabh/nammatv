#!/usr/bin/env node
/**
 * Generates the PWA/app icons as PNGs with zero image dependencies —
 * pixels are computed directly and encoded through node:zlib.
 * Run once (results are committed): node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---------- minimal PNG encoder ----------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- icon artwork ----------

const lerp = (a, b, t) => a + (b - a) * t
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

const BG_A = hex('#241a4d')
const BG_B = hex('#0b0b16')
const TRI_A = hex('#ffd24a')
const TRI_B = hex('#ff4e6a')
const GLOW = hex('#ff7a5c')

function inRoundedRect(x, y, size, radius) {
  if (x < 0 || y < 0 || x >= size || y >= size) return false
  const cx = Math.max(radius, Math.min(size - radius, x))
  const cy = Math.max(radius, Math.min(size - radius, y))
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  const d1 = sign(px, py, ax, ay, bx, by)
  const d2 = sign(px, py, bx, by, cx, cy)
  const d3 = sign(px, py, cx, cy, ax, ay)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

/**
 * @param size    output pixel size
 * @param options maskable: full-bleed background + smaller triangle (safe zone);
 *                rounded:  transparent rounded-rect corners (regular icons)
 */
function renderIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const radius = maskable ? 0 : size * 0.22
  const triScale = maskable ? 0.78 : 1
  // Triangle vertices (fractions of size), visually centered
  const ax = size * (0.5 + (0.4 - 0.5) * triScale)
  const ayTop = size * (0.5 + (0.32 - 0.5) * triScale)
  const ayBottom = size * (0.5 + (0.68 - 0.5) * triScale)
  const cxTip = size * (0.5 + (0.7 - 0.5) * triScale)
  const cyTip = size * 0.5
  const SS = 3 // 3x3 supersampling

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (!inRoundedRect(px, py, size, radius)) continue
          // background: diagonal gradient + warm glow behind the triangle
          const t = (px + py) / (2 * size)
          let cr = lerp(BG_A[0], BG_B[0], t)
          let cg = lerp(BG_A[1], BG_B[1], t)
          let cb = lerp(BG_A[2], BG_B[2], t)
          const dx = (px - size * 0.53) / size
          const dy = (py - size * 0.5) / size
          const glow = Math.exp(-(dx * dx + dy * dy) / 0.045) * 0.28
          cr = lerp(cr, GLOW[0], glow)
          cg = lerp(cg, GLOW[1], glow)
          cb = lerp(cb, GLOW[2], glow)
          if (inTriangle(px, py, ax, ayTop, ax, ayBottom, cxTip, cyTip)) {
            const tt = (py - ayTop) / (ayBottom - ayTop)
            cr = lerp(TRI_A[0], TRI_B[0], tt)
            cg = lerp(TRI_A[1], TRI_B[1], tt)
            cb = lerp(TRI_A[2], TRI_B[2], tt)
          }
          r += cr
          g += cg
          b += cb
          a += 255
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      rgba[i] = r / n
      rgba[i + 1] = g / n
      rgba[i + 2] = b / n
      rgba[i + 3] = a / n
    }
  }
  return encodePng(size, rgba)
}

mkdirSync(join(OUT, 'icons'), { recursive: true })
writeFileSync(join(OUT, 'icons', 'icon-192.png'), renderIcon(192))
writeFileSync(join(OUT, 'icons', 'icon-512.png'), renderIcon(512))
writeFileSync(join(OUT, 'icons', 'icon-512-maskable.png'), renderIcon(512, { maskable: true }))
// iOS applies its own corner mask — ship full-bleed
writeFileSync(join(OUT, 'icons', 'apple-touch-icon.png'), renderIcon(180, { maskable: true }))

writeFileSync(
  join(OUT, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#241a4d"/><stop offset="1" stop-color="#0b0b16"/>
    </linearGradient>
    <linearGradient id="tri" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd24a"/><stop offset="1" stop-color="#ff4e6a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="113" fill="url(#bg)"/>
  <path d="M205 164 L205 348 L358 256 Z" fill="url(#tri)"/>
</svg>
`,
)

console.log('Icons written to public/icons/ and public/favicon.svg')
