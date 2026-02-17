import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
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
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          {isAuthenticated && <Link to="/dashboard">My Memorials</Link>}
        </nav>

        <div className="header-utils">
          {isAuthenticated ? (
            <>
              <span className="header-user">{user?.displayName}</span>
              <button type="button" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign In</Link>
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
