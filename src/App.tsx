import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { useCatalog } from './lib/data'
import { BrandMark, GridIcon, HomeIcon, SearchIcon } from './components/Icons'

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/browse', label: 'Browse', icon: GridIcon, end: false },
  { to: '/search', label: 'Search', icon: SearchIcon, end: false },
]

function Header() {
  return (
    <header className="glass safe-top sticky top-0 z-40 border-b border-white/[0.06]">
      <div className="safe-x mx-auto flex h-14 max-w-7xl items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8 rounded-[10px] shadow-lg shadow-black/40" />
          <span className="text-lg font-bold tracking-tight">
            Namma<span className="text-brand">TV</span>
          </span>
        </NavLink>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

function TabBar() {
  return (
    <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                isActive ? 'text-accent' : 'text-white/50'
              }`
            }
          >
            <Icon className="h-6 w-6" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Footer() {
  const { catalog } = useCatalog()
  return (
    <footer className="safe-x mx-auto mt-14 max-w-7xl border-t border-white/[0.06] pb-24 pt-6 text-xs leading-relaxed text-white/40 md:pb-10">
      <p>
        NammaTV hosts no video. It links to publicly available streams catalogued by the{' '}
        <a
          href="https://github.com/iptv-org/iptv"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/30 underline-offset-2 hover:text-white/70"
        >
          iptv-org
        </a>{' '}
        community project. To report a stream, open an issue there — removals are honored upstream
        and picked up by our daily refresh. Premium sport (IPL, FIFA World Cup) is only available on
        official paid apps like JioHotstar and ZEE5.
      </p>
      {catalog && (
        <p className="mt-2 text-white/30">
          {catalog.channels.length.toLocaleString()} channels · updated{' '}
          {new Date(catalog.generatedAt).toLocaleDateString()}
        </p>
      )}
    </footer>
  )
}

function SplashScreen({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <BrandMark className="h-16 w-16 rounded-2xl shadow-2xl shadow-black/60" />
        <div className="text-2xl font-bold tracking-tight">
          Namma<span className="text-brand">TV</span>
        </div>
        {error ? (
          <>
            <p className="max-w-sm text-sm text-white/60">
              Couldn’t load the channel list. {error}
            </p>
            <button
              onClick={onRetry}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/20"
            >
              Try again
            </button>
          </>
        ) : (
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="skeleton h-full w-full" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { catalog, error, reload } = useCatalog()

  if (!catalog) return <SplashScreen error={error} onRetry={reload} />

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-7xl pt-4">
        <Outlet />
      </main>
      <Footer />
      <TabBar />
      <ScrollRestoration />
    </div>
  )
}
