import { Link } from 'react-router-dom';
import { HomeOutlined, InfoCircleOutlined, LockOutlined, FileTextOutlined, QuestionCircleOutlined, MailOutlined } from '@ant-design/icons';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/"><HomeOutlined /> Home</Link>
          <Link to="/about"><InfoCircleOutlined /> About</Link>
          <Link to="/privacy"><LockOutlined /> Privacy</Link>
          <Link to="/terms"><FileTextOutlined /> Terms</Link>
          <Link to="/help"><QuestionCircleOutlined /> Help</Link>
          <Link to="/contact"><MailOutlined /> Contact</Link>
          <button
            type="button"
            className="footer-cookie-settings"
            onClick={() => {
              const openPreferences = (window as Record<string, unknown>).__openCookiePreferences as (() => void) | undefined;
              openPreferences?.();
            }}
          >
            Cookie Settings
          </button>
        </div>
        <p className="footer-copy">
          &copy; 2026 Memento Mori. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
