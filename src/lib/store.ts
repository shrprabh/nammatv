import { useSyncExternalStore } from 'react'

/**
 * Tiny localStorage-backed store with React subscriptions.
 * Holds favorites, recently watched, settings, and per-URL stream health.
 */

const PREFIX = 'nammatv:'

type Listener = () => void
const listeners = new Set<Listener>()
const cache = new Map<string, unknown>()

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  try {
    const raw = localStorage.getItem(PREFIX + key)
    const value = raw ? (JSON.parse(raw) as T) : fallback
    cache.set(key, value)
    return value
  } catch {
    cache.set(key, fallback)
    return fallback
  }
}

function write<T>(key: string, value: T) {
  cache.set(key, value)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (private mode) — keep the in-memory copy.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------- Favorites ----------

export function getFavorites(): string[] {
  return read<string[]>('favorites', [])
}

export function toggleFavorite(channelId: string) {
  const favs = getFavorites()
  write(
    'favorites',
    favs.includes(channelId) ? favs.filter((id) => id !== channelId) : [channelId, ...favs],
  )
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, getFavorites, () => [])
}

// ---------- Recently watched ----------

const MAX_RECENTS = 24

export function getRecents(): string[] {
  return read<string[]>('recents', [])
}

export function recordRecent(channelId: string) {
  const next = [channelId, ...getRecents().filter((id) => id !== channelId)].slice(0, MAX_RECENTS)
  write('recents', next)
}

export function useRecents(): string[] {
  return useSyncExternalStore(subscribe, getRecents, () => [])
}

// ---------- Settings ----------

export interface Settings {
  showUnplayable: boolean
}

const DEFAULT_SETTINGS: Settings = { showUnplayable: false }

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>('settings', {}) }
}

export function updateSettings(patch: Partial<Settings>) {
  write('settings', { ...getSettings(), ...patch })
}

let settingsSnapshot: Settings | null = null
let settingsSnapshotSource: unknown = null

export function useSettings(): Settings {
  return useSyncExternalStore(
    subscribe,
    () => {
      // Keep a stable object identity between writes so React doesn't loop.
      const source = read<Partial<Settings>>('settings', {})
      if (source !== settingsSnapshotSource || !settingsSnapshot) {
        settingsSnapshotSource = source
        settingsSnapshot = { ...DEFAULT_SETTINGS, ...source }
      }
      return settingsSnapshot
    },
    () => DEFAULT_SETTINGS,
  )
}

// ---------- Stream health (dead-stream memory) ----------

interface HealthEntry {
  fails: number
  at: number
}

type HealthMap = Record<string, HealthEntry>

const MAX_HEALTH_ENTRIES = 600

export function recordStreamFailure(url: string) {
  const map = read<HealthMap>('health', {})
  const entry = map[url] ?? { fails: 0, at: 0 }
  const next: HealthMap = { ...map, [url]: { fails: entry.fails + 1, at: Date.now() } }
  const keys = Object.keys(next)
  if (keys.length > MAX_HEALTH_ENTRIES) {
    // Evict oldest entries to keep localStorage bounded.
    keys
      .sort((a, b) => next[a].at - next[b].at)
      .slice(0, keys.length - MAX_HEALTH_ENTRIES)
      .forEach((k) => delete next[k])
  }
  write('health', next)
}

export function recordStreamSuccess(url: string) {
  const map = read<HealthMap>('health', {})
  if (!map[url]) return
  const next = { ...map }
  delete next[url]
  write('health', next)
}

/** Number of consecutive recorded failures for a stream URL. */
export function streamFailCount(url: string): number {
  return read<HealthMap>('health', {})[url]?.fails ?? 0
}
