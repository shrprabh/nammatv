import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Channel } from '../lib/types'
import { ChannelCard } from './ChannelCard'

const PAGE = 48

// Remember how far each grid had grown, per history entry, so back-navigation
// re-renders the same number of cards and ScrollRestoration lands correctly.
const limitMemory = new Map<string, number>()

/**
 * Renders large channel lists incrementally: PAGE cards at a time, revealing
 * more as a sentinel scrolls into view — the DOM never holds 10k nodes.
 */
export function ChannelGrid({ channels }: { channels: Channel[] }) {
  const location = useLocation()
  const [limit, setLimit] = useState(() => limitMemory.get(location.key) ?? PAGE)
  const [prevChannels, setPrevChannels] = useState(channels)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset synchronously during render (not post-commit) when the list changes,
  // so a filter change never first paints thousands of stale-limit cards.
  if (prevChannels !== channels) {
    setPrevChannels(channels)
    setLimit(PAGE)
  }

  useEffect(() => {
    limitMemory.set(location.key, limit)
  }, [location.key, limit])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || limit >= channels.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((l) => Math.min(l + PAGE, channels.length))
        }
      },
      { rootMargin: '800px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [limit, channels])

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {channels.slice(0, limit).map((c) => (
          <ChannelCard key={c.id} channel={c} />
        ))}
      </div>
      {limit < channels.length && <div ref={sentinelRef} className="h-8" />}
    </>
  )
}
