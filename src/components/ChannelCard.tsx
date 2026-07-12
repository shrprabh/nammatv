import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Channel } from '../lib/types'
import { F_GEO, F_NOT247, hasPlayableStream, isStreamPlayable } from '../lib/types'
import { countryInfo } from '../lib/data'

function badgeFor(channel: Channel): { label: string; tone: string } | null {
  if (!hasPlayableStream(channel)) {
    return { label: 'External player', tone: 'bg-amber-400/15 text-amber-300' }
  }
  const first = channel.streams.find(isStreamPlayable)
  const flags = first?.flags ?? 0
  if (flags & F_GEO) return { label: 'Geo-blocked', tone: 'bg-sky-400/15 text-sky-300' }
  if (flags & F_NOT247) return { label: 'Not 24/7', tone: 'bg-white/10 text-white/60' }
  return null
}

/** Strip the feed suffix iptv-org appends, e.g. "DD News (1080p)" stays, "@SD" ids don't apply. */
function displayName(channel: Channel): string {
  return channel.name
}

export const ChannelCard = memo(function ChannelCard({
  channel,
  className = '',
}: {
  channel: Channel
  className?: string
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const badge = badgeFor(channel)
  const country = countryInfo(channel.country)
  const showLogo = channel.logo && !logoFailed

  return (
    <Link
      to={`/watch/${encodeURIComponent(channel.id)}`}
      className={`group block select-none focus:outline-none ${className}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.07] to-white/[0.02] transition duration-200 group-hover:border-white/20 group-hover:from-white/[0.12] group-focus-visible:ring-2 group-focus-visible:ring-accent group-active:scale-[0.97]">
        {showLogo ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="absolute inset-0 m-auto max-h-[62%] max-w-[70%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-3xl font-bold text-white/25">
            {displayName(channel).charAt(0).toUpperCase()}
          </span>
        )}
        {badge && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur ${badge.tone}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-[13px] font-medium leading-tight text-white/90">
        {displayName(channel)}
      </div>
      <div className="truncate text-[11px] text-white/45">
        {country ? `${country.flag} ${country.name}` : channel.country}
      </div>
    </Link>
  )
})
