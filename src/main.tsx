import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ReactGA from 'react-ga4';
import { AuthProvider } from './components/AuthProvider';
import App from './App.tsx';
import './index.css';

const GA_ID = (import.meta as any).env.VITE_GA_ID;
if (GA_ID) {
  ReactGA.initialize(GA_ID);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>,
);
