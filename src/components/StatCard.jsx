import React from 'react';
import { cn } from '@/lib/utils';
import AnimatedCounter from '@/components/AnimatedCounter';

export default function StatCard({ icon: Icon, label, value, prefix, suffix, decimals, trend, accent = false, delay = 0 }) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-5 gold-glow-hover relative overflow-hidden animate-fade-up',
        accent && 'border-gold/30'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* glow accent */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/5 rounded-full blur-2xl" />

      <div className="flex items-start justify-between mb-3 relative">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', accent ? 'bg-gold/15' : 'bg-white/[0.04]')}>
          {Icon && <Icon className={cn('w-5 h-5', accent ? 'text-gold' : 'text-muted-foreground')} strokeWidth={1.75} />}
        </div>
        {trend !== undefined && (
          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="relative">
        <div className={cn('text-2xl lg:text-[28px] font-display font-semibold tracking-tight', accent ? 'gold-gradient-text' : 'text-foreground')}>
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </div>
        <div className="text-xs text-muted-foreground mt-1 tracking-wide">{label}</div>
      </div>
    </div>
  );
}