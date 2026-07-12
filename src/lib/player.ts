import { useCallback, useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Channel, Stream } from './types'
import { isStreamPlayable } from './types'
import { recordRecent, recordStreamFailure, recordStreamSuccess, streamFailCount } from './store'

/**
 * Playback engine:
 *  - Safari / iOS / iPadOS: native HLS via <video src> — no CORS requirement,
 *    AirPlay and native fullscreen for free.
 *  - Chrome / Edge / Firefox: hls.js (dynamically imported), with load policies
 *    tightened so a dead stream fails in seconds, not the ~20s+ defaults.
 *
 * On a fatal error the controller records the failure and auto-advances to the
 * channel's next stream; when all are exhausted the status becomes 'offline'.
 */

export type PlaybackStatus = 'loading' | 'playing' | 'offline'

export interface PlayerState {
  status: PlaybackStatus
  streamIndex: number
  engine: 'native' | 'hlsjs'
  /** Autoplay with sound was blocked; we started muted — show tap-to-unmute. */
  mutedFallback: boolean
}

// How long a stream gets to reach 'playing' before we declare it dead.
const WATCHDOG_MS = 15_000

let nativeHlsSupport: boolean | null = null
export function canUseNativeHls(): boolean {
  if (nativeHlsSupport === null) {
    const video = document.createElement('video')
    nativeHlsSupport = video.canPlayType('application/vnd.apple.mpegurl') !== ''
  }
  return nativeHlsSupport
}

/** Streams in playback order: browser-playable first, fewer recorded failures first. */
export function orderStreams(channel: Channel): Stream[] {
  return [...channel.streams].sort((a, b) => {
    const ap = isStreamPlayable(a) ? 0 : 1
    const bp = isStreamPlayable(b) ? 0 : 1
    if (ap !== bp) return ap - bp
    const af = Math.min(streamFailCount(a.url), 3)
    const bf = Math.min(streamFailCount(b.url), 3)
    if (af !== bf) return af - bf
    return (b.quality ?? 0) - (a.quality ?? 0)
  })
}

interface LoadSession {
  cancelled: boolean
  hls?: Hls
  watchdog?: ReturnType<typeof setTimeout>
  cleanupListeners?: () => void
}

export function usePlayer(videoRef: React.RefObject<HTMLVideoElement | null>, channel: Channel) {
  const [streams, setStreams] = useState<Stream[]>(() => orderStreams(channel))
  const [state, setState] = useState<PlayerState>({
    status: 'loading',
    streamIndex: 0,
    engine: canUseNativeHls() ? 'native' : 'hlsjs',
    mutedFallback: false,
  })
  const sessionRef = useRef<LoadSession | null>(null)

  const endSession = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    s.cancelled = true
    if (s.watchdog) clearTimeout(s.watchdog)
    s.cleanupListeners?.()
    s.hls?.destroy()
    sessionRef.current = null
  }, [])

  const load = useCallback(
    async (index: number, list: Stream[]) => {
      const video = videoRef.current
      if (!video) return
      endSession()

      const playable = list.filter(isStreamPlayable)
      if (index >= playable.length) {
        setState((prev) => ({ ...prev, status: 'offline', streamIndex: index }))
        return
      }
      const stream = playable[index]
      const session: LoadSession = { cancelled: false }
      sessionRef.current = session

      const useNative = canUseNativeHls()
      setState({
        status: 'loading',
        streamIndex: index,
        engine: useNative ? 'native' : 'hlsjs',
        mutedFallback: false,
      })

      const fail = () => {
        if (session.cancelled) return
        session.cancelled = true
        if (session.watchdog) clearTimeout(session.watchdog)
        session.cleanupListeners?.()
        session.hls?.destroy()
        recordStreamFailure(stream.url)
        void load(index + 1, list)
      }

      const succeed = () => {
        if (session.cancelled) return
        if (session.watchdog) clearTimeout(session.watchdog)
        recordStreamSuccess(stream.url)
        recordRecent(channel.id)
        setState((prev) => ({ ...prev, status: 'playing' }))
      }

      const startPlayback = () => {
        if (session.cancelled) return
        video.play().catch((err: unknown) => {
          if (session.cancelled) return
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            // Autoplay with sound blocked — retry muted, surface tap-to-unmute.
            video.muted = true
            setState((prev) => ({ ...prev, mutedFallback: true }))
            video.play().catch(() => {
              /* user can press play via native controls */
            })
          }
        })
      }

      session.watchdog = setTimeout(fail, WATCHDOG_MS)

      const onPlaying = () => succeed()
      video.addEventListener('playing', onPlaying)

      if (useNative) {
        const onError = () => fail()
        video.addEventListener('error', onError)
        session.cleanupListeners = () => {
          video.removeEventListener('playing', onPlaying)
          video.removeEventListener('error', onError)
        }
        video.src = stream.url
        video.load()
        startPlayback()
      } else {
        const { default: HlsClass } = await import('hls.js')
        if (session.cancelled) return
        if (!HlsClass.isSupported()) {
          // No MSE at all (very old browser) — nothing we can do.
          session.cleanupListeners = () => video.removeEventListener('playing', onPlaying)
          setState((prev) => ({ ...prev, status: 'offline' }))
          return
        }
        const retry = { maxNumRetry: 1, retryDelayMs: 500, maxRetryDelayMs: 1000, backoff: 'linear' as const }
        const noRetry = { ...retry, maxNumRetry: 0 }
        const tightPolicy = {
          default: {
            maxTimeToFirstByteMs: 6000,
            maxLoadTimeMs: 12000,
            timeoutRetry: noRetry,
            errorRetry: retry,
          },
        }
        const hls = new HlsClass({
          enableWorker: true,
          manifestLoadPolicy: tightPolicy,
          playlistLoadPolicy: tightPolicy,
        })
        session.hls = hls
        let mediaErrorRecovered = false
        hls.on(HlsClass.Events.ERROR, (_evt, data) => {
          if (session.cancelled || !data.fatal) return
          if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && !mediaErrorRecovered) {
            mediaErrorRecovered = true
            hls.recoverMediaError()
            return
          }
          fail()
        })
        hls.on(HlsClass.Events.MANIFEST_PARSED, startPlayback)
        session.cleanupListeners = () => video.removeEventListener('playing', onPlaying)
        hls.loadSource(stream.url)
        hls.attachMedia(video)
      }
    },
    [channel.id, endSession, videoRef],
  )

  // (Re)start playback when the channel changes.
  useEffect(() => {
    const ordered = orderStreams(channel)
    setStreams(ordered)
    void load(0, ordered)
    return endSession
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id])

  const retry = useCallback(() => {
    const ordered = orderStreams(channel)
    setStreams(ordered)
    void load(0, ordered)
  }, [channel, load])

  const switchToStream = useCallback(
    (index: number) => void load(index, streams),
    [load, streams],
  )

  const unmute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setState((prev) => ({ ...prev, mutedFallback: false }))
  }, [videoRef])

  return {
    state,
    playableStreams: streams.filter(isStreamPlayable),
    externalStreams: streams.filter((s) => !isStreamPlayable(s)),
    retry,
    switchToStream,
    unmute,
  }
}
