import './TermsPage.css';

export function PrivacyPage() {
    return (
        <div className="privacy-page">
            <div className="privacy-inner">
                <article className="terms-document">
                    <p className="terms-brand">MY MEMENTO MORI</p>
                    <h1>Privacy Policy</h1>
                    <p className="privacy-updated">Last updated: June 2026</p>

                    <section>
                        <h2>1. Introduction</h2>
                        <p>
                            This Privacy Policy explains how My Memento Mori (&ldquo;My Memento&rdquo;,
                            &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses,
                            processes, and shares information when you use our website,
                            applications, and related services (the &ldquo;Service&rdquo;).
                        </p>
                        <p>
                            By using the Service, you acknowledge that your information will
                            be handled as described in this Privacy Policy.
                        </p>
                    </section>

                    <section>
                        <h2>2. Scope</h2>
                        <p>This Policy applies to:</p>
                        <ul>
                            <li>the website (mymementomori.com)</li>
                            <li>applications and AI features</li>
                            <li>related services</li>
                        </ul>
                        <p>This Policy does not apply to third-party services.</p>
                    </section>

                    <section>
                        <h2>3. Information We Collect</h2>
                        <p className="terms-list-label">a. Account Information</p>
                        <ul>
                            <li>Name</li>
                            <li>Email address</li>
                            <li>Login credentials (hashed passwords only)</li>
                        </ul>
                        <p className="terms-list-label">b. User Content</p>
                        <ul>
                            <li>Memorial content (names, biographies, dates)</li>
                            <li>Photos and media uploaded to memorials</li>
                            <li>Messages, tributes, and candles</li>
                            <li>Life moments and timeline entries</li>
                        </ul>
                        <p className="terms-list-label">c. Technical &amp; Usage Data</p>
                        <ul>
                            <li>Device and browser information</li>
                            <li>IP address</li>
                            <li>Usage logs and interactions</li>
                        </ul>
                        <p className="terms-list-label">d. Connected Account Data</p>
                        <p>When you link a third-party provider, we may collect:</p>
                        <ul>
                            <li>Google account ID (sub claim)</li>
                            <li>Apple account ID (sub claim)</li>
                            <li>Google Photos encrypted access and refresh tokens</li>
                            <li>OAuth scopes you have granted</li>
                        </ul>
                        <p>All service tokens are encrypted at rest with AES-256-CBC before storage.</p>
                        <p className="terms-list-label">e. Cookie Consent Records</p>
                        <ul>
                            <li>Your cookie preferences (necessary/analytics)</li>
                            <li>Timestamp of consent</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. How We Use Your Information</h2>
                        <p>We use your data to:</p>
                        <ul>
                            <li>operate and maintain the Service</li>
                            <li>provide AI-generated outputs</li>
                            <li>personalize your experience</li>
                            <li>improve features and performance</li>
                            <li>ensure safety and prevent misuse</li>
                            <li>comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2>5. Cookie Policy</h2>
                        <p>We use the following cookies:</p>
                        <table className="privacy-cookie-table">
                            <thead>
                                <tr>
                                    <th>Cookie</th>
                                    <th>Purpose</th>
                                    <th>Category</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>accessToken</code></td>
                                    <td>Authentication</td>
                                    <td>Strictly Necessary</td>
                                    <td>15 minutes</td>
                                </tr>
                                <tr>
                                    <td><code>refreshToken</code></td>
                                    <td>Session persistence</td>
                                    <td>Strictly Necessary</td>
                                    <td>7 days</td>
                                </tr>
                                <tr>
                                    <td><code>csrfToken</code></td>
                                    <td>CSRF protection</td>
                                    <td>Strictly Necessary</td>
                                    <td>7 days</td>
                                </tr>
                                <tr>
                                    <td><code>cookie_consent</code></td>
                                    <td>Consent record</td>
                                    <td>Strictly Necessary</td>
                                    <td>365 days</td>
                                </tr>
                            </tbody>
                        </table>
                        <p>All cookies are strictly necessary for the core functionality of the Service. We do not currently use analytics, advertising, or marketing cookies. You may configure your preferences via the cookie consent banner shown on your first visit, or at any time via the &ldquo;Cookie Settings&rdquo; link in the footer.</p>
                    </section>

                    <section>
                        <h2>6. AI Processing &amp; Model Use</h2>
                        <p>Your data may be processed by AI systems to:</p>
                        <ul>
                            <li>generate responses</li>
                            <li>structure and organize content</li>
                            <li>personalize outputs</li>
                        </ul>
                        <p className="terms-list-label">Model Training and Improvement</p>
                        <p>We may use data, including aggregated or transformed data, to:</p>
                        <ul>
                            <li>improve models</li>
                            <li>develop new features</li>
                            <li>enhance performance</li>
                        </ul>
                        <p>We may also use third-party AI providers.</p>
                        <p>
                            We do not guarantee that all data will be excluded from model
                            improvement processes unless explicitly stated.
                        </p>
                    </section>

                    <section>
                        <h2>7. Data Sharing</h2>
                        <p className="terms-list-label">a. Service Providers</p>
                        <ul>
                            <li>cloud infrastructure providers</li>
                            <li>analytics providers</li>
                            <li>AI providers</li>
                        </ul>
                        <p className="terms-list-label">b. Business Transfers</p>
                        <p>In case of:</p>
                        <ul>
                            <li>merger</li>
                            <li>acquisition</li>
                            <li>restructuring</li>
                            <li>sale of assets</li>
                        </ul>
                        <p className="terms-list-label">c. Legal Obligations</p>
                        <p>To:</p>
                        <ul>
                            <li>comply with laws</li>
                            <li>respond to lawful requests</li>
                            <li>protect rights and safety</li>
                        </ul>
                    </section>

                    <section>
                        <h2>8. Data Retention</h2>
                        <p>We retain data:</p>
                        <ul>
                            <li>as long as necessary to provide the Service</li>
                            <li>for legitimate business purposes</li>
                            <li>to comply with legal obligations</li>
                        </ul>
                        <p>Specifically:</p>
                        <ul>
                            <li><strong>Linked account IDs</strong> (Google/Apple) are stored until you disconnect the provider or delete your account.</li>
                            <li><strong>Connected service tokens</strong> (Google Photos) are encrypted at rest and deleted when you revoke access or delete your account.</li>
                            <li><strong>Cookie consent records</strong> are retained for 365 days, then the consent banner is shown again.</li>
                        </ul>
                        <p>Deleted data may:</p>
                        <ul>
                            <li>remain in backups</li>
                            <li>persist in logs</li>
                            <li>exist in aggregated or derived forms</li>
                        </ul>
                        <p>We do not guarantee immediate or complete deletion.</p>
                    </section>

                    <section>
                        <h2>9. Data Ownership &amp; License</h2>
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
                            <li>improving functionality</li>
                            <li>developing new features</li>
                        </ul>
                    </section>

                    <section>
                        <h2>10. Sensitive Information</h2>
                        <p>
                            You may provide sensitive information, including personal or
                            emotional data.
                        </p>
                        <p>You acknowledge that:</p>
                        <ul>
                            <li>you provide such data voluntarily</li>
                            <li>the Service is not designed for regulated environments</li>
                            <li>
                                we do not guarantee compliance with laws governing sensitive
                                data
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2>11. Security</h2>
                        <p>We implement reasonable safeguards.</p>
                        <p>However:</p>
                        <ul>
                            <li>no system is fully secure</li>
                            <li>we do not guarantee absolute protection</li>
                        </ul>
                    </section>

                    <section>
                        <h2>12. Third-Party Services</h2>
                        <p>The Service integrates with the following third-party platforms:</p>
                        <ul>
                            <li><strong>Google:</strong> For sign-in, account linking, and Google Photos browsing. We access your Google profile (name, email, profile picture) and, with your separate consent, your Google Photos library. Photo data is downloaded client-side — only photos you explicitly select and upload are stored on our servers.</li>
                            <li><strong>Apple:</strong> For sign-in and account linking. We access your Apple ID and, on first sign-in, your name and email. Apple does not provide a web API for iCloud Photos browsing.</li>
                            <li><strong>Resend:</strong> For sending verification and password-reset emails.</li>
                            <li><strong>Cloudflare R2:</strong> For image storage.</li>
                        </ul>
                        <p>Third-party tokens are encrypted at rest. You may revoke access at any time from your Dashboard or directly from your Google/Apple account settings.</p>
                        <p>We are not responsible for the privacy practices of these third-party services.</p>
                    </section>

                    <section>
                        <h2>13. International Data Transfers</h2>
                        <p>Your data may be processed outside your country.</p>
                        <p>By using the Service, you consent to such transfers.</p>
                    </section>

                    <section>
                        <h2>14. Your Rights</h2>
                        <p>Depending on applicable law, you may have rights to:</p>
                        <ul>
                            <li>access your data</li>
                            <li>request deletion</li>
                            <li>correct inaccuracies</li>
                        </ul>
                        <p>We may limit requests where legally permitted.</p>
                    </section>

                    <section>
                        <h2>15. Changes</h2>
                        <p>We may update this Privacy Policy at any time.</p>
                        <p>
                            Continued use of the Service constitutes acceptance of the updated
                            Policy.
                        </p>
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