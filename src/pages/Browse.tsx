import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { filterChannels, rankChannels, useCatalog } from '../lib/data'
import { updateSettings, useSettings } from '../lib/store'
import { ChannelGrid } from '../components/ChannelGrid'

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // 16px font: anything smaller makes iOS Safari auto-zoom on focus
        className="w-full appearance-none rounded-xl border border-white/10 bg-panel px-3 py-2 text-[16px] text-white outline-none transition focus:border-accent/60 sm:w-44"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Browse() {
  const { catalog } = useCatalog()
  const [params, setParams] = useSearchParams()
  const settings = useSettings()

  const country = params.get('country') ?? ''
  const lang = params.get('lang') ?? ''
  const cat = params.get('cat') ?? ''

  useEffect(() => {
    document.title = 'Browse — NammaTV'
  }, [])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const options = useMemo(() => {
    if (!catalog) return { countries: [], languages: [], categories: [] }
    const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)
    return {
      countries: [...catalog.countries]
        .sort(byName)
        .map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` })),
      languages: [...catalog.languages].sort(byName).map((l) => ({ value: l.code, label: l.name })),
      categories: [...catalog.categories]
        .sort(byName)
        .map((c) => ({ value: c.id, label: c.name })),
    }
  }, [catalog])

  const results = useMemo(() => {
    if (!catalog) return []
    return rankChannels(
      filterChannels(catalog, {
        country: country || undefined,
        language: lang || undefined,
        category: cat || undefined,
        playableOnly: !settings.showUnplayable,
      }),
    )
  }, [catalog, country, lang, cat, settings.showUnplayable])

  if (!catalog) return null

  return (
    <div className="safe-x pb-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Browse</h1>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Select value={country} onChange={(v) => setParam('country', v)} label="Country" options={options.countries} />
        <Select value={lang} onChange={(v) => setParam('lang', v)} label="Language" options={options.languages} />
        <Select value={cat} onChange={(v) => setParam('cat', v)} label="Category" options={options.categories} />
        <label className="flex items-center gap-2 pb-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={settings.showUnplayable}
            onChange={(e) => updateSettings({ showUnplayable: e.target.checked })}
            className="h-4 w-4 accent-[#ffd24a]"
          />
          Include external-player-only channels
        </label>
      </div>
      <p className="mb-4 mt-3 text-sm text-white/45">
        {results.length.toLocaleString()} channels
      </p>
      <ChannelGrid channels={results} />
    </div>
  )
}
