import React, { useState } from 'react';
import { BedDouble, Users, Maximize, Pencil, IndianRupee } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export default function RoomCard({ room, delay = 0, onEdit, onSaved }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div
      className="glass rounded-2xl overflow-hidden gold-glow-hover group animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-charcoal">
        {room.images?.[0] ? (
          <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]">
            <BedDouble className="w-10 h-10 text-gold/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F]/80 to-transparent" />
        <div className="absolute top-3 right-3"><StatusBadge status={room.status} /></div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 glass-strong rounded-full px-2.5 py-1">
          <IndianRupee className="w-3 h-3 text-gold" />
          <span className="text-xs font-medium text-foreground">{(room.price_per_night || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-muted-foreground">/night</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-medium text-foreground truncate">{room.name}</h3>
            <p className="text-[11px] text-muted-foreground">{room.category} · {room.bed_type}</p>
          </div>
          {room.room_number && <span className="text-[10px] text-muted-foreground glass px-2 py-1 rounded-md">#{room.room_number}</span>}
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gold/60" /> {room.capacity} Guests</span>
        </div>

        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {room.amenities.slice(0, 3).map((a, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-muted-foreground border border-white/5">{a}</span>
            ))}
            {room.amenities.length > 3 && <span className="text-[10px] text-muted-foreground">+{room.amenities.length - 3}</span>}
          </div>
        )}

        <div className="mt-auto pt-3">
          <button
            onClick={() => onEdit?.(room)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-gold/5 border border-white/5 hover:border-gold/20 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Room
          </button>
        </div>
      </div>
    </div>
  );
}