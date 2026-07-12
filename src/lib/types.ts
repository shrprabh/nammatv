// Stream flag bits (mirrored in scripts/build-data.mjs)
export const F_HTTP = 1 // plain http:// — blocked as mixed content on an https site
export const F_HEADERS = 2 // needs custom headers browsers can't send
export const F_GEO = 4 // labeled "Geo-blocked" upstream
export const F_NOT247 = 8 // labeled "Not 24/7" upstream

export interface Stream {
  url: string
  quality?: number
  flags?: number
}

export interface Channel {
  id: string
  name: string
  alt?: string[]
  country: string
  categories?: string[]
  languages?: string[]
  logo?: string
  streams: Stream[]
}

export interface Category {
  id: string
  name: string
}

export interface Country {
  code: string
  name: string
  flag: string
}

export interface Language {
  code: string
  name: string
}

export interface CatalogData {
  generatedAt: string
  categories: Category[]
  countries: Country[]
  languages: Language[]
  channels: Channel[]
}

/** Playable directly in this (https) page: not mixed-content, no unsendable headers. */
export function isStreamPlayable(s: Stream): boolean {
  return ((s.flags ?? 0) & (F_HTTP | F_HEADERS)) === 0
}

export function hasPlayableStream(c: Channel): boolean {
  return c.streams.some(isStreamPlayable)
}
