import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { HomeOutlined, SearchOutlined, AppstoreOutlined, UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import './Header.css';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <img
            className="header-logo-image"
            src="/memento%20mori%20logo.jpeg"
            alt="Memento Mori"
          />
          <span className="header-logo-text">MyMemento</span>
          <span className="header-logo-text-accent">Mori</span>
        </Link>

        <nav className="header-nav">
          <Link to="/"><HomeOutlined /> Home</Link>
          <Link to="/search"><SearchOutlined /> Search</Link>
          {isAuthenticated && <Link to="/dashboard"><AppstoreOutlined /> My Memorials</Link>}
        </nav>

        <div className="header-utils">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard?tab=account" className="header-user"><UserOutlined /> {user?.displayName}</Link>
              <button type="button" onClick={handleLogout}>
                <LogoutOutlined /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"><LoginOutlined /> Sign In</Link>
              <Link to="/register" className="header-cta">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
