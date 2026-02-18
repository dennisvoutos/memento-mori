import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNoticeModal } from '../PrivacyNoticeModal';
import { HomeOutlined, InfoCircleOutlined, LockOutlined, FileTextOutlined, QuestionCircleOutlined, MailOutlined } from '@ant-design/icons';
import './Footer.css';

export function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/"><HomeOutlined /> Home</Link>
          <Link to="/about"><InfoCircleOutlined /> About</Link>
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => setShowPrivacy(true)}
          >
            <LockOutlined /> Privacy
          </button>
          <Link to="/terms"><FileTextOutlined /> Terms</Link>
          <Link to="/help"><QuestionCircleOutlined /> Help</Link>
          <Link to="/contact"><MailOutlined /> Contact</Link>
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
