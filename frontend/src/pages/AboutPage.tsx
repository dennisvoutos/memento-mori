import './AboutPage.css';

export function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-inner">
        <h1>About Memento Mori</h1>

        <section className="about-mission">
          <h2>Why We Built This</h2>
          <p>
            "Memento Mori" — a Latin phrase meaning "remember that you will die" — has been
            used for centuries as a reminder to appreciate life and honor those who came before
            us. In an age where so much of our connection happens online, we believed there
            should be a quiet, dignified space to remember the people who shaped our lives.
          </p>
          <p>
            Too often, the memories of our loved ones are scattered across social media posts,
            old photo albums, and fading recollections. Memento Mori brings everything together
            in one beautiful, permanent memorial — a place where family and friends can gather,
            share stories, and keep a legacy alive for future generations.
          </p>
        </section>

        <section className="about-values">
          <h2>What We Believe</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>Dignity</h3>
              <p>
                Every memorial deserves to be respectful and beautiful. We design with care and
                restraint, putting the person being remembered at the center.
              </p>
            </div>
            <div className="value-card">
              <h3>Privacy</h3>
              <p>
                You control who sees each memorial. We never share your data with third parties
                or use it for advertising.
              </p>
            </div>
            <div className="value-card">
              <h3>Accessibility</h3>
              <p>
                Creating a memorial should be free and simple for everyone, regardless of
                technical skill or background.
              </p>
            </div>
            <div className="value-card">
              <h3>Permanence</h3>
              <p>
                Memories shouldn't disappear. We're committed to preserving the stories and
                tributes entrusted to us.
              </p>
            </div>
          </div>
        </section>

        <section className="about-creator">
          <h2>Created By</h2>
          <p>
            Memento Mori was created by <strong>Dennis Voutos</strong> — a developer, designer,
            and someone who understands the importance of remembering those we've lost.
          </p>
          <p>
            This project was born out of a personal need to create something meaningful: a
            platform where anyone can honor a loved one with the care and attention they deserve.
            It's built with modern web technologies and a dedication to simplicity and beauty.
          </p>
          <p>
            If you have questions, feedback, or just want to say hello, feel free to reach out at{' '}
            <a href="mailto:dennisvoutos@gmail.com">dennisvoutos@gmail.com</a> or via the{' '}
            <a href="/contact">Contact page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
