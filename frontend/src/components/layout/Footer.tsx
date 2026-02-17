import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNoticeModal } from '../PrivacyNoticeModal';
import './Footer.css';

export function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => setShowPrivacy(true)}
          >
            Privacy
          </button>
          <Link to="/terms">Terms</Link>
          <Link to="/help">Help</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <p className="footer-copy">
          &copy; 2026 Memento Mori. All rights reserved.
        </p>
      </div>

      <PrivacyNoticeModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />
    </footer>
  );
}
