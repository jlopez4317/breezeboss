import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Menu, UserCircle, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function TopBar({ onToggleMobile }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load all searchable data
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });
  const { data: bids = [] } = useQuery({
    queryKey: ['bids'],
    queryFn: () => base44.entities.Bid.list('-created_date', 500),
  });

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic
  const q = searchQuery.toLowerCase().trim();
  const results = q.length < 2 ? [] : [
    ...customers
      .filter(c => `${c.firstName} ${c.lastName} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({
        type: 'Customer',
        label: `${c.firstName} ${c.lastName}`,
        sub: c.phone || c.email || c.city || '',
        path: `/customers/${c.id}`,
        color: 'text-blue-600',
      })),
    ...jobs
      .filter(j => `${j.jobName} ${j.jobNumber} ${j.jobType} ${j.status}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(j => ({
        type: 'Job',
        label: j.jobName,
        sub: `${j.jobNumber} · ${j.status}`,
        path: `/jobs/${j.id}`,
        color: 'text-orange-600',
      })),
    ...invoices
      .filter(i => `${i.invoiceNumber} ${i.status}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map(i => ({
        type: 'Invoice',
        label: i.invoiceNumber,
        sub: `${i.status} · $${(i.totalAmount || 0).toLocaleString()}`,
        path: `/invoices/${i.id}`,
        color: 'text-green-600',
      })),
    ...bids
      .filter(b => `${b.bidNumber} ${b.status}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map(b => ({
        type: 'Bid',
        label: b.bidNumber,
        sub: `${b.status}`,
        path: `/bids`,
        color: 'text-purple-600',
      })),
  ];

  const handleSelect = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30" style={{ backgroundColor: '#fefaf3', borderBottom: '1px solid #ede8da' }}>
      <div className="flex items-center gap-3">
        <button onClick={onToggleMobile} className="md:hidden p-2 rounded-lg hover:bg-muted">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search customers, jobs, invoices... (Ctrl+K)"
            className="pl-9 pr-8 w-64 lg:w-96"
            style={{ backgroundColor: '#fdf5e4', borderColor: '#e6d9bb' }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Results Dropdown */}
          {showResults && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 mt-1 w-full lg:w-[480px] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(r.path)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-muted ${r.color} min-w-[60px] text-center`}>
                        {r.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                      </div>
                    </button>
                  ))}
                  <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
                    {results.length} result{results.length !== 1 ? 's' : ''} · Press Esc to close
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
              <Plus className="w-4 h-4" /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/customers?new=true')}>New Customer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/jobs?new=true')}>New Job</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/appointments?new=true')}>New Appointment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/blueprint-scanner')}>Scan Blueprint</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
          {user?.full_name?.[0] || <UserCircle className="w-4 h-4" />}
        </div>
      </div>
    </header>
  );
}