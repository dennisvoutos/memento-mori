import './TermsPage.css';

export function TermsPage() {
  return (
    <div className="terms-page">
      <div className="terms-inner">
        <article className="terms-document">
          <p className="terms-brand">MY MEMENTO MORI</p>
          <h1>Terms of Service</h1>
          <p className="terms-updated">Last updated: June 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Service, you agree to these Terms of
              Service.
            </p>
            <p>If you do not agree, you must not use the Service.</p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>You must:</p>
            <ul>
              <li>be at least 16 years old</li>
              <li>comply with applicable laws</li>
            </ul>
          </section>

          <section>
            <h2>3. Description of Service</h2>
            <p>My Memento provides:</p>
            <ul>
              <li>AI-powered memory tools</li>
              <li>conversational interfaces</li>
              <li>content generation and personalization</li>
            </ul>
            <p>The Service may change or be discontinued at any time.</p>
          </section>

          <section>
            <h2>4. No Professional Advice</h2>
            <p>The Service does not provide:</p>
            <ul>
              <li>medical</li>
              <li>legal</li>
              <li>psychological</li>
              <li>financial advice</li>
            </ul>
            <p>Outputs may be inaccurate or incomplete.</p>
            <p>You are responsible for your decisions.</p>
          </section>

          <section>
            <h2>5. User Content</h2>
            <p>You retain ownership of your content.</p>
            <p>You grant us a:</p>
            <ul>
              <li>worldwide</li>
              <li>non-exclusive</li>
              <li>royalty-free license</li>
            </ul>
            <p>to use, process, store, reproduce, and modify your content for:</p>
            <ul>
              <li>operating the Service</li>
              <li>improving features</li>
              <li>developing new functionality</li>
            </ul>
          </section>

          <section>
            <h2>6. AI-Generated Content</h2>
            <p>AI-generated content:</p>
            <ul>
              <li>may be incorrect</li>
              <li>may be biased</li>
              <li>should not be relied upon as factual</li>
            </ul>
            <p>We do not guarantee accuracy or reliability.</p>
          </section>

          <section>
            <h2>7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>use the Service for unlawful purposes</li>
              <li>upload harmful or illegal content</li>
              <li>attempt to reverse engineer systems</li>
              <li>interfere with infrastructure</li>
              <li>misuse outputs</li>
            </ul>
            <p>We may suspend or terminate accounts.</p>
          </section>

          <section>
            <h2>8. Privacy</h2>
            <p>Use of the Service is subject to the Privacy Policy.</p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>We may:</p>
            <ul>
              <li>suspend or terminate access</li>
              <li>remove content</li>
              <li>at any time.</li>
            </ul>
            <p>You may stop using the Service at any time.</p>
          </section>

          <section>
            <h2>10. Disclaimers</h2>
            <p>The Service is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;.</p>
            <p>We disclaim all warranties, including:</p>
            <ul>
              <li>accuracy</li>
              <li>reliability</li>
              <li>availability</li>
            </ul>
          </section>

          <section>
            <h2>11. Limitation of Liability</h2>
            <p>We are not liable for:</p>
            <ul>
              <li>indirect or consequential damages</li>
              <li>data loss</li>
              <li>decisions made based on AI outputs</li>
            </ul>
            <p>Liability is limited to:</p>
            <ul>
              <li>the amount paid (if any) in the last 12 months.</li>
            </ul>
          </section>

          <section>
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold us harmless from claims arising
              from:
            </p>
            <ul>
              <li>your use of the Service</li>
              <li>your content</li>
              <li>violations of these Terms</li>
            </ul>
          </section>

          <section>
            <h2>13. Third-Party Services</h2>
            <p>We are not responsible for third-party services.</p>
          </section>

          <section>
            <h2>13.1. Google and Apple Integration</h2>
            <p>My Memento Mori offers optional integration with:</p>
            <ul>
              <li>Google (Sign in with Google, Google Photos)</li>
              <li>Apple (Sign in with Apple)</li>
            </ul>
            <p>When you use these integrations:</p>
            <ul>
              <li>You authorize us to access the information and permissions you approve during the OAuth consent flow.</li>
              <li>We store your Google or Apple account ID to link your account.</li>
              <li>For Google Photos, we store an encrypted access token to retrieve photos on your behalf.</li>
              <li>Your use of these services remains subject to Google's and Apple's respective Terms of Service.</li>
            </ul>
          </section>

          <section>
            <h2>13.2. Account Linking</h2>
            <p>You may link multiple sign-in providers (Google, Apple, email+password) to a single Memento Mori account.</p>
            <ul>
              <li>Linking providers merges your memorials and data under one account.</li>
              <li>You must have at least one active sign-in method at all times.</li>
              <li>Disconnecting a provider does not delete your memorials or data.</li>
            </ul>
          </section>

          <section>
            <h2>13.3. Photo Ownership & Licensing</h2>
            <p>Photos you upload remain your property. My Memento Mori claims no ownership over your photos or media.</p>
            <ul>
              <li>Photos imported from Google Photos are downloaded client-side and uploaded through our service.</li>
              <li>No cloud photo data passes through our servers beyond what you explicitly upload.</li>
              <li>By uploading, you grant us the license in Section 5 solely for displaying your memorial.</li>
            </ul>
          </section>

          <section>
            <h2>13.4. Right to Disconnect</h2>
            <p>You may revoke third-party access at any time:</p>
            <ul>
              <li>From your Dashboard → Account → Linked Accounts.</li>
              <li>Disconnecting Google Photos revokes our access to your Google Photos library.</li>
              <li>Revoked tokens are deleted from our systems.</li>
              <li>You can also revoke access directly from your{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                  Google Account permissions
                </a>{' '}
                or{' '}
                <a href="https://appleid.apple.com" target="_blank" rel="noreferrer">
                  Apple ID settings
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2>14. Changes to Terms</h2>
            <p>We may update these Terms at any time.</p>
            <p>Continued use constitutes acceptance.</p>
          </section>

          <section>
            <h2>15. Governing Law</h2>
            <p>These Terms are governed by the laws of Quebec, Canada.</p>
            <p>Disputes shall be handled in Quebec courts.</p>
          </section>

          <section>
            <h2>16. Contact</h2>
            <p>
              <a href="mailto:mymementomori.admin@gmail.com">
                mymementomori.admin@gmail.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
