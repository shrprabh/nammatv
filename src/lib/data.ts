import { useEffect, useState } from 'react'
import Fuse from 'fuse.js'
import type { CatalogData, Channel } from './types'
import { hasPlayableStream } from './types'

let catalogPromise: Promise<CatalogData> | null = null
let cached: CatalogData | null = null

export function loadCatalog(): Promise<CatalogData> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${import.meta.env.BASE_URL}data/channels.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load channel data (HTTP ${res.status})`)
        return res.json() as Promise<CatalogData>
      })
      .then((data) => {
        cached = data
        return data
      })
      .catch((err: unknown) => {
        catalogPromise = null // allow retry on next call
        throw err
      })
  }
  return catalogPromise
}

export interface CatalogState {
  catalog: CatalogData | null
  error: string | null
  reload: () => void
}

export function useCatalog(): CatalogState {
  const [catalog, setCatalog] = useState<CatalogData | null>(cached)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (catalog) return
    let alive = true
    setError(null)
    loadCatalog().then(
      (data) => alive && setCatalog(data),
      (err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)),
    )
    return () => {
      alive = false
    }
  }, [attempt, catalog])

  return { catalog, error, reload: () => setAttempt((a) => a + 1) }
}

// ---------- Lookups ----------

const byIdCache = new WeakMap<CatalogData, Map<string, Channel>>()

export function channelById(catalog: CatalogData, id: string): Channel | undefined {
  let map = byIdCache.get(catalog)
  if (!map) {
    map = new Map(catalog.channels.map((c) => [c.id, c]))
    byIdCache.set(catalog, map)
  }
  return map.get(id)
}

// Reference lookups against the last loaded catalog (components only render
// after the catalog is loaded, so `cached` is always set by then).
let refMaps: {
  countries: Map<string, { code: string; name: string; flag: string }>
  categories: Map<string, string>
  languages: Map<string, string>
  source: CatalogData
} | null = null

function refs(catalog: CatalogData | null = cached) {
  if (!catalog) return null
  if (!refMaps || refMaps.source !== catalog) {
    refMaps = {
      source: catalog,
      countries: new Map(catalog.countries.map((c) => [c.code, c])),
      categories: new Map(catalog.categories.map((c) => [c.id, c.name])),
      languages: new Map(catalog.languages.map((l) => [l.code, l.name])),
    }
  }
  return refMaps
}

export function countryInfo(code: string) {
  return refs()?.countries.get(code)
}

export function categoryName(id: string): string {
  return refs()?.categories.get(id) ?? id
}

export function languageName(code: string): string {
  return refs()?.languages.get(code) ?? code
}

// ---------- Filtering & ranking ----------

export interface ChannelFilter {
  country?: string
  language?: string
  category?: string
  playableOnly?: boolean
}

export function filterChannels(catalog: CatalogData, f: ChannelFilter): Channel[] {
  return catalog.channels.filter((c) => {
    if (f.country && c.country !== f.country) return false
    if (f.language && !c.languages?.includes(f.language)) return false
    if (f.category && !c.categories?.includes(f.category)) return false
    if (f.playableOnly && !hasPlayableStream(c)) return false
    return true
  })
}

/** Higher = more likely to be a good experience (playable, has art, better quality). */
export function channelScore(c: Channel): number {
  let score = 0
  if (hasPlayableStream(c)) score += 4
  if (c.logo) score += 2
  const q = Math.max(0, ...c.streams.map((s) => s.quality ?? 0))
  score += Math.min(q, 2000) / 2000
  return score
}

export function rankChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => channelScore(b) - channelScore(a))
}

// ---------- Search ----------

const fuseCache = new WeakMap<CatalogData, Fuse<Channel>>()

export function searchChannels(catalog: CatalogData, query: string, limit = 60): Channel[] {
  const q = query.trim()
  if (!q) return []
  let fuse = fuseCache.get(catalog)
  if (!fuse) {
    fuse = new Fuse(catalog.channels, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'alt', weight: 1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    })
    fuseCache.set(catalog, fuse)
  }
  return fuse.search(q, { limit }).map((r) => r.item)
}
