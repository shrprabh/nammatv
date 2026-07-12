# NammaTV — Free Live TV

A fast, free, static web app for watching the free-to-air live TV channels catalogued by the
[iptv-org](https://github.com/iptv-org/iptv) community project — Kannada, Hindi, English,
news, sports and 10,000+ channels from around the world.

**Live app:** https://shrprabh.github.io/nammatv/

- 📱 Safari-first: native HLS playback on iPhone/iPad/Mac, AirPlay to your TV, add-to-home-screen PWA
- 🌐 hls.js playback on Chrome/Edge/Firefox with fast auto-failover between a channel's streams
- ❤️ Favorites and recently-watched, stored on your device — no accounts
- 🔎 Fuzzy search, plus browse by country / language / category
- 🔄 Channel list refreshes automatically every day via GitHub Actions

## How it works

There is **no server**. At build time, [`scripts/build-data.mjs`](scripts/build-data.mjs) fetches
the iptv-org API, joins channels ⨝ streams ⨝ logos ⨝ languages, drops blocklisted / NSFW / closed
channels and known unauthorized pay-TV re-streams, and writes one compact
`public/data/channels.json`. The React app (Vite + Tailwind) ships as static files on GitHub
Pages; playback happens directly between your browser and each broadcaster's public stream.

Streams that can't play in a browser (plain-HTTP on an HTTPS page, or requiring custom headers)
are labeled "External player" with copy-to-VLC links instead of a broken play button.

## Develop

```bash
npm install
node scripts/build-data.mjs   # refresh public/data/channels.json
npm run dev                   # local dev server
npm run build                 # production build in dist/
```

## Deploy

Pushing to `main` builds and deploys automatically ([workflow](.github/workflows/deploy.yml)).
A daily scheduled run refreshes the channel list; if the iptv-org fetch ever fails, the
committed snapshot of `channels.json` is used, so the site never breaks. Run the workflow
manually from the Actions tab with "Run workflow".

To exclude additional channels, add a pattern to `EXCLUDE_NAME_PATTERNS` in
[`scripts/build-data.mjs`](scripts/build-data.mjs).

## Content & takedown

NammaTV hosts and proxies **no video**. It links to publicly available streams from the
iptv-org catalog, which honors rightsholder removal requests — report a stream by
[opening an issue there](https://github.com/iptv-org/iptv/issues); removals flow into this app
within a day via the scheduled refresh. Premium sport (IPL, FIFA World Cup, most international
cricket) is not legally available as a free stream in India — watch those on the official paid
apps (JioHotstar, ZEE5).
