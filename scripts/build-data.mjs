#!/usr/bin/env node
/**
 * Build-time data pipeline.
 *
 * Fetches the iptv-org public API, joins channels ⨝ streams ⨝ feeds ⨝ logos,
 * drops blocklisted / NSFW / closed / excluded channels and channels with no
 * streams, and writes one compact JSON file the app ships as a static asset.
 *
 * Writes atomically: the output file is only replaced after every fetch and
 * the full join succeed, so a bad upstream day keeps the previous snapshot.
 */
import { writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://iptv-org.github.io/api'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
const OUT_FILE = join(OUT_DIR, 'channels.json')

// Known pay-TV re-streams that show up in public catalogs without
// authorization (India sports rights holders). Extend as needed.
const EXCLUDE_NAME_PATTERNS = [
  /star\s*sports/i,
  /sony\s*(sports|ten|six)/i,
  /unite\s*8/i,
]

// Stream flag bits (mirrored in src/lib/types.ts)
const F_HTTP = 1 // plain http:// — blocked as mixed content on an https site
const F_HEADERS = 2 // needs custom User-Agent/Referrer — browsers can't send those
const F_GEO = 4 // labeled "Geo-blocked" upstream
const F_NOT247 = 8 // labeled "Not 24/7" upstream

async function get(name) {
  const res = await fetch(`${API}/${name}.json`)
  if (!res.ok) throw new Error(`${name}.json -> HTTP ${res.status}`)
  return res.json()
}

function groupBy(items, key) {
  const map = new Map()
  for (const item of items) {
    const k = key(item)
    if (k == null) continue
    const arr = map.get(k)
    if (arr) arr.push(item)
    else map.set(k, [item])
  }
  return map
}

console.log('Fetching iptv-org API…')
const [channels, streams, feeds, logos, categories, countries, languages, blocklist] =
  await Promise.all([
    get('channels'),
    get('streams'),
    get('feeds'),
    get('logos'),
    get('categories'),
    get('countries'),
    get('languages'),
    get('blocklist'),
  ])

const blocked = new Set(blocklist.map((b) => b.channel))
const feedsByChannel = groupBy(feeds, (f) => f.channel)
const logosByChannel = groupBy(logos, (l) => l.channel)

const streamsByChannel = new Map()
for (const s of streams) {
  if (!s.channel || !s.url || !/^https?:\/\//i.test(s.url)) continue
  const arr = streamsByChannel.get(s.channel)
  if (arr) arr.push(s)
  else streamsByChannel.set(s.channel, [s])
}

function streamFlags(s) {
  let f = 0
  if (/^http:/i.test(s.url)) f |= F_HTTP
  if (s.user_agent || s.referrer) f |= F_HEADERS
  const label = s.label || ''
  if (/geo/i.test(label)) f |= F_GEO
  if (/not\s*24/i.test(label)) f |= F_NOT247
  return f
}

const isPlayable = (f) => (f & (F_HTTP | F_HEADERS)) === 0
const qualityRank = (q) => (q ? parseInt(q, 10) || 0 : 0)

function pickLogo(channelId) {
  const options = logosByChannel.get(channelId)
  if (!options || options.length === 0) return undefined
  // Prefer channel-level logos over feed-specific ones, then larger images.
  const sorted = [...options].sort((a, b) => {
    const aFeed = a.feed ? 1 : 0
    const bFeed = b.feed ? 1 : 0
    if (aFeed !== bFeed) return aFeed - bFeed
    return (b.width || 0) - (a.width || 0)
  })
  return sorted[0].url
}

const excluded = []
const out = []
for (const ch of channels) {
  if (ch.closed || ch.is_nsfw || blocked.has(ch.id)) continue
  const rawStreams = streamsByChannel.get(ch.id)
  if (!rawStreams) continue

  const names = [ch.name, ...(ch.alt_names || [])]
  if (EXCLUDE_NAME_PATTERNS.some((re) => names.some((n) => re.test(n)))) {
    excluded.push(ch.name)
    continue
  }

  const seen = new Set()
  const chStreams = []
  for (const s of rawStreams) {
    if (seen.has(s.url)) continue
    seen.add(s.url)
    const entry = { url: s.url }
    const flags = streamFlags(s)
    if (flags) entry.flags = flags
    const q = qualityRank(s.quality)
    if (q) entry.quality = q
    chStreams.push(entry)
  }
  // Playable-in-browser streams first, higher quality first within each group.
  chStreams.sort((a, b) => {
    const ap = isPlayable(a.flags || 0) ? 0 : 1
    const bp = isPlayable(b.flags || 0) ? 0 : 1
    if (ap !== bp) return ap - bp
    return (b.quality || 0) - (a.quality || 0)
  })

  const langSet = new Set()
  for (const f of feedsByChannel.get(ch.id) || []) {
    for (const l of f.languages || []) langSet.add(l)
  }

  const entry = {
    id: ch.id,
    name: ch.name,
    country: ch.country,
    streams: chStreams,
  }
  if (ch.alt_names?.length) entry.alt = ch.alt_names
  if (ch.categories?.length) entry.categories = ch.categories
  if (langSet.size) entry.languages = [...langSet]
  const logo = pickLogo(ch.id)
  if (logo) entry.logo = logo
  out.push(entry)
}

// Only ship reference data that is actually used by some channel.
const usedCountries = new Set(out.map((c) => c.country))
const usedLanguages = new Set(out.flatMap((c) => c.languages || []))
const usedCategories = new Set(out.flatMap((c) => c.categories || []))

// Some channels reference language codes missing from languages.json —
// keep them selectable by falling back to the raw code as the name.
const knownLanguages = new Map(languages.map((l) => [l.code, l.name]))
const languagesOut = [...usedLanguages]
  .sort()
  .map((code) => ({ code, name: knownLanguages.get(code) ?? code }))

const data = {
  generatedAt: new Date().toISOString(),
  categories: categories
    .filter((c) => usedCategories.has(c.id))
    .map((c) => ({ id: c.id, name: c.name })),
  countries: countries
    .filter((c) => usedCountries.has(c.code))
    .map((c) => ({ code: c.code, name: c.name, flag: c.flag })),
  languages: languagesOut,
  channels: out,
}

// Build summary — these counts double as a sanity check in CI logs.
const count = (pred) => out.filter(pred).length
const summary = {
  channels: out.length,
  playableInBrowser: count((c) => c.streams.some((s) => isPlayable(s.flags || 0))),
  kannada: count((c) => c.languages?.includes('kan')),
  hindi: count((c) => c.languages?.includes('hin')),
  english: count((c) => c.languages?.includes('eng')),
  india: count((c) => c.country === 'IN'),
  sports: count((c) => c.categories?.includes('sports')),
  excludedPayTv: excluded.length,
  bytes: JSON.stringify(data).length,
}
console.log('Build summary:', JSON.stringify(summary, null, 2))
if (excluded.length) console.log('Excluded pay-TV re-streams:', excluded.join(', '))

// Hard sanity gates BEFORE touching the output file, so a bad upstream day
// leaves the previous snapshot in place (CI then deploys the committed one).
if (out.length < 1000) throw new Error(`Suspiciously few channels: ${out.length}`)
if (summary.playableInBrowser < 500)
  throw new Error(`Suspiciously few playable channels: ${summary.playableInBrowser}`)
if (summary.kannada === 0) console.warn('WARNING: Kannada row is empty!')

mkdirSync(OUT_DIR, { recursive: true })
const tmp = OUT_FILE + '.tmp'
writeFileSync(tmp, JSON.stringify(data))
renameSync(tmp, OUT_FILE)
console.log('Wrote', OUT_FILE)
