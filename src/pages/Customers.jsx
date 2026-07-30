import React, { useState, useEffect } from 'react';
import { listCustomers } from '@/api/supabaseData';
import { Users, Search, Plus, Phone, Mail } from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import GoldButton from '@/components/GoldButton';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeletons';
import CustomerFormDialog from '@/components/CustomerFormDialog';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await listCustomers('-created_date', 50);
      setCustomers(data || []);
    } catch (e) { 
      setCustomers([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadCustomers(); 
  }, []);

  const filtered = customers.filter(c => 
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Your guest database and history"
        icon={Users}
        action={
          <GoldButton onClick={() => setCustomerDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Add Customer
          </GoldButton>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search by name, phone, email…" 
          className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/30 transition-all text-foreground placeholder:text-muted-foreground/50" 
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState 
            icon={Users} 
            title={search ? "No matching customers" : "No customers yet"} 
            description={search ? "Try a different search." : "Add your first guest to the database."} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <div 
              key={c.id} 
              className="glass rounded-2xl p-5 gold-glow-hover animate-fade-up" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-display text-xl font-semibold shrink-0 overflow-hidden">
                  {c.photo ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" /> : (c.name || '?').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-medium text-foreground truncate capitalize">{c.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>
                  {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail className="w-3 h-3 shrink-0" /> {c.email}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                <div className="text-center">
                  <div className="text-lg font-display font-semibold gold-gradient-text">{c.total_stays || 0}</div>
                  <div className="text-[10px] text-muted-foreground tracking-wider uppercase">Total Stays</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-display font-semibold text-foreground">₹{(c.lifetime_spending || 0).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-muted-foreground tracking-wider uppercase">Lifetime Spend</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Registration Dialog */}
      <CustomerFormDialog 
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSaved={() => {
          setCustomerDialogOpen(false);
          loadCustomers();
        }}
      />
    </div>
  );
}