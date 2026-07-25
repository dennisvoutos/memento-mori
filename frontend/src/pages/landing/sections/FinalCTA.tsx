import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import './FinalCTA.css';

export function FinalCTA() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleClick = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section final-cta" aria-label="Start a memorial">
      <div className="landing-section-inner">
        <h2 className="fcta-heading">Start Their Memorial Today</h2>
        <p className="fcta-sub">Free. Permanent. Beautiful.</p>
        <button className="fcta-button" onClick={handleClick} type="button">
          Create a Memorial
        </button>
      </div>
    </section>
  );
}
