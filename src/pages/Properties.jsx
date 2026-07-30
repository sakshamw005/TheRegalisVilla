import React, { useState, useEffect } from 'react';
import { listProperties } from '@/api/supabaseData';
import { Link } from 'react-router-dom';
import { Building2, Plus, MapPin, Star, BedDouble, Layers, Search } from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import GoldButton from '@/components/GoldButton';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeletons';
import PropertyFormDialog from '@/components/PropertyFormDialog';
import { useAuth } from '@/lib/AuthContext';

export default function Properties() {
  const { refreshProperties } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listProperties('-created_date', 50);
      setProperties(data || []);
    } catch (e) {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = properties.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = async () => { 
    setDialogOpen(false); 
    setEditTarget(null); 
    if (refreshProperties) await refreshProperties();
    load(); 
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Manage your luxury villa portfolio"
        icon={Building2}
        action={
          <GoldButton onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Property
          </GoldButton>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties…"
          className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/30 transition-all"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Building2}
            title={search ? "No matching properties" : "No properties yet"}
            description={search ? "Try a different search term." : "Add your first luxury property to get started."}
            action={!search && <GoldButton onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> Add Property</GoldButton>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              to={`/properties/${p.id}`}
              className="glass rounded-2xl overflow-hidden gold-glow-hover group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-charcoal">
                {p.cover_image ? (
                  <img
                    src={p.cover_image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
                    <Building2 className="w-12 h-12 text-gold/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
                <div className="absolute top-3 right-3"><StatusBadge status={p.status || 'active'} /></div>
                {p.rating > 0 && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 glass-strong rounded-full px-2.5 py-1">
                    <Star className="w-3 h-3 text-gold fill-gold" />
                    <span className="text-xs font-medium text-foreground">{p.rating}</span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5">
                <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-gold transition-colors">{p.name}</h3>
                {p.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" /> {p.city ? `${p.city}, ` : ''}{p.address}
                  </div>
                )}
                {p.description && <p className="text-sm text-muted-foreground/70 mt-2 line-clamp-2">{p.description}</p>}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="w-4 h-4 text-gold/60" /> {p.total_floors || 0} Floors
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BedDouble className="w-4 h-4 text-gold/60" /> {p.total_rooms || 0} Rooms
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <PropertyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} property={editTarget} onSaved={handleSaved} />
    </div>
  );
}