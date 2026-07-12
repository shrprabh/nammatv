import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  categoryName,
  channelById,
  countryInfo,
  filterChannels,
  languageName,
  rankChannels,
  useCatalog,
} from '../lib/data'
import { usePlayer } from '../lib/player'
import { toggleFavorite, useFavorites } from '../lib/store'
import type { CatalogData, Channel } from '../lib/types'
import { Row } from '../components/Row'
import {
  ChevronLeftIcon,
  CopyIcon,
  HeartIcon,
  PlayIcon,
  TvOffIcon,
} from '../components/Icons'

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function isIOS(): boolean {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac but has a touchscreen
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * VLC isn't bound by the browser's mixed-content and CORS rules, so
 * "external player" streams play there.
 * iOS: VLC registers the x-callback scheme — one tap streams directly.
 * Desktop: no vlc:// protocol exists out of the box, but VLC owns the .m3u
 * file association, so we hand over a tiny generated playlist file instead.
 */
function vlcXCallbackHref(url: string): string {
  return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`
}

function m3uDataHref(channelName: string, url: string): string {
  const playlist = `#EXTM3U\n#EXTINF:-1,${channelName}\n${url}\n`
  return `data:audio/x-mpegurl;charset=utf-8,${encodeURIComponent(playlist)}`
}

function m3uFileName(channelName: string): string {
  return `${channelName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'channel'}.m3u`
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard
          ?.writeText(url)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
    >
      <CopyIcon className="h-3.5 w-3.5" />
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function Player({ channel, catalog }: { channel: Channel; catalog: CatalogData }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state, playableStreams, externalStreams, retry, switchToStream, tapToPlay, unmute } =
    usePlayer(videoRef, channel)
  const favorites = useFavorites()
  const isFavorite = favorites.includes(channel.id)
  const country = countryInfo(channel.country)

  const related = useMemo(() => {
    const seen = new Set<string>([channel.id])
    const pool: Channel[] = []
    const add = (list: Channel[]) => {
      for (const c of list) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          pool.push(c)
        }
      }
    }
    const primaryCategory = channel.categories?.[0]
    const primaryLanguage = channel.languages?.[0]
    if (primaryLanguage) add(filterChannels(catalog, { language: primaryLanguage }))
    if (primaryCategory) add(filterChannels(catalog, { category: primaryCategory }))
    return rankChannels(pool).slice(0, 20)
  }, [catalog, channel])

  return (
    <>
      <div className="safe-x mx-auto max-w-5xl">
        <div className="relative overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-white/10 -mx-4 sm:mx-0">
          <video
            ref={videoRef}
            controls
            playsInline
            className="aspect-video w-full"
            {...{ 'x-webkit-airplay': 'allow' }}
          />

          {state.status === 'loading' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60">
              <div className="flex flex-col items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                <span className="text-xs text-white/60">
                  Tuning in… stream {state.streamIndex + 1} of {playableStreams.length}
                </span>
              </div>
            </div>
          )}

          {state.status === 'blocked' && (
            <button
              onClick={tapToPlay}
              aria-label="Play"
              className="absolute inset-0 grid place-items-center bg-black/60"
            >
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-black shadow-2xl transition active:scale-95">
                <PlayIcon className="ml-1 h-10 w-10" />
              </span>
            </button>
          )}

          {state.status === 'offline' && (
            <div className="absolute inset-0 grid place-items-center bg-black/85 p-6">
              <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <TvOffIcon className="h-10 w-10 text-white/30" />
                <p className="font-medium">
                  {playableStreams.length === 0
                    ? 'This channel needs an external player'
                    : 'This channel appears to be offline'}
                </p>
                <p className="text-xs leading-relaxed text-white/50">
                  {playableStreams.length === 0
                    ? 'Browsers can’t play its streams — use the “Play in VLC” buttons below the player.'
                    : 'Public streams come and go — it may be geo-blocked in your region or temporarily down. Try again, or come back later.'}
                </p>
                {playableStreams.length > 0 && (
                  <button
                    onClick={retry}
                    className="mt-1 rounded-full bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/20"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <AnimatePresence>
            {state.mutedFallback && state.status === 'playing' && (
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                onClick={unmute}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-xl"
              >
                🔊 Tap to unmute
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{channel.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-white/55">
              {country && (
                <span className="rounded-full bg-white/5 px-2.5 py-1">
                  {country.flag} {country.name}
                </span>
              )}
              {channel.languages?.slice(0, 3).map((l) => (
                <span key={l} className="rounded-full bg-white/5 px-2.5 py-1">
                  {languageName(l)}
                </span>
              ))}
              {channel.categories?.map((c) => (
                <Link
                  key={c}
                  to={`/browse?cat=${c}`}
                  className="rounded-full bg-white/5 px-2.5 py-1 transition hover:bg-white/10 hover:text-white"
                >
                  {categoryName(c)}
                </Link>
              ))}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={() => toggleFavorite(channel.id)}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`mt-0.5 shrink-0 rounded-full p-2 transition ${
              isFavorite ? 'text-accent-2' : 'text-white/40 hover:text-white'
            }`}
          >
            <HeartIcon className="h-7 w-7" filled={isFavorite} />
          </motion.button>
        </div>

        {playableStreams.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">
              Streams
            </p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {playableStreams.map((s, i) => (
                <button
                  key={s.url}
                  onClick={() => switchToStream(i)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    i === state.streamIndex && state.status !== 'offline'
                      ? 'bg-white text-black'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:border-white/25'
                  }`}
                >
                  Stream {i + 1}
                  {s.quality ? ` · ${s.quality}p` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {externalStreams.length > 0 && (
          <details
            open={playableStreams.length === 0}
            className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
          >
            <summary className="cursor-pointer text-sm font-medium text-white/70">
              {externalStreams.length} more stream{externalStreams.length > 1 ? 's' : ''} for
              external players (VLC)
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Web pages can’t play these streams (plain-HTTP or special headers required) — that’s a
              browser security rule, not a glitch. One tap opens them in the free{' '}
              <a
                href="https://www.videolan.org/vlc/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/30 underline-offset-2"
              >
                VLC app
              </a>

              . On iPhone/iPad “Play in VLC” streams with one tap; on a computer, open the
              downloaded “VLC file” and it starts in VLC. “Direct” opens the raw link, which Safari
              can often play in its own player.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {externalStreams.map((s, i) => (
                <div key={s.url} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-white/50">
                    Stream {i + 1}
                    {s.quality ? ` · ${s.quality}p` : ''} · {hostnameOf(s.url)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isIOS() ? (
                      <a
                        href={vlcXCallbackHref(s.url)}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Play in VLC
                      </a>
                    ) : (
                      <a
                        href={m3uDataHref(channel.name, s.url)}
                        download={m3uFileName(channel.name)}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        VLC file
                      </a>
                    )}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
                    >
                      Direct
                    </a>
                    <CopyButton url={s.url} />
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="mt-8">
        <Row title="You might also like" channels={related} />
      </div>
    </>
  )
}

export default function Watch() {
  const { channelId } = useParams()
  const { catalog } = useCatalog()
  const navigate = useNavigate()

  const channel = catalog && channelId ? channelById(catalog, channelId) : undefined

  useEffect(() => {
    document.title = channel ? `${channel.name} — NammaTV` : 'NammaTV'
  }, [channel])

  if (!catalog) return null

  return (
    <div className="pb-4 pt-1">
      <div className="safe-x mx-auto mb-2 max-w-5xl">
        <button
          // React Router stamps its entry index on history.state — idx 0 means
          // this is the first in-app entry (deep link), so going back would
          // leave the site; go Home instead.
          onClick={() => {
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
            if (idx > 0) navigate(-1)
            else navigate('/')
          }}
          className="flex items-center gap-1 py-2 text-sm text-white/60 transition hover:text-white"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          Back
        </button>
      </div>
      {channel ? (
        <Player key={channel.id} channel={channel} catalog={catalog} />
      ) : (
        <div className="safe-x mx-auto grid max-w-5xl place-items-center py-24 text-center">
          <div>
            <p className="font-medium">Channel not found</p>
            <p className="mt-1 text-sm text-white/50">
              It may have been removed in the latest catalog refresh.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-full bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/20"
            >
              Go home
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
