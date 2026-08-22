# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (hybrid rendering: static prerender for Hero/Profil/Kontak, SSR on-demand for Blog/Kegiatan via `@astrojs/node` standalone adapter), new app at `src/landing/` in the SIWarga monorepo, consuming the existing Laravel API's unauthenticated `GET /public/*` endpoints (+ one `POST /public/contact`). Decided prior to this session in `docs/superpowers/specs/2026-08-21-landing-announcements-design.md` — not re-litigated here.

## Users

This PRODUCT.md scopes specifically to the public landing page surface (`src/landing/`), one of three independently deployed apps in the SIWarga system (the others: Laravel API, React admin SPA — already established, out of scope for Impeccable work here).

- **Warga (current residents)** of Perum Asabri Bumiayu Indah — check pengumuman (announcements), upcoming kegiatan (community events/activities), and event documentation/galeri without needing to log into the admin app.
- **Calon warga / tamu / keluarga** — people considering moving in, visiting a resident, or otherwise researching the complex before arriving. They land here first, need to quickly understand what the place is and how to get in touch (Kontak page/form).

## Product Purpose

A public-facing informational site for one specific, real residential complex — Perum Asabri Bumiayu Indah, Kelurahan Bumiayu, Kecamatan Kedungkandang, Kota Malang, Jawa Timur. It is the public window into the RT's SIWarga instance: what the complex is, what's happening in it, and how to reach the RT administration — without exposing any of the authenticated administration functionality (bills, resident data, etc.) that lives in the separate admin SPA.

Success = a visitor (resident or outsider) can, within seconds of landing, understand what/where this place is, see current announcements and events, and reach the RT via the contact form — on a phone, standing at the gate or scrolling at home.

## Positioning

Not a commercial product marketing page and not a generic "neighborhood app" template — it is the digital front door of one specific, real, established Indonesian residential community. Perum Asabri Bumiayu Indah is an Asabri-developed housing estate (originally military/veteran-affiliated housing), now a mature, densely built, settled neighborhood — not a new luxury or minimalist housing cluster. Its credibility comes from being lived-in and real (photos of actual streets, actual kegiatan, actual pengumuman), not from polish that reads like a property developer's sales brochure.

## Operating Context

- Content (Profil Komplek text, Kontak info, Blog/pengumuman, Kegiatan + galeri) is authored by RT admins in the existing React admin SPA (Tiptap rich-text editor) and served read-only to this landing site via the public API — the landing app itself has no admin/auth UI.
- Real photos of the complex (streets, gapura/gate, community events) are expected as the primary imagery once available; until supplied, layouts must degrade gracefully to text-led/illustrative treatments rather than stock "generic housing" photography, which would undercut the site's realness.
- Visited overwhelmingly on mobile (residents checking on the go, standing at a gate, in a WhatsApp-linked browser) — mobile-first is a hard requirement carried over from the wider SIWarga product (see root `CLAUDE.md`).
- Indonesian-language content throughout (bahasa Indonesia), consistent with the rest of SIWarga.

## Capabilities and Constraints

- Pages: Hero/Beranda, Profil Komplek, Kontak (with a contact form posting to `POST /public/contact`, rate-limited), Blog Publik (from published, `is_public` announcements), Daftar Kegiatan + detail (with galeri from `event_documentation`).
- No authentication anywhere on this surface; nothing here can assume a logged-in user.
- Content is HTML from a rich-text editor, already server-side sanitized before reaching this app — safe to render directly.
- No payment, e-commerce, or transactional capability on this surface — informational and lead/contact-capture only.
- No confirmed exact resident count, house count, or founding year for the complex — do not fabricate these as headline stats; use only what's confirmed or leave the field open for the RT admin to fill in via the Profil Komplek content.

## Brand Commitments

No pre-existing visual identity for Perum Asabri Bumiayu Indah (no logo, no color palette, no existing site) — designed from scratch. The SIWarga product name/branding does not need to appear prominently to the public; this page belongs to the RT/complex, not to the SIWarga product (white-label front door), though a small, unobtrusive "Didukung oleh SIWarga"-style credit is acceptable if it doesn't compete with the complex's own identity.

## Evidence on Hand

- Location confirmed via web search: Jalan Kyai Parseh Jaya, Kelurahan Bumiayu, Kecamatan Kedungkandang, Kota Malang, Jawa Timur 65135. [Perumahan Asabri Bumiayu Indah - Malang](http://wikimapia.org/37504090/Perumahan-Asabri-Bumiayu-Indah)
- General character confirmed via web search/listing sites: established, densely built residential community; houses commonly 1.5-floor, ~90-96 m²; residents describe it as well-maintained, close to public facilities, safe/comfortable, flood-free. [House for Sale in Perumnas Asabri, Bumiayu Indah](https://www.rumah123.com/en/property/malang-bumiayu/rumah-dijual-di-perumnas-asabri-bumiayu-indah-bumiayu-kec-kedungkandang-kota-malang-hos19095327/), [Rumah Asabri Bumiayu Indah - BRIGHTON Indonesia](https://www.brighton.co.id/search-property/view/perum-asabri-bumiayu-indah)
- No real photos, logo, testimonials, official founding date, or resident/house counts on hand — future work must not fabricate these as fact; use placeholder-labeled or illustrative treatments until the RT supplies real assets/content via the admin Pages module.

## Product Principles

1. Real place over generic template — every design decision should read as "this specific complex in Malang," not as an interchangeable neighborhood-app demo.
2. Mobile-first, low-friction — residents and visitors check this standing up, on 4G, often via a shared WhatsApp link; fast load and thumb-reachable navigation outrank decorative complexity.
3. Lived-in credibility over polish — favor real content (actual pengumuman, actual kegiatan/galeri) and honest placeholders over stock photography or invented statistics.
4. White-label to the complex, not the product — SIWarga is the platform underneath; the visitor should feel like they're on Perum Asabri Bumiayu Indah's own site.
5. Read-only public safety — this surface never assumes authentication and never exposes anything beyond what the RT has explicitly marked public.

## Accessibility & Inclusion

No resident-specific accessibility requirement confirmed yet; follow standard WCAG AA baseline (contrast, readable type sizes, keyboard/touch target sizing) as a default given the general/older-family resident audience typical of an established Indonesian perumahan.
