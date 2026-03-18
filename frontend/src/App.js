import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SearchLeads from '@/pages/SearchLeads';
import LeadsList from '@/pages/LeadsList';
import LeadDetail from '@/pages/LeadDetail';
import DemoSites from '@/pages/DemoSites';
import DemoPreview from '@/pages/DemoPreview';
import SiteEditor from '@/pages/SiteEditor';
import EmailManager from '@/pages/EmailManager';
import Settings from '@/pages/Settings';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/demo/:demoId" element={<DemoPreview />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchLeads />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="leads/:leadId" element={<LeadDetail />} />
            <Route path="demos" element={<DemoSites />} />
            <Route path="site-editor/:demoId" element={<SiteEditor />} />
            <Route path="email" element={<EmailManager />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
      <PWAInstallPrompt />
    </div>
  );
}

export default App;