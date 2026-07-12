import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { searchChannels, useCatalog } from '../lib/data'
import { ChannelGrid } from '../components/ChannelGrid'
import { SearchIcon } from '../components/Icons'

const SUGGESTIONS = [
  'TV9',
  'DD News',
  'Colors Kannada',
  'National Geographic',
  'FIFA+',
  'Willow',
  'Red Bull TV',
  'Aaj Tak',
]

export default function Search() {
  const { catalog } = useCatalog()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    document.title = 'Search — NammaTV'
  }, [])

  const results = useMemo(
    () => (catalog ? searchChannels(catalog, deferredQuery, 120) : []),
    [catalog, deferredQuery],
  )

  if (!catalog) return null

  return (
    <div className="safe-x pb-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 10,000+ channels…"
          autoFocus
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-white/10 bg-panel py-3.5 pl-12 pr-4 text-[16px] text-white placeholder-white/35 outline-none transition focus:border-accent/60"
        />
      </div>

      {deferredQuery.trim() === '' ? (
        <div className="mt-6">
          <p className="text-sm text-white/45">Try one of these:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <p className="mt-8 text-sm text-white/45">No channels match “{deferredQuery}”.</p>
      ) : (
        <div className="mt-6">
          <p className="mb-4 text-sm text-white/45">
            {results.length}
            {results.length === 120 ? '+' : ''} results
          </p>
          <ChannelGrid channels={results} />
        </div>
      )}
    </div>
  )
}
