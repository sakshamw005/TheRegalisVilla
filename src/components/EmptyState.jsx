import React from 'react';
import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gold/5 border border-gold/10 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gold/40" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}