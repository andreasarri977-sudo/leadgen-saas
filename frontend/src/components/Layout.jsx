import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Search, Users, Globe, Mail, Settings as SettingsIcon, Menu, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import API from '@/lib/api';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/search', icon: Search, label: 'Cerca Aziende' },
  { path: '/leads', icon: Users, label: 'Lead' },
  { path: '/demos', icon: Globe, label: 'Siti Demo' },
  { path: '/clients', icon: Crown, label: 'Clienti', badge: 'renewals' },
  { path: '/email', icon: Mail, label: 'Email' },
  { path: '/settings', icon: SettingsIcon, label: 'Impostazioni API' }
];

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [renewalsCount, setRenewalsCount] = useState(0);

  // Polling leggero ogni 60s del numero di scadenze imminenti
  useEffect(() => {
    let cancelled = false;
    const fetchRenewals = async () => {
      try {
        const res = await axios.get(`${API}/leads?action=upcoming_renewals&days=30`);
        if (!cancelled) setRenewalsCount(res.data?.count || 0);
      } catch { /* silent */ }
    };
    fetchRenewals();
    const id = setInterval(fetchRenewals, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Get current page title
  const currentPage = navItems.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'Dashboard';

  const SidebarContent = ({ onNavigate }) => (
    <>
      <div className="p-6 border-b border-neutral-800 flex flex-col items-center">
        <img src="/logo-webfinder.png" alt="WebFinder Studio" className="w-24 h-24 rounded-full object-cover shadow-lg" />
        <h1 className="mt-3 text-base font-semibold tracking-wide text-white">WebFinder Studio</h1>
        <p className="text-xs text-neutral-400 mt-1">Lead generation & siti web</p>
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onNavigate}>
              <div
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge === 'renewals' && renewalsCount > 0 && (
                  <span
                    className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse"
                    data-testid="sidebar-renewals-badge"
                    title={`${renewalsCount} scadenze nei prossimi 30 giorni`}
                  >
                    {renewalsCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-neutral-50">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden md:flex md:flex-col w-64 sidebar border-r border-neutral-800 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Header - Fixed/Sticky */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-900 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            data-testid="mobile-menu-button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-white hover:bg-neutral-800"
          >
            <Menu size={24} />
          </Button>
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 sidebar">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white hover:bg-neutral-800"
              >
                <X size={24} />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen min-h-[100dvh]">
        {/* Padding top for mobile header */}
        <div className="pt-14 md:pt-0">
          <div className="container mx-auto p-4 sm:p-6 md:p-8 lg:p-12 pb-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}