import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PinPad({ onComplete, length = 4 }) {
  const [pin, setPin] = useState('');

  const press = (d) => {
    if (pin.length >= length) return;
    const next = pin + d;
    setPin(next);
    if (next.length === length && onComplete) onComplete(next);
  };
  const backspace = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin('');

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <div className="flex gap-3.5">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 transition-all duration-300',
              i < pin.length ? 'bg-gold border-gold scale-110' : 'border-white/20'
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="w-14 h-14 rounded-xl glass text-lg font-display font-medium hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all active:scale-95"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="w-14 h-14 rounded-xl glass text-[10px] font-medium text-muted-foreground hover:bg-white/5 transition-all active:scale-95"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          className="w-14 h-14 rounded-xl glass text-lg font-display font-medium hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          className="w-14 h-14 rounded-xl glass flex items-center justify-center hover:bg-white/5 transition-all active:scale-95"
        >
          <Delete className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}