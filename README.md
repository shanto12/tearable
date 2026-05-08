# Tearable

An interactive editorial study in three parts — a verlet-integrated cloth simulation rendered as three stackable, tearable pages. The site itself is the cloth: tear through page I (dark editorial) to reveal page II (oxblood "What lies beneath") to reveal page III (warm dawn "Mend.").

## Interactions

| Input | Effect |
| --- | --- |
| Drag (left mouse) | Pull threads of the active page |
| Right-click | Tear holes |
| Shift + drag | Precision cut |
| Two-finger touch | Tear (mobile) |
| **Reset** | Rebuild all three pages |
| **Drop pins** | Release every pin so the sheets fall |

The active-page pill in the top center shows which layer the cursor is currently affecting; when one page is shredded enough, the next becomes active automatically.

## Tech

- **Vite + TypeScript** — strict-mode TS, zero runtime dependencies, ES2022 module output
- **Canvas2D** — each "page" is rendered as an offscreen canvas, then mapped onto a verlet mesh as affine textured triangles
- **Vitest** (jsdom) — unit tests for the physics module
- **ESLint** (typescript-eslint, flat config)
- **GitHub Actions** — lint → typecheck → test → build
- **Netlify** — production hosting with security headers and immutable asset caching

## Quick start

```bash
npm install
npm run dev        # local dev server
npm test           # run physics unit tests
npm run typecheck  # strict TS check, no emit
npm run lint       # ESLint
npm run build      # production build to dist/
npm run preview    # serve dist/
```

## Project layout

```
.
├── index.html              # entry; loads /src/app.ts
├── src/
│   ├── app.ts              # main loop, mouse/touch, layer compositing
│   ├── physics.ts          # Point / Constraint / Layer (verlet)
│   ├── pages.ts            # offscreen canvas textures for each page
│   └── styles.css          # HUD chrome (instructions, pill, footer, hint)
├── tests/
│   └── physics.test.ts     # ~20 unit tests against the physics module
├── .github/workflows/ci.yml
├── netlify.toml
└── vite.config.ts
```

## Tuning

Physics defaults in [`src/physics.ts`](src/physics.ts):

```ts
gravity: 0.32,
friction: 0.99,
bounce: 0.5,
iterations: 4,
tearDist: 110,   // px stretch before a link snaps
```

Mesh density and mouse radii in [`src/app.ts`](src/app.ts):

```ts
spacing: 44,
mouseInfluence: 36,
mouseTear: 22,
mouseCut: 9,
```

## Deployment

Pushes to `main` are continuously deployed by Netlify. The `netlify.toml` at the repo root pins Node 20, runs `npm run build`, publishes `dist/`, and ships baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) plus `Cache-Control: public, max-age=31536000, immutable` for hashed assets.
