# Mantis WordPress / Elementor Landing Page

Paste-ready HTML for **https://turneratech.com/mantis/** (replaces the old `/bugtracker/` page).

## Installation in WordPress

1. Create a new Page → slug **`mantis`**
2. Edit with **Elementor**
3. Page Layout → **Elementor Canvas** (removes theme header/footer)
4. Add **Section** → Full Width, 0 padding
5. Add **HTML Widget** → paste entire contents of `mantis-elementor.html`
6. **Update** the `MANTIS_CONFIG` block at the top of the script (API URL, GitHub, demo links)
  7. Publish

**License API:** The register form calls `https://license.turneratech.com` — you must deploy `portal/server.js` on EC2 first. See [docs/PORTAL_EC2_DEPLOY.md](../../docs/PORTAL_EC2_DEPLOY.md).

## Redirect old URL (optional)

In WordPress or `.htaccess`, redirect `/bugtracker/` → `/mantis/`:

```
Redirect 301 /bugtracker https://turneratech.com/mantis
```

## License API

The **Get License** form posts to `MANTIS_CONFIG.portalApiUrl`. Options:

| Environment | `portalApiUrl` |
|-------------|----------------|
| Local dev | `http://localhost:4000` |
| Production | `https://license.turneratech.com` (or your portal host) |

Ensure CORS on the portal allows `https://turneratech.com`.

## Files

| File | Purpose |
|------|---------|
| `mantis-elementor.html` | Full page — paste into Elementor HTML widget |
| `mantis-elementor.css` | Reference only (styles are inlined in HTML) |
