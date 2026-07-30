import React from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logo({ size = 'md', showText = true, className }) {
  const iconSize = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-14 h-14' }[size];
  const textSize = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }[size];
  const subSize = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[11px]' }[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] gold-border gold-glow shrink-0 overflow-hidden', iconSize)}>
        <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <div className="leading-none">
          <div className={cn('font-display font-semibold tracking-[0.18em] gold-gradient-text', textSize)}>REGALIS</div>
          <div className={cn('font-body tracking-[0.42em] text-muted-foreground uppercase mt-0.5', subSize)}>Villa</div>
        </div>
      )}
    </div>
  );
}