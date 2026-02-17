import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/">Home</Link>
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
  );
}
