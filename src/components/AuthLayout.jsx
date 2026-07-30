import React from "react";
import Logo from "@/components/Logo";
import { Crown } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-[#0F0F0F] text-foreground relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(201,162,39,0.03)' }} />

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative border-r border-gold/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#0F0F0F] to-[#0F0F0F]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(201,162,39,0.15), transparent 60%)' }} />

        <div className="relative z-10 animate-fade-down">
          <Logo size="md" />
        </div>

        <div className="relative z-10 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold" strokeWidth={1.5} />
            </div>
            <span className="text-xs tracking-[0.3em] text-gold uppercase font-medium">Luxury Property Suite</span>
          </div>
          <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-tight text-balance">
            Where <span className="gold-gradient-text">Luxury</span><br />Meets Management
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
            The premier command center for managing your portfolio of villas, guest houses, and premium properties — crafted for discerning hospitality.
          </p>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} The Regalis Villa · All rights reserved
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" />
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 mb-4 gold-glow">
              {Icon && <Icon className="w-6 h-6 text-gold" strokeWidth={1.5} aria-hidden="true" />}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </div>

          <div className="glass-strong rounded-2xl p-6 lg:p-8">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}