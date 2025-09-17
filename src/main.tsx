import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import App from './App.tsx';
import Call from './Call.tsx';
import Lobby from './Lobby.tsx';
import './index.css';

const NotFound = () => (
  <div style={{ padding: 20, textAlign: 'center' }}>
    <h1>404 - Page non trouvée</h1>
    <p>La page que vous cherchez n'existe pas.</p>
    <a href="/">Retour à l'accueil</a>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/call" element={<Call />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);