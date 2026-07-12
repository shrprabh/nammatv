import { useEffect, useMemo } from 'react'
import { channelById, filterChannels, rankChannels, useCatalog } from '../lib/data'
import { useFavorites, useRecents } from '../lib/store'
import { Row } from '../components/Row'
import type { CatalogData, Channel } from '../lib/types'

interface RowSpec {
  key: string
  title: string
  subtitle?: string
  channels: Channel[]
  seeAllTo?: string
}

// Curated name matchers for themed rows. Pay-TV brands whose public "streams"
// are unauthorized re-broadcasts (Fox Sports, Star, Sony…) are deliberately
// not featured — search still finds whatever the iptv-org catalog carries.
const CRICKET = /cricket|willow/i
const FOOTBALL = /fifa|football|soccer|futbol|\bgol\s?tv\b/i
const FOOTBALL_SKIP = /fox|star|sony/i
const WILDLIFE = /nat.?geo|national geo|animal|wildlife|\bwild\b|nature|discovery/i

function buildRows(catalog: CatalogData): RowSpec[] {
  const lang = (code: string) => rankChannels(filterChannels(catalog, { language: code }))
  const cat = (id: string) => rankChannels(filterChannels(catalog, { category: id }))
  const byName = (re: RegExp, skip?: RegExp) =>
    catalog.channels.filter((c) => {
      const names = [c.name, ...(c.alt ?? [])]
      return names.some((n) => re.test(n)) && !(skip && names.some((n) => skip.test(n)))
    })
  const docsSet = new Set([
    ...byName(WILDLIFE).map((c) => c.id),
    ...filterChannels(catalog, { category: 'documentary' }).map((c) => c.id),
    ...filterChannels(catalog, { category: 'science' }).map((c) => c.id),
    ...filterChannels(catalog, { category: 'outdoor' }).map((c) => c.id),
  ])
  return [
    {
      key: 'kannada',
      title: 'ಕನ್ನಡ · Kannada',
      channels: lang('kan'),
      seeAllTo: '/browse?lang=kan',
    },
    {
      key: 'sports',
      title: 'Sports',
      subtitle: 'Free-to-air sports only — IPL & World Cup live on their official paid apps.',
      channels: cat('sports'),
      seeAllTo: '/browse?cat=sports',
    },
    {
      key: 'cricket',
      title: 'Cricket',
      subtitle: 'Free cricket channels. India matches: DD Free Dish (satellite) or JioHotstar.',
      channels: rankChannels(byName(CRICKET)),
    },
    {
      key: 'football',
      title: 'Football',
      subtitle: 'FIFA+ & free football channels. World Cup in India streams on ZEE5 (official).',
      channels: rankChannels(byName(FOOTBALL, FOOTBALL_SKIP)),
    },
    { key: 'hindi', title: 'Hindi', channels: lang('hin'), seeAllTo: '/browse?lang=hin' },
    { key: 'english', title: 'English', channels: lang('eng'), seeAllTo: '/browse?lang=eng' },
    { key: 'news', title: 'News', channels: cat('news'), seeAllTo: '/browse?cat=news' },
    {
      key: 'wildlife',
      title: 'Documentaries & Wildlife',
      subtitle: 'Nat Geo, nature and science channels from around the world.',
      channels: rankChannels(catalog.channels.filter((c) => docsSet.has(c.id))),
      seeAllTo: '/browse?cat=documentary',
    },
    { key: 'movies', title: 'Movies', channels: cat('movies'), seeAllTo: '/browse?cat=movies' },
    { key: 'music', title: 'Music', channels: cat('music'), seeAllTo: '/browse?cat=music' },
    { key: 'kids', title: 'Kids', channels: cat('kids'), seeAllTo: '/browse?cat=kids' },
    {
      key: 'india',
      title: 'India — all channels',
      channels: rankChannels(filterChannels(catalog, { country: 'IN' })),
      seeAllTo: '/browse?country=IN',
    },
  ]
}

export default function Home() {
  const { catalog } = useCatalog()
  const favorites = useFavorites()
  const recents = useRecents()

  useEffect(() => {
    document.title = 'NammaTV — Free Live TV'
  }, [])

  const rows = useMemo(() => (catalog ? buildRows(catalog) : []), [catalog])
  const favoriteChannels = useMemo(
    () =>
      catalog ? favorites.map((id) => channelById(catalog, id)).filter((c): c is Channel => !!c) : [],
    [catalog, favorites],
  )
  const recentChannels = useMemo(
    () =>
      catalog ? recents.map((id) => channelById(catalog, id)).filter((c): c is Channel => !!c) : [],
    [catalog, recents],
  )

  if (!catalog) return null

  return (
    <div className="pb-4">
      <div className="safe-x pb-2 pt-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Live TV, <span className="text-brand">free forever</span>
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {catalog.channels.length.toLocaleString()} free channels from around the world — no
          sign-up, no subscription.
        </p>
      </div>
      <Row title="Favorites" channels={favoriteChannels} />
      <Row title="Recently watched" channels={recentChannels} />
      {rows.map((r) => (
        <Row
          key={r.key}
          title={r.title}
          subtitle={r.subtitle}
          channels={r.channels}
          seeAllTo={r.seeAllTo}
        />
      ))}
    </div>
  )
}
