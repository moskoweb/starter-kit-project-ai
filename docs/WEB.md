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
