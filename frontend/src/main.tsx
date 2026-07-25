import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './index.css';
import App from './App.tsx';
import { AppNotificationProvider } from './lib/notifications.tsx';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppNotificationProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </AppNotificationProvider>
  </StrictMode>,
);
