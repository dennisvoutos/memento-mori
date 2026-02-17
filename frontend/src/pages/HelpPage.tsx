import { useState } from 'react';
import { Card } from '../components/ui/Card';
import './HelpPage.css';

const faqs = [
  {
    q: 'What is Memento Mori?',
    a: 'Memento Mori is a digital memorial platform that helps you create lasting, beautiful online memorials for loved ones who have passed. You can share photos, stories, life moments, and tributes to keep their memory alive.',
  },
  {
    q: 'Is it free to create a memorial?',
    a: 'Yes. Creating a memorial is completely free. You can add biographical information, life moments, photos, and share it with family and friends at no cost.',
  },
  {
    q: 'Who can see my memorial?',
    a: 'That\'s entirely up to you. You can set each memorial to Private (only you), Shared Link (anyone with the link), or Public (visible to everyone and searchable). You can change the privacy level at any time.',
  },
  {
    q: 'How do I share a memorial with family?',
    a: 'If the memorial is set to "Shared Link", go to the memorial\'s edit page and use the share link feature. You can copy the unique link and send it to anyone you want to have access.',
  },
  {
    q: 'Can others contribute to a memorial?',
    a: 'Yes. Visitors can leave tributes and light candles on public or shared memorials. If you grant Contribute permissions through the access management panel, they can also add memories and photos.',
  },
  {
    q: 'Can I edit or delete a memorial after creating it?',
    a: 'Absolutely. You can edit any aspect of a memorial at any time — name, biography, dates, photos, and life moments. You can also permanently delete a memorial from your dashboard.',
  },
  {
    q: 'What file types are supported for photos?',
    a: 'We support JPEG, PNG, and WebP images up to 5MB each.',
  },
  {
    q: 'Is my data safe?',
    a: 'We take data security seriously. All passwords are securely hashed, sessions use HTTP-only cookies, and we never share your data with third parties. See our Privacy Policy for more details.',
  },
  {
    q: 'How do I delete my account?',
    a: 'You can request account deletion by contacting us through the Contact page. We\'ll remove all your personal data and associated memorials upon request, in compliance with your data protection rights.',
  },
  {
    q: 'I found a bug or have a feature request. How do I let you know?',
    a: 'We\'d love to hear from you! Use the Contact page to reach out with any bugs, suggestions, or feedback.',
  },
];

export function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="help-page">
      <div className="help-inner">
        <h1>Help Center</h1>
        <p className="help-subtitle">
          Find answers to common questions about using Memento Mori.
        </p>

        <section className="help-section">
          <h2>Getting Started</h2>
          <Card className="help-card">
            <ol className="help-steps">
              <li><strong>Create an account</strong> — Sign up with your name, email, and a password.</li>
              <li><strong>Create a memorial</strong> — Click "New Memorial" from your dashboard and fill in the details.</li>
              <li><strong>Add content</strong> — Write a biography, add life moments to the timeline, and upload photos.</li>
              <li><strong>Set privacy</strong> — Choose who can see the memorial: Private, Shared Link, or Public.</li>
              <li><strong>Share</strong> — Copy the memorial link and send it to family and friends.</li>
            </ol>
          </Card>
        </section>

        <section className="help-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${openIndex === i ? 'open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  type="button"
                >
                  <span>{faq.q}</span>
                  <span className="faq-chevron">{openIndex === i ? '−' : '+'}</span>
                </button>
                {openIndex === i && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="help-section help-contact">
          <Card className="help-card">
            <h3>Still need help?</h3>
            <p>
              If you can't find the answer you're looking for, feel free to{' '}
              <a href="/contact">contact us</a> and we'll get back to you as soon as possible.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
