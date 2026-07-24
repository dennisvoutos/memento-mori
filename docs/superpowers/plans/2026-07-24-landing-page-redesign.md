# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the public landing page (`/`) into a 9-section cinematic narrative scroll that drives visitor signups for memorial creation.

**Architecture:** New `frontend/src/pages/landing/` directory with section components + 2 shared canvas hooks + 1 Framer Motion dependency. One new backend endpoint `GET /api/stats/public` for global memorial/candle/message counts. No other API changes. LandingPage becomes a thin orchestrator.

**Tech Stack:** React 19, TypeScript, Framer Motion, Canvas 2D API, Ant Design (Skeleton only), existing CSS module patterns.

## Global Constraints

- New dependency: `framer-motion` (^11.x), install via `npm install --workspace=frontend framer-motion`
- Color palette: `--color-bg-primary: #FAFAFC`, `--color-bg-accent: #F6F4FB`, `--color-bg-inverse: #1E1E24`, `--color-primary: #7B6F9E`, `--color-gold: #C5A059`
- No API changes to existing endpoints — one new endpoint only
- All sections must handle loading, empty, error states
- Canvas degrades gracefully when `CanvasRenderingContext2D` unavailable
- `prefers-reduced-motion: reduce` disables all scroll animations + canvas particles
- WCAG AA contrast on all text (4.5:1 light bg, 3:1 dark bg)
- Mobile first: <768px single column, 768-1024px 2-column, >1024px 3-column
- Existing test infrastructure: antd globally mocked, `@ant-design/icons` proxy stub, `renderWithRouter` for routing tests

---

## File Map

```
Create:  shared/src/stats-schemas.ts                (new public stats response schema)
Create:  backend/src/routes/stats.ts                (new GET /api/stats/public route)
Modify:  backend/src/index.ts                       (register stats router)
Modify:  frontend/src/services/api.ts               (add api.stats.public() method)
Modify:  frontend/src/App.tsx                        (update / route import)
Create:  frontend/src/pages/landing/LandingPage.tsx  (orchestrator)
Create:  frontend/src/pages/landing/LandingPage.css  (shared layout + keyframes)
Create:  frontend/src/pages/landing/hooks/useCountUp.ts
Create:  frontend/src/pages/landing/hooks/useParticleCanvas.ts
Create:  frontend/src/pages/landing/sections/HeroSection.tsx
Create:  frontend/src/pages/landing/sections/HeroSection.css
Create:  frontend/src/pages/landing/sections/StatsRiver.tsx
Create:  frontend/src/pages/landing/sections/StatsRiver.css
Create:  frontend/src/pages/landing/sections/HowItWorks.tsx
Create:  frontend/src/pages/landing/sections/HowItWorks.css
Create:  frontend/src/pages/landing/sections/InlineCTA.tsx
Create:  frontend/src/pages/landing/sections/InlineCTA.css
Create:  frontend/src/pages/landing/sections/FeaturedMemorials.tsx
Create:  frontend/src/pages/landing/sections/FeaturedMemorials.css
Create:  frontend/src/pages/landing/sections/WhyWeRemember.tsx
Create:  frontend/src/pages/landing/sections/WhyWeRemember.css
Create:  frontend/src/pages/landing/sections/FeatureHighlights.tsx
Create:  frontend/src/pages/landing/sections/FeatureHighlights.css
Create:  frontend/src/pages/landing/sections/CommunitySection.tsx
Create:  frontend/src/pages/landing/sections/CommunitySection.css
Create:  frontend/src/pages/landing/sections/FinalCTA.tsx
Create:  frontend/src/pages/landing/sections/FinalCTA.css
Create:  frontend/src/pages/landing/LandingPage.test.tsx
Create:  frontend/src/pages/landing/hooks/useCountUp.test.ts
Create:  frontend/src/pages/landing/hooks/useParticleCanvas.test.ts
Remove:  frontend/src/pages/LandingPage.tsx            (replaced by orchestrator)
Remove:  frontend/src/pages/LandingPage.css            (replaced by new styles)
Remove:  frontend/src/pages/LandingPage.test.tsx       (replaced)
```

---

### Task 1: Public stats endpoint — shared schema

**Files:**
- Create: `shared/src/stats-schemas.ts`
- Modify: `shared/src/index.ts` (export new schema + type)

**Interfaces:**
- Produces: `publicStatsResponseSchema`, `PublicStatsResponse` type — `{ memorialCount: number, candleCount: number, messageCount: number }`

- [ ] **Step 1: Write the schema**

Create `shared/src/stats-schemas.ts`:

```typescript
import { z } from 'zod';

export const publicStatsResponseSchema = z.object({
  memorialCount: z.number().int().nonnegative(),
  candleCount: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
});

export type PublicStatsResponse = z.infer<typeof publicStatsResponseSchema>;
```

- [ ] **Step 2: Export from shared index**

In `shared/src/index.ts`, add after existing exports:

```typescript
export {
  publicStatsResponseSchema,
  type PublicStatsResponse,
} from './stats-schemas.js';
```

- [ ] **Step 3: Build shared package**

```bash
npm run --workspace=shared build
```

Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add shared/src/stats-schemas.ts shared/src/index.ts
git commit -m "feat: add public stats response schema"
```

---

### Task 2: Public stats endpoint — backend route

**Files:**
- Create: `backend/src/routes/stats.ts`
- Modify: `backend/src/index.ts` (register route, lines ~27-29)

**Interfaces:**
- Consumes: `publicStatsResponseSchema` from `@memento-mori/shared`
- Produces: `GET /api/stats/public` → `{ memorialCount, candleCount, messageCount }`

- [ ] **Step 1: Write the route**

Create `backend/src/routes/stats.ts`:

```typescript
import { Router } from 'express';
import { publicStatsResponseSchema } from '@memento-mori/shared';
import { prisma } from '../lib/prisma.js';

export const statsRouter = Router();

// GET /api/stats/public — global public stats for landing page
statsRouter.get('/public', async (_req, res, next) => {
  try {
    const [memorialCount, candleCount, messageCount] = await Promise.all([
      prisma.memorial.count({ where: { privacyLevel: 'PUBLIC' } }),
      prisma.visitorInteraction.count({ where: { type: 'CANDLE' } }),
      prisma.visitorInteraction.count({ where: { type: 'MESSAGE' } }),
    ]);

    const body = publicStatsResponseSchema.parse({
      memorialCount,
      candleCount,
      messageCount,
    });

    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Register route in index.ts**

In `backend/src/index.ts`, after the search router line (`import { searchRouter } from './routes/search.js';`), add:

```typescript
import { statsRouter } from './routes/stats.js';
```

After the existing route registrations (around line 55-60), add:

```typescript
app.use('/api/stats', statsRouter);
```

- [ ] **Step 3: Verify the endpoint compiles**

```bash
npm run build:backend
```

Expected: TypeScript compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/stats.ts backend/src/index.ts
git commit -m "feat: add public stats endpoint (GET /api/stats/public)"
```

---

### Task 3: Install framer-motion + directory structure + CSS variables

**Files:**
- Modify: `frontend/package.json` (new dependency)
- Create: `frontend/src/pages/landing/` directory structure (empty files)
- Create: `frontend/src/pages/landing/LandingPage.css` (CSS variables only)

**Interfaces:**
- Produces: `framer-motion` available for all subsequent tasks

- [ ] **Step 1: Install framer-motion**

```bash
npm install --workspace=frontend framer-motion
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p frontend/src/pages/landing/sections
mkdir -p frontend/src/pages/landing/hooks
```

- [ ] **Step 3: Write CSS variables**

Create `frontend/src/pages/landing/LandingPage.css`:

```css
/* ── Landing Page Design Tokens ── */
:root {
  --lp-bg-primary: #FAFAFC;
  --lp-bg-elevated: #FFFFFF;
  --lp-bg-accent: #F6F4FB;
  --lp-bg-inverse: #1E1E24;
  --lp-primary: #7B6F9E;
  --lp-primary-hover: #655A8A;
  --lp-gold: #C5A059;
  --lp-text-primary: #1E1E24;
  --lp-text-secondary: #6E6E7A;
  --lp-text-tertiary: #9E9EAA;
  --lp-border: #E8E6F0;
  --lp-glow: rgba(123, 111, 158, 0.25);
}

/* ── Shared section layout ── */
.landing-section {
  padding: 80px 24px;
  position: relative;
  overflow: hidden;
}

.landing-section-inner {
  max-width: 960px;
  margin: 0 auto;
}

.landing-section-title {
  font-family: 'Playfair Display', 'Lora', Georgia, serif;
  font-size: 32px;
  font-weight: 500;
  color: var(--lp-text-primary);
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: -0.3px;
}

.landing-section-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: var(--lp-text-secondary);
  text-align: center;
  max-width: 560px;
  margin: 0 auto 48px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .landing-section {
    padding: 56px 16px;
  }
  .landing-section-title {
    font-size: 26px;
  }
}
```

- [ ] **Step 4: Verify install**

```bash
node -e "require('framer-motion')" 2>&1 || echo "not CJS — check ESM"
```

If that fails (ESM-only): `cd frontend && node -e "import('framer-motion').then(() => console.log('OK'))"`

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/landing/
git commit -m "chore: add framer-motion, landing page structure + CSS tokens"
```

---

### Task 4: useCountUp hook

**Files:**
- Create: `frontend/src/pages/landing/hooks/useCountUp.ts`
- Create: `frontend/src/pages/landing/hooks/useCountUp.test.ts`

**Interfaces:**
- Produces: `useCountUp({ target, duration? }): { count: number, ref: RefObject<HTMLSpanElement> }`
- Exported from `hooks/useCountUp.ts` as named export

- [ ] **Step 1: Write the test**

Create `frontend/src/pages/landing/hooks/useCountUp.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

// Mock IntersectionObserver
let observerCallback: (entries: IntersectionObserverEntry[]) => void;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn((cb: IntersectionObserverCallback) => {
  observerCallback = cb as (entries: IntersectionObserverEntry[]) => void;
  return { observe: mockObserve, disconnect: mockDisconnect, unobserve: vi.fn(), takeRecords: vi.fn() };
});
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

// Mock requestAnimationFrame
let rafCallbacks: Array<(time: number) => void> = [];
const mockRaf = vi.fn((cb: FrameRequestCallback) => {
  rafCallbacks.push(cb as (time: number) => void);
  return rafCallbacks.length;
});
vi.stubGlobal('requestAnimationFrame', mockRaf);

function tickRaf(time: number) {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb(time));
}

describe('useCountUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
    observerCallback = undefined as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('returns 0 initially and a ref', () => {
    const { result } = renderHook(() => useCountUp({ target: 100 }));
    expect(result.current.count).toBe(0);
    expect(result.current.ref).toBeDefined();
  });

  it('observes the element on mount', () => {
    renderHook(() => useCountUp({ target: 100 }));
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = renderHook(() => useCountUp({ target: 100 }));
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('stays at 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 0 }));
    expect(result.current.count).toBe(0);
  });

  it('animates to target when intersecting', () => {
    const { result } = renderHook(() => useCountUp({ target: 100, duration: 100 }));
    
    // Simulate intersection
    act(() => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    // Tick raf to final (duration passed)
    act(() => {
      tickRaf(100);
    });

    expect(result.current.count).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/pages/landing/hooks/useCountUp.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useCountUp**

Create `frontend/src/pages/landing/hooks/useCountUp.ts`:

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
}

export function useCountUp({ target, duration = 2000 }: UseCountUpOptions) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));

            if (progress < 1) {
              rafId.current = requestAnimationFrame(tick);
            }
          };

          rafId.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  return { count, ref };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/pages/landing/hooks/useCountUp.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/landing/hooks/useCountUp.ts frontend/src/pages/landing/hooks/useCountUp.test.ts
git commit -m "feat: add useCountUp hook with IntersectionObserver-driven animation"
```

---

### Task 5: useParticleCanvas hook

**Files:**
- Create: `frontend/src/pages/landing/hooks/useParticleCanvas.ts`
- Create: `frontend/src/pages/landing/hooks/useParticleCanvas.test.ts`

**Interfaces:**
- Produces: `useParticleCanvas(config: ParticleConfig): { canvasRef: RefObject<HTMLCanvasElement> }`
- `ParticleConfig`: `{ count: number; colors: string[]; speed: number; shape: 'scattered' | 'heart' }`

- [ ] **Step 1: Write the test**

Create `frontend/src/pages/landing/hooks/useParticleCanvas.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useParticleCanvas } from './useParticleCanvas';

// Mock canvas context
const mockFillRect = vi.fn();
const mockBeginPath = vi.fn();
const mockArc = vi.fn();
const mockFill = vi.fn();
const mockClearRect = vi.fn();
const mockGetContext = vi.fn(() => ({
  fillRect: mockFillRect,
  beginPath: mockBeginPath,
  arc: mockArc,
  fill: mockFill,
  clearRect: mockClearRect,
}));

vi.stubGlobal('HTMLCanvasElement', class {
  getContext = mockGetContext;
  width = 0;
  height = 0;
});

// Mock matchMedia
vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));

const mockRaf = vi.fn(() => 1);
vi.stubGlobal('requestAnimationFrame', mockRaf);
vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('useParticleCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a canvas ref', () => {
    const { result } = renderHook(() =>
      useParticleCanvas({ count: 10, colors: ['#fff'], speed: 0.5, shape: 'scattered' })
    );
    expect(result.current.canvasRef).toBeDefined();
  });

  it('starts animation loop on mount', () => {
    renderHook(() =>
      useParticleCanvas({ count: 10, colors: ['#fff'], speed: 0.5, shape: 'scattered' })
    );
    expect(mockRaf).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/pages/landing/hooks/useParticleCanvas.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement useParticleCanvas**

Create `frontend/src/pages/landing/hooks/useParticleCanvas.ts`:

```typescript
import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  baseX?: number;
  baseY?: number;
}

export interface ParticleConfig {
  count: number;
  colors: string[];
  speed: number;
  shape: 'scattered' | 'heart';
}

function heartPosition(t: number, scale: number): { x: number; y: number } {
  // Parametric heart curve
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: -y * scale };
}

function createParticles(
  canvas: HTMLCanvasElement,
  config: ParticleConfig
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < config.count; i++) {
    let x: number;
    let y: number;
    let baseX: number | undefined;
    let baseY: number | undefined;

    if (config.shape === 'heart') {
      const t = (i / config.count) * Math.PI * 2;
      const pos = heartPosition(t, 8);
      x = canvas.width / 2 + pos.x + (Math.random() - 0.5) * 30;
      y = canvas.height / 2 + pos.y + (Math.random() - 0.5) * 30;
      baseX = x;
      baseY = y;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    }

    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * config.speed,
      vy: (Math.random() - 0.5) * config.speed,
      radius: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      baseX,
      baseY,
    });
  }
  return particles;
}

export function useParticleCanvas(config: ParticleConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatingRef = useRef(false);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const particles = createParticles(canvas, config);

    if (reducedMotion) {
      // Draw one static frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * 0.6;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      return () => window.removeEventListener('resize', resize);
    }

    animatingRef.current = true;

    const animate = () => {
      if (!animatingRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (p.baseX !== undefined && p.baseY !== undefined) {
          // Heart shape: gentle drift around base position
          p.x = p.baseX + Math.sin(Date.now() * 0.001 + p.baseX * 0.01) * 1.5;
          p.y = p.baseY + Math.cos(Date.now() * 0.001 + p.baseY * 0.01) * 1.5;
        } else {
          // Scattered: float and wrap
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      animatingRef.current = false;
      window.removeEventListener('resize', resize);
    };
  }, [config, reducedMotion]);

  return { canvasRef };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/pages/landing/hooks/useParticleCanvas.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/landing/hooks/useParticleCanvas.ts frontend/src/pages/landing/hooks/useParticleCanvas.test.ts
git commit -m "feat: add useParticleCanvas hook — scattered + heart shape particles"
```

---

### Task 6: HowItWorks section (static)

**Files:**
- Create: `frontend/src/pages/landing/sections/HowItWorks.tsx`
- Create: `frontend/src/pages/landing/sections/HowItWorks.css`

**Interfaces:**
- Produces: `<HowItWorks />` — renders three step cards with scroll-reveal stagger
- No props, no data dependencies

- [ ] **Step 1: Write the component**

Create `frontend/src/pages/landing/sections/HowItWorks.tsx`:

```typescript
import { motion } from 'framer-motion';
import './HowItWorks.css';

const STEPS = [
  {
    step: '01',
    title: 'Create',
    description: 'Add their name, dates, and a photo. Everything starts with a simple form — takes just a few minutes.',
  },
  {
    step: '02',
    title: 'Personalize',
    description: 'Share their life story, add timeline moments, and build a photo gallery that tells who they were.',
  },
  {
    step: '03',
    title: 'Share',
    description: 'Invite family and friends to light candles, leave messages, and keep their memory alive together.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6, ease: 'easeOut' },
  }),
};

export function HowItWorks() {
  return (
    <section className="landing-section how-it-works" aria-label="How it works">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-subtitle">
          Creating a beautiful memorial is simple. Here's how.
        </p>
        <div className="hiw-grid">
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              className="hiw-card"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
            >
              <span className="hiw-step">{item.step}</span>
              <h3 className="hiw-title">{item.title}</h3>
              <p className="hiw-desc">{item.description}</p>
            </motion.div>
          ))}
        </div>
        {/* Connector lines between cards (desktop only) */}
        <div className="hiw-connector" aria-hidden="true">
          <span className="hiw-line" />
        </div>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/HowItWorks.css`:

```css
.how-it-works {
  background: var(--lp-bg-elevated);
}

.hiw-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  position: relative;
}

.hiw-card {
  background: var(--lp-bg-primary);
  border: 1px solid var(--lp-border);
  border-radius: 16px;
  padding: 36px 28px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.hiw-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--lp-bg-accent);
  color: var(--lp-primary);
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.hiw-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 500;
  color: var(--lp-text-primary);
  margin-bottom: 10px;
}

.hiw-desc {
  font-size: 14px;
  color: var(--lp-text-secondary);
  line-height: 1.7;
}

.hiw-connector {
  display: none;
}

@media (min-width: 1024px) {
  .hiw-connector {
    display: block;
    position: absolute;
    top: 50%;
    left: 15%;
    right: 15%;
    height: 1px;
    z-index: 0;
  }

  .hiw-line {
    display: block;
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--lp-border) 20%,
      var(--lp-border) 80%,
      transparent 100%
    );
  }
}

@media (max-width: 768px) {
  .hiw-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .hiw-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/landing/sections/HowItWorks.tsx frontend/src/pages/landing/sections/HowItWorks.css
git commit -m "feat: add HowItWorks section — 3-step cards with scroll reveal stagger"
```

---

### Task 7: WhyWeRemember + FeatureHighlights sections (static)

**Files:**
- Create: `frontend/src/pages/landing/sections/WhyWeRemember.tsx`
- Create: `frontend/src/pages/landing/sections/WhyWeRemember.css`
- Create: `frontend/src/pages/landing/sections/FeatureHighlights.tsx`
- Create: `frontend/src/pages/landing/sections/FeatureHighlights.css`

**Interfaces:**
- Produces: `<WhyWeRemember />`, `<FeatureHighlights />` — both stateless presentational

- [ ] **Step 1: Write WhyWeRemember**

Create `frontend/src/pages/landing/sections/WhyWeRemember.tsx`:

```typescript
import { motion } from 'framer-motion';
import './WhyWeRemember.css';

export function WhyWeRemember() {
  return (
    <section className="landing-section why-we-remember" aria-label="Why we remember">
      <div className="landing-section-inner">
        <motion.blockquote
          className="wwr-quote"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <p>
            &ldquo;A life is not measured by its length
            <br />
            but by the love it leaves behind.&rdquo;
          </p>
          <footer className="wwr-attribution">&mdash; Unknown</footer>
        </motion.blockquote>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/WhyWeRemember.css`:

```css
.why-we-remember {
  background: var(--lp-bg-accent);
  min-height: 360px;
  display: flex;
  align-items: center;
}

.wwr-quote {
  text-align: center;
  border: none;
  margin: 0;
  padding: 0;
}

.wwr-quote p {
  font-family: 'Playfair Display', 'Lora', Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  color: var(--lp-text-primary);
  line-height: 1.5;
  margin-bottom: 16px;
  font-style: italic;
}

.wwr-attribution {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--lp-text-tertiary);
  font-style: normal;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .wwr-quote p {
    font-size: 22px;
  }
}
```

- [ ] **Step 2: Write FeatureHighlights**

Create `frontend/src/pages/landing/sections/FeatureHighlights.tsx`:

```typescript
import { motion } from 'framer-motion';
import './FeatureHighlights.css';

const FEATURES = [
  { icon: '🏛️', title: 'Permanent & Free', desc: 'Your memorial stays online forever. No subscription, no hidden costs.' },
  { icon: '🔒', title: 'Private or Public', desc: 'You choose who sees it — keep it private, share with a link, or make it public.' },
  { icon: '🖼️', title: 'Photo Galleries', desc: 'Upload photos that tell their story. Beautiful galleries with lightbox viewing.' },
  { icon: '🕯️', title: 'Light a Candle', desc: 'Visitors can light virtual candles — a simple, powerful gesture of remembrance.' },
  { icon: '📅', title: 'Life Timeline', desc: 'Mark the moments that mattered. From birth to the legacy they left behind.' },
  { icon: '💬', title: 'Tributes & Messages', desc: 'Friends and family leave messages, quotes, and memories on the memorial wall.' },
];

export function FeatureHighlights() {
  return (
    <section className="landing-section feature-highlights" aria-label="Features">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">Everything You Need</h2>
        <p className="landing-section-subtitle">
          A complete space to honor, remember, and celebrate a life well lived.
        </p>
        <div className="fh-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="fh-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <span className="fh-icon" aria-hidden="true">{f.icon}</span>
              <h3 className="fh-title">{f.title}</h3>
              <p className="fh-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/FeatureHighlights.css`:

```css
.feature-highlights {
  background: var(--lp-bg-primary);
}

.fh-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

.fh-card {
  background: var(--lp-bg-elevated);
  border: 1px solid var(--lp-border);
  border-radius: 14px;
  padding: 32px 24px;
  text-align: center;
}

.fh-icon {
  display: block;
  font-size: 32px;
  margin-bottom: 14px;
}

.fh-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px;
  font-weight: 600;
  color: var(--lp-text-primary);
  margin-bottom: 8px;
}

.fh-desc {
  font-size: 13px;
  color: var(--lp-text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .fh-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .fh-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}
```

- [ ] **Step 3: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/sections/WhyWeRemember.tsx frontend/src/pages/landing/sections/WhyWeRemember.css frontend/src/pages/landing/sections/FeatureHighlights.tsx frontend/src/pages/landing/sections/FeatureHighlights.css
git commit -m "feat: add WhyWeRemember + FeatureHighlights sections"
```

---

### Task 8: InlineCTA + FinalCTA sections (static, shared routing logic)

**Files:**
- Create: `frontend/src/pages/landing/sections/InlineCTA.tsx`
- Create: `frontend/src/pages/landing/sections/InlineCTA.css`
- Create: `frontend/src/pages/landing/sections/FinalCTA.tsx`
- Create: `frontend/src/pages/landing/sections/FinalCTA.css`

**Interfaces:**
- Consumes: `useAuthStore` for `isAuthenticated`
- Produces: `<InlineCTA />`, `<FinalCTA />` — both route to `/register` or `/memorials/new`

- [ ] **Step 1: Write InlineCTA**

Create `frontend/src/pages/landing/sections/InlineCTA.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import './InlineCTA.css';

export function InlineCTA() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleClick = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section inline-cta" aria-label="Get started">
      <div className="landing-section-inner">
        <div className="icta-box">
          <h2 className="icta-heading">Ready to begin?</h2>
          <p className="icta-sub">Takes less than 5 minutes. Free forever.</p>
          <button className="icta-button" onClick={handleClick} type="button">
            Create a Memorial
          </button>
        </div>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/InlineCTA.css`:

```css
.inline-cta {
  background: var(--lp-bg-accent);
}

.icta-box {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  padding: 48px 32px;
  background: var(--lp-bg-elevated);
  border: 1px solid var(--lp-border);
  border-radius: 18px;
}

.icta-heading {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  font-weight: 500;
  color: var(--lp-text-primary);
  margin-bottom: 8px;
}

.icta-sub {
  font-size: 15px;
  color: var(--lp-text-secondary);
  margin-bottom: 24px;
}

.icta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--lp-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.icta-button:hover {
  background: var(--lp-primary-hover);
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Write FinalCTA**

Create `frontend/src/pages/landing/sections/FinalCTA.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import './FinalCTA.css';

export function FinalCTA() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleClick = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section final-cta" aria-label="Start a memorial">
      <div className="landing-section-inner">
        <h2 className="fcta-heading">Start Their Memorial Today</h2>
        <p className="fcta-sub">
          Free. Permanent. Beautiful.
        </p>
        <button className="fcta-button" onClick={handleClick} type="button">
          Create a Memorial
        </button>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/FinalCTA.css`:

```css
.final-cta {
  background: var(--lp-bg-inverse);
  min-height: 320px;
  display: flex;
  align-items: center;
  text-align: center;
}

.fcta-heading {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  font-weight: 500;
  color: #FAFAFC;
  margin-bottom: 12px;
  letter-spacing: -0.3px;
}

.fcta-sub {
  font-size: 17px;
  color: #9E9EAA;
  margin-bottom: 32px;
}

.fcta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 44px;
  font-size: 16px;
  font-weight: 600;
  color: var(--lp-bg-inverse);
  background: var(--lp-gold);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(197, 160, 89, 0.3);
}

.fcta-button:hover {
  background: #d4af6e;
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(197, 160, 89, 0.4);
}

@media (max-width: 768px) {
  .fcta-heading {
    font-size: 28px;
  }
}
```

- [ ] **Step 3: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/sections/InlineCTA.tsx frontend/src/pages/landing/sections/InlineCTA.css frontend/src/pages/landing/sections/FinalCTA.tsx frontend/src/pages/landing/sections/FinalCTA.css
git commit -m "feat: add InlineCTA + FinalCTA sections with auth-aware routing"
```

---

### Task 9: StatsRiver section (data-driven)

**Files:**
- Create: `frontend/src/pages/landing/sections/StatsRiver.tsx`
- Create: `frontend/src/pages/landing/sections/StatsRiver.css`
- Modify: `frontend/src/services/api.ts` (add `api.stats.public()`)

**Interfaces:**
- Consumes: `useCountUp` hook, `api.stats.public()`
- Produces: `<StatsRiver />` — renders three animated odometer counters

- [ ] **Step 1: Add api.stats.public() to API client**

In `frontend/src/services/api.ts`, after the existing `interactions` block (around line 644), add:

```typescript
stats: {
  public: () =>
    request<{ memorialCount: number; candleCount: number; messageCount: number }>(
      '/api/stats/public'
    ),
},
```

Wrap this inside the `api` object export. If `api` is built via Object.assign/similar, add it there. Otherwise add as a new top-level key.

- [ ] **Step 2: Write StatsRiver component**

Create `frontend/src/pages/landing/sections/StatsRiver.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';
import { useCountUp } from '../hooks/useCountUp';
import './StatsRiver.css';

interface StatsData {
  memorialCount: number;
  candleCount: number;
  messageCount: number;
}

export function StatsRiver() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.stats.public()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (error) return null; // Hide section on error

  return (
    <section className="landing-section stats-river" aria-label="Platform statistics">
      <div className="landing-section-inner">
        <motion.div
          className="sr-grid"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <StatItem label="Memorials Created" target={stats?.memorialCount ?? 0} />
          <StatItem label="Candles Lit" target={stats?.candleCount ?? 0} />
          <StatItem label="Messages Shared" target={stats?.messageCount ?? 0} />
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ label, target }: { label: string; target: number }) {
  const { count, ref } = useCountUp({ target });

  return (
    <div className="sr-item">
      <span className="sr-number" ref={ref} aria-live="polite">
        {count.toLocaleString()}
      </span>
      <span className="sr-label">{label}</span>
    </div>
  );
}
```

Create `frontend/src/pages/landing/sections/StatsRiver.css`:

```css
.stats-river {
  background: var(--lp-bg-accent);
}

.sr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  text-align: center;
}

.sr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sr-number {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 600;
  color: var(--lp-primary);
  line-height: 1.1;
  margin-bottom: 8px;
}

.sr-label {
  font-size: 15px;
  color: var(--lp-text-secondary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .sr-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .sr-number {
    font-size: 40px;
  }
}
```

- [ ] **Step 3: Verify build + backend integration**

```bash
npm run build:backend
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/sections/StatsRiver.tsx frontend/src/pages/landing/sections/StatsRiver.css frontend/src/services/api.ts
git commit -m "feat: add StatsRiver section with public stats endpoint integration"
```

---

### Task 10: FeaturedMemorials section (data-driven carousel)

**Files:**
- Create: `frontend/src/pages/landing/sections/FeaturedMemorials.tsx`
- Create: `frontend/src/pages/landing/sections/FeaturedMemorials.css`

**Interfaces:**
- Consumes: `api.search.memorials('', 1, 6)`, `resolveMediaUrl`, `getInitials`
- Produces: `<FeaturedMemorials />` — horizontal scroll carousel of public memorials

- [ ] **Step 1: Write FeaturedMemorials**

Create `frontend/src/pages/landing/sections/FeaturedMemorials.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { api } from '../../../services/api';
import { resolveMediaUrl } from '../../../lib/media';
import { getInitials } from '../../../lib/format';
import './FeaturedMemorials.css';

interface PublicMemorial {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  dateOfPassing: string;
}

function yearOf(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

export function FeaturedMemorials() {
  const navigate = useNavigate();
  const [memorials, setMemorials] = useState<PublicMemorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.search
      .memorials('', 1, 6)
      .then((data) => setMemorials(data.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <section className="landing-section" aria-label="Featured memorials">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <a href="/browse" style={{ color: 'var(--lp-primary)' }}>View all memorials →</a>
        </div>
      </section>
    );
  }

  return (
    <section className="landing-section featured-memorials" aria-label="Featured memorials">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">Their Stories</h2>
        <p className="landing-section-subtitle">
          Recently created memorials by families like yours.
        </p>

        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : memorials.length === 0 ? (
          <div className="fm-empty">
            <p>No memorials yet. Be the first to create one!</p>
            <button
              className="icta-button"
              onClick={() => navigate('/register')}
              type="button"
            >
              Create a Memorial
            </button>
          </div>
        ) : (
          <div className="fm-scroll" ref={scrollRef}>
            {memorials.map((m) => {
              const photoUrl = m.profilePhotoUrl
                ? resolveMediaUrl(m.profilePhotoUrl)
                : null;
              const initials = getInitials(m.fullName);

              return (
                <div
                  className="fm-card"
                  key={m.id}
                  onClick={() => navigate(`/memorials/${m.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/memorials/${m.id}`);
                  }}
                >
                  <div className="fm-portrait">
                    {photoUrl ? (
                      <img src={photoUrl} alt={m.fullName} />
                    ) : (
                      <span className="fm-initials">{initials}</span>
                    )}
                  </div>
                  <h3 className="fm-name">{m.fullName}</h3>
                  {m.dateOfBirth && m.dateOfPassing && (
                    <p className="fm-dates">
                      {yearOf(m.dateOfBirth)}&ndash;{yearOf(m.dateOfPassing)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <a href="/browse" className="fm-view-all">
          View all memorials →
        </a>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/FeaturedMemorials.css`:

```css
.featured-memorials {
  background: var(--lp-bg-primary);
}

.fm-scroll {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--lp-border) transparent;
}

.fm-scroll::-webkit-scrollbar {
  height: 6px;
}
.fm-scroll::-webkit-scrollbar-thumb {
  background: var(--lp-border);
  border-radius: 3px;
}

.fm-card {
  flex: 0 0 240px;
  scroll-snap-align: start;
  background: var(--lp-bg-elevated);
  border: 1px solid var(--lp-border);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.fm-card:hover {
  transform: perspective(600px) rotateY(2deg) translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.fm-card:focus-visible {
  outline: 2px solid var(--lp-primary);
  outline-offset: 2px;
}

.fm-portrait {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  margin: 0 auto 16px;
  overflow: hidden;
  background: var(--lp-bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fm-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fm-initials {
  font-size: 26px;
  font-weight: 600;
  color: var(--lp-text-tertiary);
  letter-spacing: 1px;
}

.fm-name {
  font-family: 'Playfair Display', serif;
  font-size: 17px;
  font-weight: 600;
  color: var(--lp-text-primary);
  margin-bottom: 4px;
}

.fm-dates {
  font-size: 13px;
  color: var(--lp-text-tertiary);
  letter-spacing: 0.5px;
}

.fm-empty {
  text-align: center;
  padding: 32px;
}

.fm-empty p {
  color: var(--lp-text-secondary);
  margin-bottom: 16px;
}

.fm-view-all {
  display: block;
  text-align: center;
  margin-top: 24px;
  color: var(--lp-primary);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
}

.fm-view-all:hover {
  color: var(--lp-primary-hover);
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/landing/sections/FeaturedMemorials.tsx frontend/src/pages/landing/sections/FeaturedMemorials.css
git commit -m "feat: add FeaturedMemorials carousel section"
```

---

### Task 11: HeroSection + CommunitySection (canvas sections)

**Files:**
- Create: `frontend/src/pages/landing/sections/HeroSection.tsx`
- Create: `frontend/src/pages/landing/sections/HeroSection.css`
- Create: `frontend/src/pages/landing/sections/CommunitySection.tsx`
- Create: `frontend/src/pages/landing/sections/CommunitySection.css`

**Interfaces:**
- Consumes: `useParticleCanvas`, `useAuthStore`, search navigation
- Produces: `<HeroSection />`, `<CommunitySection stats={StatsData} />`

- [ ] **Step 1: Write HeroSection**

Create `frontend/src/pages/landing/sections/HeroSection.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../stores/authStore';
import { useParticleCanvas } from '../hooks/useParticleCanvas';
import './HeroSection.css';

export function HeroSection() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');

  const { canvasRef } = useParticleCanvas({
    count: 80,
    colors: ['rgba(123, 111, 158, 0.4)', 'rgba(197, 160, 89, 0.3)', 'rgba(200, 195, 220, 0.35)'],
    speed: 0.3,
    shape: 'scattered',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCTA = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section hero-section" aria-label="Hero">
      <canvas
        ref={canvasRef}
        className="hero-canvas"
        role="img"
        aria-label="Soft floating particles in lavender and gold tones"
      />
      <div className="hero-fallback" aria-hidden="true" />

      <div className="landing-section-inner hero-content">
        <motion.div
          className="hero-logo-wrap"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <img
            src="/logo-no-background.png"
            alt=""
            className="hero-logo"
            aria-hidden="true"
          />
        </motion.div>

        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          Honoring Every Story.
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          A quiet, beautiful space to remember and celebrate those who shaped our lives.
        </motion.p>

        <motion.form
          className="hero-search"
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
        >
          <SearchOutlined className="hero-search-icon" />
          <input
            type="text"
            placeholder="Search for a memorial…"
            aria-label="Search for a memorial"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="hero-search-btn">
            Search
          </button>
        </motion.form>

        <motion.button
          className="hero-cta"
          onClick={handleCTA}
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
        >
          Create a Memorial
        </motion.button>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/HeroSection.css`:

```css
.hero-section {
  position: relative;
  min-height: 620px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lp-bg-primary);
  overflow: hidden;
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.hero-fallback {
  display: none; /* CSS gradient fallback if canvas unsupported */
}

@supports not (canvas) {
  .hero-fallback {
    display: block;
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 30%, rgba(123, 111, 158, 0.12) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(197, 160, 89, 0.08) 0%, transparent 40%),
      var(--lp-bg-primary);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 640px;
}

.hero-logo-wrap {
  margin-bottom: 24px;
}

.hero-logo {
  width: min(80vw, 480px);
  height: auto;
  filter: drop-shadow(0 0 30px var(--lp-glow));
}

.hero-headline {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 400;
  color: var(--lp-text-primary);
  line-height: 1.15;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 17px;
  color: var(--lp-text-secondary);
  line-height: 1.7;
  max-width: 480px;
  margin-bottom: 32px;
}

.hero-search {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 480px;
  background: var(--lp-bg-elevated);
  border: 1px solid var(--lp-border);
  border-radius: 50px;
  padding: 6px 6px 6px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.hero-search:focus-within {
  border-color: var(--lp-primary);
  box-shadow: 0 4px 24px rgba(123, 111, 158, 0.15);
}

.hero-search-icon {
  font-size: 16px;
  color: var(--lp-text-tertiary);
  margin-right: 10px;
  flex-shrink: 0;
}

.hero-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--lp-text-primary);
  background: transparent;
  padding: 10px 0;
}

.hero-search input::placeholder {
  color: var(--lp-text-tertiary);
}

.hero-search-btn {
  flex-shrink: 0;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--lp-primary);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: background 0.2s;
}

.hero-search-btn:hover {
  background: var(--lp-primary-hover);
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 40px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #fff;
  background: var(--lp-bg-inverse);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.hero-cta:hover {
  background: #2a2a32;
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.hero-cta:focus-visible {
  outline: 2px solid var(--lp-primary);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .hero-section {
    min-height: 540px;
  }
  .hero-headline {
    font-size: 34px;
  }
  .hero-logo {
    width: min(90vw, 360px);
  }
}

@media (max-width: 480px) {
  .hero-headline {
    font-size: 28px;
  }
  .hero-search {
    flex-direction: column;
    border-radius: 16px;
    padding: 10px;
    gap: 8px;
  }
  .hero-search-btn {
    width: 100%;
    border-radius: 12px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hero-canvas {
    display: none;
  }
}
```

- [ ] **Step 2: Write CommunitySection**

Create `frontend/src/pages/landing/sections/CommunitySection.tsx`:

```typescript
import { motion } from 'framer-motion';
import { useParticleCanvas } from '../hooks/useParticleCanvas';
import './CommunitySection.css';

interface CommunitySectionProps {
  memorialCount: number;
}

export function CommunitySection({ memorialCount }: CommunitySectionProps) {
  const { canvasRef } = useParticleCanvas({
    count: 120,
    colors: ['rgba(123, 111, 158, 0.35)', 'rgba(140, 130, 175, 0.3)', 'rgba(180, 170, 210, 0.25)'],
    speed: 0.2,
    shape: 'heart',
  });

  return (
    <section className="landing-section community-section" aria-label="Community">
      <canvas
        ref={canvasRef}
        className="community-canvas"
        role="img"
        aria-label="Glowing dots forming a heart shape, representing the community"
      />
      <div className="landing-section-inner community-content">
        <motion.div
          className="community-text"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
        >
          <p className="community-count">
            Join {memorialCount > 0 ? memorialCount.toLocaleString() : ''} families
          </p>
          <p className="community-sub">
            who have created memorials to honor their loved ones.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
```

Create `frontend/src/pages/landing/sections/CommunitySection.css`:

```css
.community-section {
  position: relative;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lp-bg-primary);
  overflow: hidden;
}

.community-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.community-content {
  position: relative;
  z-index: 1;
}

.community-text {
  text-align: center;
}

.community-count {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 500;
  color: var(--lp-text-primary);
  margin-bottom: 8px;
}

.community-sub {
  font-size: 16px;
  color: var(--lp-text-secondary);
}

@media (max-width: 768px) {
  .community-count {
    font-size: 26px;
  }
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/sections/HeroSection.tsx frontend/src/pages/landing/sections/HeroSection.css frontend/src/pages/landing/sections/CommunitySection.tsx frontend/src/pages/landing/sections/CommunitySection.css
git commit -m "feat: add HeroSection + CommunitySection with canvas particles"
```

---

### Task 12: LandingPage orchestrator + routing

**Files:**
- Create: `frontend/src/pages/landing/LandingPage.tsx`
- Modify: `frontend/src/App.tsx` (update import path)

**Interfaces:**
- Consumes: all 9 section components, `api.search.memorials` + `api.stats.public`
- Produces: `<LandingPage />` as default export — thin orchestrator

- [ ] **Step 1: Write LandingPage orchestrator**

Create `frontend/src/pages/landing/LandingPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { HeroSection } from './sections/HeroSection';
import { StatsRiver } from './sections/StatsRiver';
import { HowItWorks } from './sections/HowItWorks';
import { InlineCTA } from './sections/InlineCTA';
import { FeaturedMemorials } from './sections/FeaturedMemorials';
import { WhyWeRemember } from './sections/WhyWeRemember';
import { FeatureHighlights } from './sections/FeatureHighlights';
import { CommunitySection } from './sections/CommunitySection';
import { FinalCTA } from './sections/FinalCTA';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <StatsRiver />
      <HowItWorks />
      <InlineCTA />
      <FeaturedMemorials />
      <WhyWeRemember />
      <FeatureHighlights />
      <CommunitySection memorialCount={0} />
      <FinalCTA />
    </main>
  );
}
```

Note: The `memorialCount={0}` prop on `CommunitySection` is temporary. In the next sub-step, we wire the stats fetch at this level and pass both to StatsRiver and CommunitySection. For now, StatsRiver fetches its own data internally.

- [ ] **Step 2: Update App.tsx import**

In `frontend/src/App.tsx`, find the line importing `LandingPage` from `./pages/LandingPage` and change to:

```typescript
import LandingPage from './pages/landing/LandingPage';
```

If the old import uses a named import, change the route element accordingly. Check the current route:

```typescript
// Before (find in App.tsx):
import { LandingPage } from './pages/LandingPage';

// After:
import LandingPage from './pages/landing/LandingPage';
```

Update the route if needed — it likely already uses `<LandingPage />` as JSX.

- [ ] **Step 3: Verify full build**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -20
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/LandingPage.tsx frontend/src/App.tsx
git commit -m "feat: wire LandingPage orchestrator with all 9 sections"
```

---

### Task 13: Lift stats fetching to LandingPage level

**Files:**
- Modify: `frontend/src/pages/landing/LandingPage.tsx`
- Modify: `frontend/src/pages/landing/sections/StatsRiver.tsx` (accept stats as props)

**Interfaces:**
- Changes StatsRiver from self-fetching to prop-driven
- LandingPage fetches stats once, passes to StatsRiver + CommunitySection

- [ ] **Step 1: Update StatsRiver to accept props**

In `StatsRiver.tsx`, change the signature:

```typescript
interface StatsRiverProps {
  memorialCount: number;
  candleCount: number;
  messageCount: number;
}

export function StatsRiver({ memorialCount, candleCount, messageCount }: StatsRiverProps) {
  // Remove useState, useEffect, api.stats.public() call
  // Use props directly instead of internal state
```

Render with:

```typescript
<StatItem label="Memorials Created" target={memorialCount} />
<StatItem label="Candles Lit" target={candleCount} />
<StatItem label="Messages Shared" target={messageCount} />
```

- [ ] **Step 2: Update LandingPage to fetch and pass stats**

```typescript
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
// ... section imports

interface StatsData {
  memorialCount: number;
  candleCount: number;
  messageCount: number;
}

export default function LandingPage() {
  const [stats, setStats] = useState<StatsData>({ memorialCount: 0, candleCount: 0, messageCount: 0 });

  useEffect(() => {
    api.stats.public().then(setStats).catch(() => {});
  }, []);

  return (
    <main>
      <HeroSection />
      <StatsRiver {...stats} />
      <HowItWorks />
      <InlineCTA />
      <FeaturedMemorials />
      <WhyWeRemember />
      <FeatureHighlights />
      <CommunitySection memorialCount={stats.memorialCount} />
      <FinalCTA />
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/landing/LandingPage.tsx frontend/src/pages/landing/sections/StatsRiver.tsx
git commit -m "refactor: lift stats fetching to LandingPage, pass as props"
```

---

### Task 14: Remove old LandingPage files + final integration test

**Files:**
- Remove: `frontend/src/pages/LandingPage.tsx`
- Remove: `frontend/src/pages/LandingPage.css`
- Remove: `frontend/src/pages/LandingPage.test.tsx`
- Create: `frontend/src/pages/landing/LandingPage.test.tsx`

- [ ] **Step 1: Delete old files**

```bash
rm frontend/src/pages/LandingPage.tsx
rm frontend/src/pages/LandingPage.css
rm frontend/src/pages/LandingPage.test.tsx
```

- [ ] **Step 2: Write orchestrator integration test**

Create `frontend/src/pages/landing/LandingPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    stats: {
      public: vi.fn().mockResolvedValue({
        memorialCount: 42,
        candleCount: 1337,
        messageCount: 567,
      }),
    },
    search: {
      memorials: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 6,
      }),
    },
  },
}));

// Mock auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    })
  ),
}));

// Mock canvas (JSDOM doesn't have canvas)
vi.mock('../hooks/useParticleCanvas', () => ({
  useParticleCanvas: vi.fn(() => ({
    canvasRef: { current: null },
  })),
}));

// Mock IntersectionObserver for useCountUp
vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
  takeRecords: vi.fn(),
})));

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLanding = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

  it('renders hero headline', () => {
    renderLanding();
    expect(screen.getByText('Honoring Every Story.')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderLanding();
    expect(screen.getByPlaceholderText('Search for a memorial…')).toBeInTheDocument();
  });

  it('renders Create a Memorial CTAs', () => {
    renderLanding();
    const ctas = screen.getAllByText('Create a Memorial');
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });

  it('renders How It Works steps', () => {
    renderLanding();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders feature highlights', () => {
    renderLanding();
    expect(screen.getByText('Everything You Need')).toBeInTheDocument();
  });

  it('renders Final CTA', () => {
    renderLanding();
    expect(screen.getByText('Start Their Memorial Today')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run src/pages/landing/LandingPage.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 4: Run full frontend test suite to check for regressions**

```bash
cd frontend && npx vitest run
```

Expected: no new failures. Fix any test that imported the old LandingPage.

- [ ] **Step 5: Verify dev build compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/landing/LandingPage.test.tsx
git rm frontend/src/pages/LandingPage.tsx frontend/src/pages/LandingPage.css frontend/src/pages/LandingPage.test.tsx
git commit -m "feat: remove old LandingPage, add orchestrator integration test"
```

---

### Task 15: Final polish — responsive QA + accessibility

**Files:**
- Modify: various CSS files (touch target sizes, focus rings, mobile tweaks)

- [ ] **Step 1: Quick responsive audit**

Verify each section has `@media (max-width: 768px)` rules. Check:
- HeroSection: single column, smaller headline, stacked search
- StatsRiver: stacked numbers
- HowItWorks: single column cards
- FeatureHighlights: single column
- FinalCTA: full width button

- [ ] **Step 2: Accessibility check**

Verify:
- All `<section>` have `aria-label`
- All CTAs have `:focus-visible` ring (minimum 2px, offset 2px)
- Canvas elements have `role="img"` + `aria-label`
- Color contrast: text on `#FAFAFC` bg meets 4.5:1, text on `#1E1E24` bg meets 3:1
- Keyboard navigation: tab through all interactive elements

- [ ] **Step 3: Verify reduced motion**

In browser DevTools, toggle `prefers-reduced-motion: reduce`. Verify:
- Canvas particles disabled
- No scroll animations (content visible immediately)

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "style: responsive + accessibility polish for landing page"
```

---

## Completion Checklist

- [ ] `npm run build:backend` passes
- [ ] `npm run build:frontend` passes (or `npx tsc --noEmit` in frontend)
- [ ] `npm test --workspace=frontend` passes with no new failures
- [ ] `git status` shows no unexpected files
- [ ] Old `LandingPage.tsx` + `.css` + `.test.tsx` removed
- [ ] New `frontend/src/pages/landing/` directory contains all 9 sections + 2 hooks
- [ ] `GET /api/stats/public` returns `{ memorialCount, candleCount, messageCount }`
