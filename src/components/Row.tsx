import { Link } from 'react-router-dom'
import type { Channel } from '../lib/types'
import { ChannelCard } from './ChannelCard'

const ROW_CAP = 24

export function Row({
  title,
  subtitle,
  channels,
  seeAllTo,
}: {
  title: string
  subtitle?: string
  channels: Channel[]
  seeAllTo?: string
}) {
  if (channels.length === 0) return null
  const visible = channels.slice(0, ROW_CAP)
  const hasMore = seeAllTo && channels.length > visible.length

  return (
    <section className="mt-7 first:mt-2">
      <div className="mb-3 flex items-baseline justify-between gap-4 safe-x">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
        </div>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="shrink-0 text-[13px] font-medium text-accent transition hover:brightness-125"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="row-fade no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {visible.map((c) => (
          <ChannelCard key={c.id} channel={c} className="w-36 shrink-0 snap-start sm:w-44" />
        ))}
        {hasMore && (
          <Link
            to={seeAllTo}
            className="grid w-36 shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-white/15 text-sm text-white/60 transition hover:border-white/30 hover:text-white sm:w-44"
            style={{ aspectRatio: '16/9' }}
          >
            +{channels.length - visible.length} more
          </Link>
        )}
      </div>
    </section>
  )
}
