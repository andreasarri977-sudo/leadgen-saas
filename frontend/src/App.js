import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SearchLeads from '@/pages/SearchLeads';
import LeadsList from '@/pages/LeadsList';
import LeadDetail from '@/pages/LeadDetail';
import DemoSites from '@/pages/DemoSites';
import EmailManager from '@/pages/EmailManager';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchLeads />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="leads/:leadId" element={<LeadDetail />} />
            <Route path="demos" element={<DemoSites />} />
            <Route path="email" element={<EmailManager />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;