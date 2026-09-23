# Lock and Key Locksmith DE

Static website for Lock and Key Locksmith, serving Kent & Sussex County, Delaware.

This directory is the **built, deployed output** of the site — plain HTML/CSS/JS meant to be served directly by Apache. There's no build step, no `node_modules`, and no framework here. The site is generated from a separate `gen/` toolchain that isn't part of this directory; treat this as the deploy target, not the source of truth.

## Local development

Serve the site at `http://localhost:8090/` (port reserved for this project):

```bash
npm start
```

This runs `npx http-server . -p 8090 -c-1` — no install required.

If you don't have Node/npm available, use the dependency-free fallback instead:

```bash
./serve.sh          # defaults to port 8090
./serve.sh 9000      # or pass a custom port
```

Neither option applies the `.htaccess` rewrites/redirects (trailing slashes, `www` → bare domain, the 301 redirect block) since those are Apache-only. Verify that behavior against the real host before deploying.

## Structure

- `index.html`, `404.html` — top-level pages
- `main.js` — site behavior (open/closed status, interactive service-area map), defensively isolated per feature
- `reveal.js` — scroll-reveal / counting-stat animations, respects `prefers-reduced-motion`
- `styles.css` — global stylesheet
- `.htaccess` — Apache config (caching, security headers, redirects)
- `sitemap.xml`, `robots.txt`
- `assets/img/` — images

### Page types

- **Service pages** (~28, e.g. `/lock-rekey/`, `/car-lockout/`)
- **Location pages** (`/service-areas/<city>-de/`, 51 total)
- **Service × location pages** (`/<service>-in-<city>-de/`, ~1,400) — combinatorial local-SEO pages
- **Blog posts** (`/blog/<slug>/`)
- Standalone: `/about/`, `/faq/`, `/privacy-policy/`, `/terms/`, `/request/`

See `CLAUDE.md` for more detailed guidance on working in this repo.
