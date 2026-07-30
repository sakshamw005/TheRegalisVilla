import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarDays, Users, CreditCard, BarChart3, UserCog, Settings, Crown, X, UserCheck } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Properties', icon: Building2, path: '/properties', adminOnly: true },
  { label: 'Bookings', icon: CalendarDays, path: '/bookings' },
  { label: 'Customers', icon: Users, path: '/customers', adminOnly: true },
  { label: 'Reports', icon: BarChart3, path: '/reports', adminOnly: true },
  { label: 'Users', icon: UserCheck, path: '/users', adminOnly: true },
  { label: 'Settings', icon: Settings, path: '/settings', adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed lg:sticky top-0 left-0 h-screen w-[260px] z-50 lg:z-30 flex flex-col bg-[#0B0B0B] border-r border-gold/15 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[68px] border-b border-gold/10 shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center">
            <Logo size="sm" />
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-gold transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto luxury-scrollbar px-3 py-5 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/60 uppercase">Management</div>
          {navItems
            .filter(item => !item.adminOnly || user?.role === 'admin')
            .map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 relative',
                    isActive
                      ? 'bg-gradient-to-r from-gold/15 to-transparent text-gold font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                  )}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />}
                  <Icon className={cn('w-[18px] h-[18px] transition-transform group-hover:scale-110', isActive && 'drop-shadow-[0_0_6px_rgba(201,162,39,0.5)]')} strokeWidth={1.75} />
                  <span className="tracking-wide">{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gold/10 shrink-0">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
              <Crown className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">Premium Suite</div>
              <div className="text-[10px] text-muted-foreground">v1.0 · All systems active</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}