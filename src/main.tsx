import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import App from './App.tsx';
import Call from './Call.tsx';
import Lobby from './Lobby.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/call" element={<Call />} />
      </Routes>     
    </BrowserRouter>
  </StrictMode>,
);
