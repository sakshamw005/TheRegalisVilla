import React from 'react';
import { cn } from '@/lib/utils';

const config = {
  available: { label: 'Available', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  booked: { label: 'Booked', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  reserved: { label: 'Reserved', cls: 'bg-gold/15 text-gold border-gold/20' },
  maintenance: { label: 'Maintenance', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  inactive: { label: 'Inactive', cls: 'bg-gray-500/10 text-gray-500 border-gray-500/15' },
  cleaning_required: { label: 'Cleaning', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  active: { label: 'Active', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  pending: { label: 'Pending', cls: 'bg-gold/15 text-gold border-gold/20' },
  partially_paid: { label: 'Partial', cls: 'bg-gold/15 text-gold border-gold/20' },
  paid: { label: 'Paid', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  checked_in: { label: 'Checked In', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  checked_out: { label: 'Checked Out', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/10 text-red-400 border-red-500/15' },
  approved: { label: 'Approved', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  executed: { label: 'Executed', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

export default function StatusBadge({ status, className }) {
  const c = config[status] || { label: status, cls: 'bg-white/5 text-muted-foreground border-white/10' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border', c.cls, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {c.label}
    </span>
  );
}