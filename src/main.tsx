import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { QueuePage } from './pages/QueuePage';
import { SourceDetailPage, SourcesPage } from './pages/SourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppProvider } from './lib/store';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/queue" replace />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="sources/:sourceId" element={<SourceDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);
