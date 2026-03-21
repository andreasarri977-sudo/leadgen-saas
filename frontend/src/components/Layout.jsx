import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, Globe, Mail, Settings as SettingsIcon, Menu, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/search', icon: Search, label: 'Cerca Aziende' },
  { path: '/leads', icon: Users, label: 'Lead' },
  { path: '/demos', icon: Globe, label: 'Siti Demo' },
  { path: '/bookings', icon: CalendarCheck, label: 'Prenotazioni' },
  { path: '/email', icon: Mail, label: 'Email' },
  { path: '/settings', icon: SettingsIcon, label: 'Impostazioni API' }
];

export default function Layout() {
  const location = useLocation();

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight">LeadHunter Pro</h1>
        <p className="text-sm text-neutral-400 mt-1">Automatizza il tuo business</p>
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <div
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:block w-64 sidebar border-r border-neutral-800">
        <SidebarContent />
      </aside>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              data-testid="mobile-menu-button"
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-white shadow-md"
            >
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 md:p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}