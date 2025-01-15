# domain-portfolio

> Public portfolio page for the domains I own. Powered by [domainer](https://github.com/kwkuh/domainer).

**Live:** [kwkuh.github.io/domain-portfolio](https://kwkuh.github.io/domain-portfolio/)

A single-page static site that lists every domain in my portfolio — filterable by tag, with direct inquiry links. Zero JavaScript framework, zero build step. Edit `domains.json`, push, GitHub Pages redeploys.

## How it works

```
domains.json   ←  source of truth (you edit this)
     ↓
index.html     ←  fetches and renders (vanilla JS)
     ↓
GitHub Pages   ←  auto-deploys on push
```

That's it. No Astro, no Next, no Hugo. One HTML file, one JSON file.

## Use it for your own portfolio

```bash
# 1. Fork / clone this repo
gh repo fork kwkuh/domain-portfolio --clone

# 2. Replace domains.json with your portfolio
$EDITOR domains.json

# 3. Push, enable Pages (Settings → Pages → Source: GitHub Actions)
git push
```

### Sync from domainer

If you run [domainer](https://github.com/kwkuh/domainer), pipe its export straight into this repo:

```bash
domainer export --format=json > domains.json
git commit -am "update portfolio" && git push
```

A scheduled workflow can do this automatically — see [.github/workflows/sync.yml.example](.github/workflows/sync.yml.example).

## Schema

```jsonc
{
  "owner": {
    "name":     "Your Name",
    "handle":   "@yourhandle",
    "telegram": "yourhandle",
    "email":    "you@example.com",
    "tagline":  "Short bio line."
  },
  "domains": [
    {
      "name":   "example.com",
      "bin":    2500,                 // optional, USD
      "tags":   ["ai", "brandable"],  // any strings, become filter chips
      "status": "active"              // active | for_sale | sold
    }
  ]
}
```

## License

MIT — fork it, theme it, make it yours.
