<div align="center">

# domain-portfolio

**A single-file, zero-build portfolio page for domain investors.**

Drop in a JSON file, push, done. No framework, no bundler, no backend — just one `index.html` and your `domains.json`. Free open-source alternative to Carrd, Linktree, and marketplace seller pages.

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Made with HTML](https://img.shields.io/badge/made%20with-HTML-e34f26?logo=html5&logoColor=white)](index.html)
[![No build step](https://img.shields.io/badge/build%20step-none-success)](#-quick-start)
[![Deploy: anywhere](https://img.shields.io/badge/deploy-anywhere-blue)](#-deploy)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

[Live demo](https://kwkuh.github.io/domain-portfolio/) · [Quick start](#-quick-start) · [Schema](#-schema) · [Deploy](#-deploy) · [domainer](https://github.com/kwkuh/domainer)

</div>

---

## ✨ Why

Domain investors who want a public "here's what I'm holding / selling" page have bad options:

| Option | Problem |
| --- | --- |
| Marketplace seller page (Sedo, Afternic) | Locked to their platform, their branding, their commission |
| Carrd / Linktree | Monthly fee, not domain-aware, no tags/BIN/status |
| Hand-rolled site | Build step, framework churn, hosting setup |

**domain-portfolio** is the boring-on-purpose answer: a single HTML file that reads a JSON file. Fork it, edit `domains.json`, push to any static host. That's the whole product.

- 🪶 **One file.** `index.html` — vanilla JS, no dependencies, no `npm install`.
- 🗂 **JSON-driven.** Your portfolio is `domains.json`. Diff-friendly, scriptable, AI-friendly.
- 🏷 **Domain-aware.** Tags become filter chips. BIN price, status (active / for-sale / sold), inquiry mailto.
- 🌓 **Dark mode** out of the box (respects `prefers-color-scheme`).
- 🚀 **Deploy anywhere.** GitHub Pages workflow included; works on Cloudflare Pages, Netlify, Vercel, or `python3 -m http.server`.
- 🔌 **Pairs with [domainer](https://github.com/kwkuh/domainer).** Pipe `domainer export` straight into `domains.json`.
- 📜 **MIT.** Fork it, theme it, sell services around it.

## 🚀 Quick start

```bash
# 1. Use this template (or fork)
gh repo create my-domains --template kwkuh/domain-portfolio --public --clone
cd my-domains

# 2. Edit your portfolio
$EDITOR domains.json

# 3. Push — GitHub Pages auto-deploys (Settings → Pages → Source: GitHub Actions)
git commit -am "my portfolio" && git push
```

Local preview, zero install:

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

## 📐 Schema

`domains.json` is the only file you edit:

```jsonc
{
  "owner": {
    "name":     "Your Name",
    "handle":   "@yourhandle",
    "telegram": "yourhandle",        // optional → Telegram link
    "email":    "you@example.com",   // optional → inquiry mailto
    "github":   "yourhandle",        // optional → GitHub link
    "tagline":  "Short bio line."
  },
  "domains": [
    {
      "name":   "example.com",
      "bin":    2500,                // optional, USD — shows a price chip
      "tags":   ["ai", "brandable"], // any strings — become filter chips
      "status": "for_sale"           // active | for_sale | sold
    }
  ]
}
```

No other file needs touching. `index.html` fetches `domains.json` at runtime and renders.

## 🔌 Sync from domainer

If you run [domainer](https://github.com/kwkuh/domainer) (the open-source domain-ops bot/CLI), keep this page in lockstep with your real portfolio:

```bash
domainer export --format=json > domains.json
git commit -am "sync portfolio" && git push
```

Automate it with the included [`.github/workflows/sync.yml.example`](.github/workflows/sync.yml.example) (scheduled pull from a domainer HTTP endpoint).

## 🌐 Deploy

| Host | How |
| --- | --- |
| **GitHub Pages** | Included workflow — Settings → Pages → Source: GitHub Actions |
| **Cloudflare Pages** | `npx wrangler pages deploy .` |
| **Netlify** | Drag the folder into the dashboard, or connect the repo |
| **Vercel** | `vercel --prod` (no framework preset needed) |
| **Any web host** | Upload `index.html` + `domains.json` |

## 🛣 Roadmap

- [x] JSON-driven render, tag filters, dark mode
- [x] GitHub Pages auto-deploy
- [ ] Per-domain detail page (`/example.com`)
- [ ] Theme variants (terminal, minimal, card-grid)
- [ ] Optional OG image generation per domain
- [ ] Offer/counter form (Formspree/Web3Forms adapter)
- [ ] i18n strings

## 🤝 Contributing

PRs welcome. The constraint that defines this project: **it stays a single `index.html` with zero runtime dependencies.** No framework, no build step, no tracker. Theme variants and adapters are fine; a bundler is not.

## License

[MIT](LICENSE) — fork it, theme it, make it yours.
