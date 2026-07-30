import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="animate-fade-down">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-gold" strokeWidth={1.75} />
          </div>
        )}
        <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="animate-fade-down">{action}</div>}
    </div>
  );
}