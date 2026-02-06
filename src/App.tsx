import './App.css'

/* ── tiny inline SVG icons (monochrome, no deps) ── */
const Icon = ({ d, size = 32 }: { d: string; size?: number }) => (
  <svg
    className="category-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)

const icons = {
  heart:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  feather:
    'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  camera:
    'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  globe:
    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z',
  flame:
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
}

/* ── mock memorial data ── */
const memorials = [
  { name: 'Margaret Ellis', initials: 'ME' },
  { name: 'Thomas Reed', initials: 'TR' },
  { name: 'Amara Osei', initials: 'AO' },
  { name: 'James Chen', initials: 'JC' },
  { name: 'Sofia Reyes', initials: 'SR' },
  { name: 'Robert Kim', initials: 'RK' },
]

const categories = [
  { label: 'In Loving Memory', icon: icons.heart },
  { label: 'Tributes', icon: icons.star },
  { label: 'Life Stories', icon: icons.feather },
  { label: 'Obituaries', icon: icons.book },
  { label: 'Music & Songs', icon: icons.music },
  { label: 'Photo Galleries', icon: icons.camera },
  { label: 'Community', icon: icons.users },
  { label: 'Global Memorials', icon: icons.globe },
  { label: 'Candlelight', icon: icons.flame },
]

function App() {
  return (
    <>
      {/* full-viewport sky background */}
      <div className="page-background" aria-hidden="true" />

      {/* announcement strip */}
      <div className="announcement-strip">
        Preserve the memory of your loved ones forever.{' '}
        <a href="#">Learn more &rarr;</a>
      </div>

      {/* header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="header-logo">
            memento<span>mori</span>
          </div>

          <nav className="header-nav">
            <a href="#">Memorials</a>
            <a href="#">How It Works</a>
            <a href="#">Tributes</a>
            <a href="#">Community</a>
            <a href="#">About</a>
          </nav>

          <div className="header-utils">
            <button type="button">Search</button>
            <a href="#">Contact</a>
            <a href="#">Sign In</a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-card">
          <h1>Create a Lasting Memorial for Someone You Love</h1>
          <p className="subtitle">
            A quiet, beautiful space to honor and remember those who have
            touched our lives — share stories, photos, and keep their memory
            alive forever.
          </p>

          <form className="hero-form" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="First name" />
            <input type="text" placeholder="Last name" />
            <button className="btn-primary" type="submit">
              Create a Free Memorial
            </button>
          </form>
        </div>
      </section>

      {/* ── RECENT MEMORIALS ── */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Recent Online Memorials</h2>
          <p className="section-subtitle">
            Honoring lives that continue to inspire and comfort us.
          </p>

          <div className="memorials-row">
            {memorials.map((m) => (
              <div className="memorial-card" key={m.name}>
                {/* placeholder avatar with initials */}
                <div
                  className="memorial-avatar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#9a948e',
                  }}
                >
                  {m.initials}
                </div>
                <span className="memorial-name">{m.name}</span>
              </div>
            ))}

            {/* community stats box */}
            <div className="community-stats">
              <div className="stat-item">
                <div className="stat-number">12,847</div>
                <div className="stat-label">Memorials</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">98,210</div>
                <div className="stat-label">Tributes</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">1.2M</div>
                <div className="stat-label">Visitors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED CATEGORIES ── */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Featured Categories</h2>
          <p className="section-subtitle">
            Explore different ways to remember and celebrate a life.
          </p>

          <div className="categories-grid">
            {categories.map((c) => (
              <div className="category-card" key={c.label}>
                <Icon d={c.icon} />
                <span className="category-label">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bottom-cta">
        <div className="bottom-cta-card">
          <h2>Their Story Deserves to Be Told</h2>
          <p>
            Create a free, beautiful memorial page in minutes. Share it with
            family and friends so that their memory lives on.
          </p>
          <button className="btn-primary">Get Started — It's Free</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Help</a>
            <a href="#">Contact</a>
          </div>
          <p className="footer-copy">
            &copy; 2026 Memento Mori. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}

export default App
