import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import AppV2 from './AppV2.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* V1 (legacy) route */}
        <Route path="/v1" element={<App />} />

        {/* V2 (new) route - default */}
        <Route path="/v2" element={<AppV2 />} />
        <Route path="/" element={<Navigate to="/v2" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
