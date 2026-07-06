# arshanskaya.com

Alexandra Arshanskaya's art portfolio — a static Astro site, migrated from a
self-hosted WordPress install. Background and migration decisions are in
[PLAN.md](PLAN.md) and [HANDOVER.md](HANDOVER.md).

## Project structure

```text
/
├── src/
│   ├── content/
│   │   ├── posts/       # 93 dated posts, exported from WordPress
│   │   └── pages/       # about, paintings, drawings, privacy policy, etc.
│   ├── content.config.ts
│   ├── assets/uploads/  # media originals, mirrors old wp-content/uploads paths
│   ├── layouts/Layout.astro
│   ├── components/PostList.astro
│   └── pages/           # routing: [...slug].astro, category/[category].astro, etc.
├── public/CNAME         # custom domain for GitHub Pages
├── tools/export/        # one-off WordPress → markdown export scripts (see below)
└── .github/workflows/deploy.yml
```

Requires **Node ≥ 22.12** (the tools/export/ scripts only need Node ≥ 20.3, but the
Astro toolchain itself requires 22.12+ as of the current Astro version — use
[nvm](https://github.com/nvm-sh/nvm) if your system Node is older).

## Commands

| Command           | Action                                       |
| :----------------- | :------------------------------------------- |
| `npm install`       | Install dependencies                         |
| `npm run dev`       | Start local dev server at `localhost:4321`   |
| `npm run build`     | Build the production site to `./dist/`       |
| `npm run preview`   | Preview the production build locally         |

## Content workflow

There's no CMS. To publish, add/edit a markdown file under `src/content/posts/`
or `src/content/pages/` and commit it — GitHub Actions rebuilds and deploys on
every push to `main`.

## Re-running the WordPress export (`tools/export/`)

Only needed if re-importing from the live WP site (e.g. to recover a post that
wasn't migrated). See `tools/export/fetch.mjs` (dumps the WP REST API to
`tools/export/raw/`), `download-media.mjs` (downloads media originals into
`src/assets/uploads/`) and `convert.mjs` (converts to the markdown in
`src/content/`). Re-running `convert.mjs` overwrites `src/content/` — commit or
stash local edits first.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds with
[withastro/action](https://github.com/withastro/action) and publishes to
GitHub Pages.

One-time repo setup (Settings → Pages): **Build and deployment → Source**
must be *GitHub Actions*.

### Current state: preview at arshanskaya.github.io

Until the DNS cutover, the site is served at **https://arshanskaya.github.io/**
(the repo lives in the `arshanskaya` org under the name
`arshanskaya.github.io`, so it deploys to the org's root Pages site with the
same URL structure production will have). `astro.config.mjs` has `site` set to
the preview URL for correct sitemap/RSS links.

At cutover time:

1. Set `site: "https://arshanskaya.com"` in `astro.config.mjs`.
2. Recreate `public/CNAME` containing the single line `arshanskaya.com`.
3. Commit and push, then set the custom domain in Settings → Pages (or
   `gh api -X PUT repos/arshanskaya/arshanskaya.github.io/pages -f cname=arshanskaya.com`).
4. Enable **Enforce HTTPS** once the certificate has provisioned.

### DNS cutover (manual, at your domain registrar)

WordPress keeps running until you're ready to cut over — GitHub Pages won't
serve traffic on the domain until DNS points at it and the custom domain is
verified in repo settings.

1. Apex/root domain (`arshanskaya.com`) → four **A** records pointing at GitHub
   Pages' IPs:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
2. `www` subdomain → **CNAME** record pointing at `arshanskaya.github.io`.
3. Wait for DNS propagation, then confirm in GitHub repo Settings → Pages that
   the custom domain shows as verified with HTTPS available.
4. Spot check: `curl -I https://arshanskaya.com` should show `server:
   GitHub.com`, a valid cert, and old deep links (e.g. `/paintings/`) returning
   200.
5. Only decommission the WordPress server after confirming the new site is
   fully live and correct.
