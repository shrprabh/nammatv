interface IconProps {
  className?: string
}

export function BrandMark({ className = 'h-7 w-7' }: IconProps) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#241a4d" />
          <stop offset="1" stopColor="#0b0b16" />
        </linearGradient>
        <linearGradient id="bm-tri" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd24a" />
          <stop offset="1" stopColor="#ff4e6a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="113" fill="url(#bm-bg)" />
      <path d="M205 164 L205 348 L358 256 Z" fill="url(#bm-tri)" />
    </svg>
  )
}

export function HomeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a2 2 0 0 1 4 0V21h3.5a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GridIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function SearchIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  )
}

export function HeartIcon({ className = 'h-6 w-6', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7.5-4.7-9.3-9.6C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.6 1.1 4.4 2.7l.8 1.5.8-1.5c.8-1.6 2.4-2.7 4.4-2.7 3.2 0 5.3 3.1 4.1 6.4-1.8 4.9-9.3 9.6-9.3 9.6Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronLeftIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PlayIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  )
}

export function CopyIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

export function TvOffIcon({ className = 'h-10 w-10' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M8 21.5h8" strokeLinecap="round" />
      <path d="m9 9.5 6 5m0-5-6 5" strokeLinecap="round" />
    </svg>
  )
}
