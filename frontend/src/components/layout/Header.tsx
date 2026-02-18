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
          memento<span>mori</span>
        </Link>

        <nav className="header-nav">
          <Link to="/"><HomeOutlined /> Home</Link>
          <Link to="/search"><SearchOutlined /> Search</Link>
          {isAuthenticated && <Link to="/dashboard"><AppstoreOutlined /> My Memorials</Link>}
        </nav>

        <div className="header-utils">
          {isAuthenticated ? (
            <>
              <span className="header-user"><UserOutlined /> {user?.displayName}</span>
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
