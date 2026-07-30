import React from 'react';
import { cn } from '@/lib/utils';

export function SkeletonCard({ className }) {
  return (
    <div className={cn('glass rounded-2xl p-5 overflow-hidden', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/[0.04] animate-shimmer" />
        <div className="w-10 h-4 rounded-full bg-white/[0.04] animate-shimmer" />
      </div>
      <div className="w-20 h-7 rounded-lg bg-white/[0.04] animate-shimmer mb-2" />
      <div className="w-28 h-3 rounded bg-white/[0.03] animate-shimmer" />
    </div>
  );
}

export function SkeletonRow({ className }) {
  return (
    <div className={cn('flex items-center gap-4 p-3', className)}>
      <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-32 h-3 rounded bg-white/[0.04] animate-shimmer" />
        <div className="w-20 h-2.5 rounded bg-white/[0.03] animate-shimmer" />
      </div>
      <div className="w-16 h-3 rounded bg-white/[0.04] animate-shimmer" />
    </div>
  );
}