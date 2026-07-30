import React, { useState, useEffect } from 'react';
import { listUsers } from '@/api/supabaseData';
import { UserCog, Crown, Shield } from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeletons';

const roleConfig = {
  admin: { label: 'Administrator', icon: Crown, cls: 'from-gold/25 to-gold/5 border-gold/30 text-gold' },
  owner_a: { label: 'Owner A', icon: UserCog, cls: 'from-blue-500/15 to-blue-500/5 border-blue-500/20 text-blue-400' },
  owner_b: { label: 'Owner B', icon: UserCog, cls: 'from-purple-500/15 to-purple-500/5 border-purple-500/20 text-purple-400' },
  user: { label: 'User', icon: Shield, cls: 'from-gray-500/15 to-gray-500/5 border-gray-500/20 text-gray-400' },
};

export default function Owners() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUsers();
        setUsers(data || []);
      } catch (e) { setUsers([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Owners & Users" subtitle="Manage administrators and property owners" icon={UserCog} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : users.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState icon={UserCog} title="No users found" description="Invite owners and administrators to manage properties." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u, i) => {
            const role = roleConfig[u.role] || roleConfig.user;
            const Icon = role.icon;
            return (
              <div key={u.id} className="glass rounded-2xl p-5 gold-glow-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br border flex items-center justify-center font-display text-xl font-semibold shrink-0 ${role.cls}`}>
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-medium text-foreground truncate">{u.full_name || u.email?.split('@')[0]}</h3>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Icon className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-gradient-to-r ${role.cls}`}>{role.label}</span>
                  <span className="text-[11px] text-muted-foreground">Joined {u.created_date ? new Date(u.created_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}