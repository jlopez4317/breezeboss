import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Wrench, Package, FileText, Receipt,
  CalendarDays, Bell, ScanLine, Mail, Settings, ChevronLeft, ChevronRight, Wind, Factory, BarChart2
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Jobs', icon: Wrench, path: '/jobs' },
  { label: 'Materials', icon: Package, path: '/materials' },
  { label: 'Suppliers', icon: Factory, path: '/suppliers' },
  { label: 'Bids', icon: FileText, path: '/bids' },
  { label: 'Invoices', icon: Receipt, path: '/invoices' },
  { label: 'Reports', icon: BarChart2, path: '/reports' },
  { label: 'Appointments', icon: CalendarDays, path: '/appointments' },
  { label: 'Reminders', icon: Bell, path: '/reminders' },
  { label: 'Blueprint Scanner', icon: ScanLine, path: '/blueprint-scanner' },
  { label: 'Email Center', icon: Mail, path: '/email-center' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

// Store last visited URL per section in localStorage (persists across browser sessions)
const getLastUrl = (basePath) => {
  return localStorage.getItem(`last_url_${basePath}`) || basePath;
};

const saveLastUrl = (basePath, url) => {
  localStorage.setItem(`last_url_${basePath}`, url);
};

export default function Sidebar({ collapsed, setCollapsed, onNavClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current URL to the matching section whenever location changes
  useEffect(() => {
    for (const item of navItems) {
      if (item.path === '/') continue;
      if (location.pathname.startsWith(item.path)) {
        // Only save the base list URL, not detail page URLs
        // Detail pages have additional path segments (e.g. /customers/abc123)
        const pathAfterBase = location.pathname.slice(item.path.length);
        const isDetailPage = pathAfterBase.length > 1 && !pathAfterBase.startsWith('?');
        if (!isDetailPage) {
          saveLastUrl(item.path, location.pathname + location.search);
        }
        break;
      }
    }
  }, [location.pathname, location.search]);

  const handleNavClick = (item) => {
    if (onNavClick) onNavClick();
    if (item.path === '/') {
      navigate('/');
      return;
    }
    const lastUrl = getLastUrl(item.path);
    navigate(lastUrl);
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out",
      "text-[hsl(var(--sidebar-foreground))]",
      "border-r border-[hsl(var(--sidebar-border))]",
      collapsed ? "w-[68px]" : "w-[250px)]"
    )} style={{ background: 'linear-gradient(180deg, #1a4a7a 0%, #0f2d52 40%, #071a35 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center flex-shrink-0">
          <Wind className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white tracking-tight">BreezeBoss</h1>
            <p className="text-[10px] text-[hsl(var(--sidebar-foreground))] opacity-60 -mt-0.5">HVAC Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}