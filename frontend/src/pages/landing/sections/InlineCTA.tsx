import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import './InlineCTA.css';

export function InlineCTA() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleClick = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section inline-cta" aria-label="Get started">
      <div className="landing-section-inner">
        <div className="icta-box">
          <h2 className="icta-heading">Ready to begin?</h2>
          <p className="icta-sub">Takes less than 5 minutes. Free forever.</p>
          <button className="icta-button" onClick={handleClick} type="button">
            Create a Memorial
          </button>
        </div>
      </div>
    </section>
  );
}
