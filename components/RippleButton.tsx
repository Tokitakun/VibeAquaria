import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function RippleButton({ children, onClick, className, disabled, type = "button" }: any) {
  const [ripples, setRipples] = useState<any[]>([]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const newRipple = { x, y, size, id: Date.now() };

    setRipples((prev) => [...prev, newRipple]);
    if (onClick && type !== 'submit') { // prevent double submission if it's a form
        onClick(e);
    }
  };

  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <button
      type={type}
      className={cn("relative overflow-hidden", className)}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      onClick={type === 'submit' ? onClick : undefined}
    >
      {children}
      <AnimatePresence>
        {ripples.map((rip) => (
          <motion.span
            key={rip.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute bg-white/40 rounded-full pointer-events-none"
            style={{ left: rip.x, top: rip.y, width: rip.size, height: rip.size }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
}
