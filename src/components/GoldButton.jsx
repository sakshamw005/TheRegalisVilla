import React from 'react';
import { cn } from '@/lib/utils';

export default function GoldButton({ children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-[#0F0F0F] font-semibold hover:shadow-[0_0_24px_rgba(201,162,39,0.4)] hover:brightness-110',
    outline: 'border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold/60',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}