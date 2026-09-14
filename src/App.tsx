import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PapersPage } from './pages/PapersPage';
import { UploadPage } from './pages/UploadPage';
import { LiteratureReviewPage } from './pages/LiteratureReviewPage';
import { ComparePage } from './pages/ComparePage';
import { ResearchGapsPage } from './pages/ResearchGapsPage';
import { AssistantPage } from './pages/AssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/papers" element={<PapersPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/literature-review" element={<LiteratureReviewPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/research-gaps" element={<ResearchGapsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
