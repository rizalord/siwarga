# Design

<!-- impeccable:design-schema 1 -->

## Scope

This DESIGN.md records the visual world built for the SIWarga public landing page (`src/landing/`), for Perum Asabri Bumiayu Indah. It does not apply to the React admin SPA (`src/frontend/`), which is out of scope for this design pass and keeps its own shadcn-admin visual system.

## Direction: Monokrom (redesign, user-pinned)

**This replaces the original "Gapura Kompleks" direction** (a painted-gate motif assigned by the Impeccable direction roll). The user explicitly pinned a new aesthetic themselves — black-and-white, Apple/iBox-style product-page minimalism — which overrides any roll per new-work.md's "a user- or brief-pinned direction beats the roll, always." No concept-seed roll or challenger tournament ran for this redesign; the direction was built directly from the user's brief. Product truth (Perum Asabri Bumiayu Indah, its pages, structure, and content) carried over unchanged from `PRODUCT.md`; only the visual world changed. The old gapura look is retired — nothing from it (palette, Cinzel type, brick/plaster materials, cornice/coursed motifs) survives in this world.

## Palette — restrained monochrome

Pure grayscale, no accent color anywhere (a deliberate constraint the user confirmed explicitly, over the alternative of one accent color for CTAs). Hierarchy comes entirely from value contrast and full-bleed section color, not hue.

| Role | Token | Hex |
|---|---|---|
| Black (full-bleed sections) | `--black` | `#000000` |
| Ink (primary text on white) | `--ink` | `#1d1d1f` |
| White | `--white` | `#ffffff` |
| Paper (alt section ground) | `--paper` / `--gray-100` | `#f5f5f7` |
| Gray 200 (subtle fills) | `--gray-200` | `#e8e8ed` |
| Gray 300 (hairlines/borders) | `--gray-300` | `#d2d2d7` |
| Gray 500 (secondary text) | `--gray-500` | `#86868b` |
| Gray 700 (nav links) | `--gray-700` | `#424245` |
| On-dark text | `--on-dark` | `#f5f5f7` |
| On-dark secondary | `--on-dark-soft` | `#a1a1a6` |

## Type

- **Display & body** — Inter (Google Fonts, variable weight), tight tracking on display sizes (`-0.03em` to `-0.04em`). The mechanical detector flags Inter as an overused face — kept anyway, deliberately: the user's brief pins an "Apple/iBox" look specifically, and Inter's own design brief is to be a free, screen-optimized substitute for SF Pro. This is the brief justifying the choice, not the default-reflex the detector is built to catch.

## Structural motifs (reusable across pages)

- **Section rhythm**: full-bleed bands alternate `.section-white` / `.section-paper` / `.section-black` — the same light/dark pacing every Apple product page uses down a long scroll. Never a boxed/card-contained page — sections always run edge to edge.
- **Nav** (`Nav.astro`): sticky, translucent white with `backdrop-filter: blur()`, gains a hairline bottom border only once scrolled (`nav--scrolled`, toggled by a scroll listener) — the signature "reads as inert until you act on the page" interaction. Below 640px, the link list collapses behind a hamburger toggle (two authored bars that pivot into an X) instead of the horizontal scrollable row — the menu drops open as a full-width panel (`grid-template-rows` 0→1fr), closes on link click, `Escape`, or resize past the breakpoint.
- **Pill controls** (`.pill`, `.pill--dark` / `.pill--light` / `.pill--outline`): the one recurring control shape — full-round buttons, `--dark` (black-on-white text) for primary actions on light grounds, `--light` (white-on-black text) for primary actions on black grounds, `--outline` for secondary actions.
- **InfoCard** (`InfoCard.astro`): the reusable pengumuman/kegiatan tile — white (or `--dark` black variant for contrast between adjacent sections) rounded-20px card, generous padding, tag/badge header, `link-more` "Baca ›" footer. No rotation, no pinned/plaque affect — flat and precise, the opposite of the retired gapura world's tactile plaques.
- **Hairline dividers** (`.hairline`, 1px `--gray-300`): the only separator device; no shadows-as-borders, no colored rules.
- **Hero entrance** (`.hero-rise` in `global.css`): the single authored motion moment on the site — the homepage hero's four children (eyebrow, headline, subhead, actions) fade/rise in with a staggered `animation-delay` on load. Deliberately **not** scroll/IntersectionObserver-gated: an earlier draft gated every section's entrance on scroll visibility, which left all below-the-fold content at `opacity: 0` whenever a screenshot, crawler, or slow script beat the scroll — a real robustness bug, not just a review nit. Fixed by keeping every other section visible by default with zero motion, and confining the "one authored moment" rule to the hero alone.

## Components built

- `src/landing/src/layouts/BaseLayout.astro` — shell, nav, footer; carries the direction contract as the first HTML comment in `<body>`.
- `src/landing/src/components/Nav.astro` — sticky translucent nav with scroll-triggered hairline, mobile overflow fade-mask.
- `src/landing/src/components/InfoCard.astro` — pengumuman/kegiatan tile, light and dark variants.
- Pages: `index.astro` (Beranda/hero), `profil-komplek.astro`, `kontak.astro` (form with loading/success states, demo-only submit), `blog/index.astro` + one detail page, `kegiatan/index.astro` + one detail page with a galeri grid (flat neutral placeholder tiles, honestly labeled, replacing the old world's tilted brick-toned placeholders).

## Known gaps / what Plan B inherits

- No real photography exists yet for the complex. Galeri tiles render as honest, labeled placeholders (`--paper` tiles reading "Foto kegiatan #n — Menyusul dari pengurus RT") — replace with real photos through the admin Pages/Event-documentation upload flow once available.
- Content on every page is realistic demonstration copy (sample pengumuman, kegiatan, fasilitas) for design purposes — Plan B wires these pages to the real `GET /public/*` API endpoints, replacing the static arrays. **Plan B's Task 10 steps reference the retired gapura world's exact class names (`.gerbang__lede`, etc.) — those steps need a quick pass to match this redesign's markup (`.hero__lede`, `InfoCard` props, etc.) before execution.**
- Kontak form has no real `POST /public/contact` wiring yet (client-side demo state transition only) — Plan B owns that integration plus the rate limiter.
- `astro.config.mjs` is still `output: 'static'` for this design pass; Plan B switches it to `output: 'server'` and sets `export const prerender` per page for the hybrid rendering split.

## Process note

This redesign ran without a concept-seed roll (user-pinned direction) and without image generation (code-led). Finish review ran as a single in-thread inspection pass (screenshot round → one real fix batch, catching and fixing a scroll-reveal robustness bug that hid all below-the-fold content → confirmation round → `detect.mjs`) rather than the full dispatched `impeccable-finish-reviewer`/`impeccable-documenter` subagents, disclosed here per the skill's degraded-run convention — this is a pre-implementation design exploration, not a final merge-ready ship.
