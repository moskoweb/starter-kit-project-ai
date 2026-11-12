# Public website

`apps/web` is an Astro static site. Production output is `apps/web/dist`; deploy that directory to any static host. Configure the host to serve generated `404.html` for unknown routes. `SITE_URL` is required at build time; it sets canonical origins and generated sitemap. Use the final HTTPS site origin, an absolute HTTPS origin without credentials, path, query, or fragment.

`PUBLIC_APP_URL` is required for production builds and must be the app's absolute HTTPS origin (for example `https://app.example.com`). The public site links to `/login` and `/signup` under this origin. Local development defaults to `http://127.0.0.1:3000`; set the configured app origin explicitly if its `PORT` differs from 3000. Loopback HTTP is allowed only in local development; builds require HTTPS.

Node.js 22.23.2 is the workspace target. Astro is pinned to 6.4.8 (registry metadata requires Node >=22.12), compatible with this runtime. From repository root, build using production origins:

```sh
SITE_URL=https://www.example.com PUBLIC_APP_URL=https://app.example.com pnpm --filter @vibe/web build
```

For CI builds without production domains, use explicit synthetic HTTPS origins such as `SITE_URL=https://example.test PUBLIC_APP_URL=https://app.example.test`; never ship those artifacts. Astro config rejects missing or invalid `SITE_URL`.

```sh
pnpm --filter @vibe/web dev
pnpm --filter @vibe/web check-types
pnpm --filter @vibe/web preview
```

Development and preview bind to loopback port 4321. `check` and `check-types` run `astro check`. The site uses Tailwind CSS 4's Vite plugin and shared `@vibe/ui/theme.css` tokens; it does not render the React dashboard.

Home and setup pages share the same validated app origin. Sitemap excludes both localized and root 404 routes; generated Astro metadata is ignored and excluded from derived projects.

## Pages and content

Routes (pt-BR default, English under `/en/`): home `/` and `/en/`, setup guide `/getting-started/` and `/en/getting-started/`, privacy `/privacidade/` and `/en/privacy/`, terms `/termos/` and `/en/terms/`, cookies `/cookies/` and `/en/cookies/`. Route pairs live in `apps/web/src/lib/site.ts`; the layout uses them for the language switch, `hreflang` alternates, and footer legal links. Add new localized pages there.

`PUBLIC_PRODUCT_NAME` (optional, public, non-secret) sets the product name in header, titles, Open Graph, and JSON-LD; default `Vibe Starter Kit`. Home sends sign-up and sign-in CTAs to `PUBLIC_APP_URL` `/signup` and `/login`. Each page emits title, description, canonical, and basic Open Graph/Twitter meta.

Legal pages are generic templates. Replace every bracketed placeholder (`[Nome da empresa]`, `[Company name]`, CNPJ, address, DPO, providers, dates) and review with legal counsel before publishing; each page shows a visible template notice until you remove `LegalNotice`. The cookie policy reflects current behavior: the site stores only `theme` in localStorage; the app uses auth session cookies, `locale`, `sidebar_state`, and opt-in analytics consent (`analytics-consent`, `analytics-distinct-id`) described in [OPERATIONS.md](OPERATIONS.md#analytics). Update it when cookies or analytics providers change.
