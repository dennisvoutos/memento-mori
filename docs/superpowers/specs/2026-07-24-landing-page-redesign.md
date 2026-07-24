# Landing Page Redesign — Design Spec

**Date:** 2026-07-24
**Status:** Approved
**Scope:** `frontend/src/pages/landing/` (new), `LandingPage.tsx` → orchestrator

## Goal

Transform the public landing page (`/`) into a story-driven, immersive showcase that drives visitor signups for memorial creation. Primary CTA: "Create a Memorial." Secondary: browse existing memorials, learn about the platform.

## Design Approach

**Cinematic Hybrid** — story-driven narrative scroll with lightweight canvas particles and Framer Motion scroll animations. No Three.js. No API changes.

### New dependency
- `framer-motion` (~10KB gzipped) — scroll-triggered section animations, `whileInView`, `useInView`, `useScroll`

---

## 1. Page Structure & Narrative Flow

Nine sections in a vertical scroll. Two CTAs: inline at section 4 (soft, encouraging), final at section 9 (bold, urgent).

### Section 1: Hero
- Ethereal canvas particle field. Soft floating particles (lavender/gold tones).
- Logo with CSS glow pulse animation (`box-shadow` + `filter: blur`).
- Headline "Honoring Every Story." fades up on mount.
- Subtitle: "A quiet, beautiful space to remember and celebrate those who shaped our lives."
- Slim rounded search bar. "Search for a memorial…" placeholder.
- "Create a Memorial" CTA button. Gold-tinted hover glow.
- Canvas degrades to CSS gradient if `CanvasRenderingContext2D` unavailable.

### Section 2: Stats River
- Animated odometer counters: "X Memorials Created", "Y Candles Lit", "Z Stories Shared".
- Numbers tick up via `requestAnimationFrame` when section scrolls into view (`IntersectionObserver`).
- Light lavender gradient background (`--color-bg-accent`).
- Data from: `api.search.memorials('', 1, 1)` for total count, `api.interactions.stats()` for candles/messages.

### Section 3: How It Works
- Three step cards revealed sequentially on scroll (`whileInView` with stagger).
- **Create** — "Add their name, dates, and photo."
- **Personalize** — "Share their life story, timeline, and gallery."
- **Share** — "Invite family and friends to remember together."
- Silver line connectors between cards on desktop.
- Icons animate on card reveal.

### Section 4: Inline CTA
- Soft silver/lavender background.
- "Ready to begin?" headline.
- "Create a Memorial" button.
- Subtext: "Takes less than 5 minutes. Free forever."
- Routes to `/register` if unauthenticated, `/memorials/new` if logged in.

### Section 5: "Their Stories" — Featured Memorials
- Horizontal scroll carousel of up to 6 public memorials.
- Cards: profile photo circle, full name, birth–passing years.
- Cards tilt slightly on hover (CSS `transform: rotateY(2deg)`).
- "View All" link routes to `/browse`.
- Data from: `api.search.memorials('', 1, 6)` (same as current).
- Scrollable via touch drag on mobile; arrow keys on desktop.

### Section 6: "Why We Remember"
- Large serif pull-quote: "A life is not measured by its length but by the love it leaves behind."
- Attribution line below.
- Softest lavender backdrop. Text fades up on scroll.

### Section 7: Feature Highlights
- 3-column grid (2 on tablet, 1 on mobile).
- Six feature tiles with icon + one-liner:
  - Permanent & Free, Private or Public, Photo Galleries, Candle Lighting, Life Timeline, Tributes & Messages.
- No animations beyond section entrance. Clean, scannable.

### Section 8: Community
- Canvas visualization: glowing dots forming a heart shape.
- "Join X families who have created memorials" text overlay.
- Canvas degrades to static SVG heart if no canvas support.
- Same particle system as Hero, different configuration (heart shape vs scattered).

### Section 9: Final CTA
- Dark section (`--color-bg-inverse`, charcoal/silver).
- Inverted from rest of page — signals "end, decision time."
- "Start Their Memorial Today." headline.
- Big CTA button with glow.
- "Free. Permanent. Beautiful." subtext.

---

## 2. Color & Typography

### Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#FAFAFC` | Page background |
| `--color-bg-elevated` | `#FFFFFF` | Cards, section backgrounds |
| `--color-bg-accent` | `#F6F4FB` | Lavender sections (stats, quote, inline CTA) |
| `--color-bg-inverse` | `#1E1E24` | Final CTA |
| `--color-primary` | `#7B6F9E` | Buttons, accent elements |
| `--color-primary-hover` | `#655A8A` | Button hover |
| `--color-gold` | `#C5A059` | Kept as signature accent: candle flames, icon highlights |
| `--color-text-primary` | `#1E1E24` | Headlines, body text |
| `--color-text-secondary` | `#6E6E7A` | Subtitles |
| `--color-text-tertiary` | `#9E9EAA` | Muted labels |
| `--color-border` | `#E8E6F0` | Borders, dividers |
| `--color-glow` | `rgba(123, 111, 158, 0.25)` | Logo glow, particle color |

### Typography
- **Headlines:** Playfair Display, weight 400 or 500 (airy), `letter-spacing: -0.3px`
- **Body:** Inter, weight 400, `line-height: 1.7`
- **CTAs:** Inter or Playfair Display, weight 600
- Fonts already loaded in `index.html` via Google Fonts — no change.

---

## 3. Component Architecture

```
frontend/src/pages/landing/
  LandingPage.tsx                  ← orchestrator (~60 lines)
  LandingPage.css                  ← shared layout, section spacing, keyframes
  sections/
    HeroSection.tsx                ← canvas particles, logo, headline, search, CTA
    HeroSection.css
    StatsRiver.tsx                 ← animated odometer counters
    StatsRiver.css
    HowItWorks.tsx                 ← 3-step cards, scroll-reveal stagger
    HowItWorks.css
    InlineCTA.tsx                  ← soft "Ready to begin?" CTA
    InlineCTA.css
    FeaturedMemorials.tsx          ← horizontal scroll carousel
    FeaturedMemorials.css
    WhyWeRemember.tsx              ← pull-quote
    WhyWeRemember.css
    FeatureHighlights.tsx          ← 3-column icon feature grid
    FeatureHighlights.css
    CommunitySection.tsx           ← canvas heart particles
    CommunitySection.css
    FinalCTA.tsx                   ← dark section, final CTA
    FinalCTA.css
  hooks/
    useCountUp.ts                  ← odometer animation hook
    useParticleCanvas.ts           ← shared canvas particle system
```

**LandingPage orchestrator** — renders all 9 sections in order. Lazy-loads sections not in initial viewport via `React.lazy()`. Handles the single `api.search.memorials()` + `api.interactions.stats()` calls, passes data down as props.

### Data Flow (no API changes)

| Section | Data | Source |
|---|---|---|
| Hero | `isAuthenticated` | `useAuthStore` |
| Stats River | Memorial count, candle count, message count | `api.search.memorials('', 1, 1).total` + `api.interactions.stats()` |
| How It Works | Static | — |
| Inline CTA | `isAuthenticated` | `useAuthStore` |
| Featured Memorials | 6 public memorials | `api.search.memorials('', 1, 6)` |
| Why We Remember | Static | — |
| Feature Highlights | Static | — |
| Community | Memorial count (reused) | Same as Stats River |
| Final CTA | `isAuthenticated` | `useAuthStore` |

---

## 4. Hooks

### `useCountUp(target: number, options?: { duration?: number })`
- Returns `{ count: number, ref: RefObject }`.
- Uses `IntersectionObserver` to detect when ref enters viewport.
- Animates from 0 to target via `requestAnimationFrame` with easing.
- Duration defaults to 2000ms. Cleanup on unmount.
- Returns 0 if target is 0 (no animation needed).

### `useParticleCanvas(config: ParticleConfig)`
- Returns `{ canvasRef: RefObject<HTMLCanvasElement> }`.
- Manages canvas lifecycle: init, animation loop, resize, cleanup.
- Respects `prefers-reduced-motion` — returns static frame instead of animation loop.
- Particle config: `{ count, colors, shape, speed, opacity }`.
- Hero: scattered particles, ~80 count, lavender + gold.
- Community: heart-shaped particles, ~120 count, lavender only.

---

## 5. States & Edge Cases

| Component | Loading | Empty | Error | Edge |
|---|---|---|---|---|
| Hero | N/A | N/A | N/A | Canvas falls back to CSS gradient |
| Stats River | Skeleton shimmer (3 pills) | "Be the first" — show zeros, softer messaging | Hide section entirely | `IntersectionObserver` not polyfilled (97%+ support) |
| Featured Memorials | Skeleton cards (3) | "No memorials yet. Create the first!" + CTA | Hide carousel, show "View memorials" link | <3 memorials: grid shrinks to 1-2 cols, centered |
| Community | Skeleton circle | Static heart shape, count=0, "Be among the first" | Hide canvas, show static text | Same canvas fallback as Hero |
| All CTAs | N/A | N/A | N/A | Keyboard accessible, `:focus-visible` ring |

## 6. Accessibility

- All `<section>` elements have `aria-label` describing content.
- Canvas elements carry `role="img"` + `aria-label`.
- Odometer numbers have `aria-live="polite"`.
- Carousel supports left/right arrow key navigation, `tabindex` management per visible card.
- `prefers-reduced-motion: reduce` disables all scroll animations; canvas particles disabled (static gradient).
- WCAG AA contrast: 4.5:1 on light backgrounds, 3:1 on dark (Final CTA).
- Touch targets minimum 44×44px.
- Focus order follows visual order.

## 7. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| < 768px (mobile) | Single column. Hero canvas: 40 particles. Stats stacked vertically. How It Works cards vertical. Carousel: swipe-native touch scroll. Feature grid: 1 column. Final CTA: full-width. |
| 768–1024px (tablet) | 2-column grids where applicable. Hero canvas: 60 particles. Feature grid: 2 columns. |
| > 1024px (desktop) | Full layout. Hero canvas: 80 particles. Feature grid: 3 columns. Carousel with arrow buttons visible. |

## 8. Performance

- Sections below fold lazy-loaded via `React.lazy()` + `Suspense`.
- Canvas animation loops destroyed when section leaves viewport (`useInView` cleanup in `useParticleCanvas`).
- No parallax images — avoid mobile jank. Canvas is the only heavy visual element.
- `will-change: transform` on animated elements only during animation window.
- Framer Motion `layout` animations kept to `opacity` + `transform` only (GPU-composited).
- Bundle impact: `framer-motion` ~10KB gzipped. Canvas hooks ~2KB total.

## 9. Testing

### Unit tests (new)
- `LandingPage.test.tsx` — orchestrator renders all 9 sections, CTA routing logic (auth vs anon), data fetching states.
- `HeroSection.test.tsx` — renders, canvas present, search form submits, CTA click.
- `StatsRiver.test.tsx` — renders with data, skeleton state, zero state.
- `HowItWorks.test.tsx` — renders all 3 steps.
- `FeaturedMemorials.test.tsx` — renders cards, empty state, <3 items.
- `useCountUp.test.ts` — animation ticks, final value equals target, cleanup on unmount, zero target no-ops.
- `useParticleCanvas.test.ts` — canvas element created, animation loop starts, cleanup stops loop, `prefers-reduced-motion` returns static frame.

### Existing tests to update
- `LandingPage.test.tsx` at `frontend/src/pages/LandingPage.test.tsx` — exists, will be rewritten to test orchestrator behavior.

## 10. Implementation Order

1. Install `framer-motion`, create directory structure, CSS variables.
2. `useCountUp` + `useParticleCanvas` hooks.
3. `HeroSection` + `FinalCTA` (bookend the page).
4. `StatsRiver` + `FeaturedMemorials` (data-dependent sections).
5. `HowItWorks` + `InlineCTA` + `WhyWeRemember` (static content).
6. `FeatureHighlights` + `CommunitySection`.
7. `LandingPage` orchestrator — wire all sections, lazy loading, data fetching.
8. Responsive polish + accessibility audit.
9. Tests.
10. Remove old `LandingPage.tsx` + `LandingPage.css`.
