'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'motion/react';

// Neon Tetra Ambient Life
export function NeonTetraBackground() {
  const [fishes, setFishes] = useState<any[]>([]);

  useEffect(() => {
    // Generate some random neon tetras
    const newFishes = Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 5,
      yPos: Math.random() * 80 + 10, // 10% to 90%
      duration: 15 + Math.random() * 10 
    }));
    setFishes(newFishes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {fishes.map((fish) => (
        <motion.div
          key={fish.id}
          className="absolute"
          initial={{ x: '-20vw', y: `${fish.yPos}vh` }}
          animate={{ x: '120vw', y: [`${fish.yPos}vh`, `${fish.yPos - 5}vh`, `${fish.yPos + 5}vh`, `${fish.yPos}vh`] }}
          transition={{
            x: {
              repeat: Infinity,
              duration: fish.duration,
              delay: fish.delay,
              ease: "linear"
            },
            y: {
              repeat: Infinity,
              duration: 4,
              ease: "easeInOut"
            }
          }}
        >
          {/* SVG Neon Tetra */}
          <svg width="60" height="20" viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body */}
            <path d="M 10 15 Q 30 0 60 10 T 90 15 Q 60 30 10 15 Z" fill="#cfd8dc" />
            {/* Neon Blue Line */}
            <path d="M 15 13 Q 30 5 60 10" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffff)' }} />
            {/* Red Stripe */}
            <path d="M 40 18 Q 70 25 85 15" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" />
            {/* Eye */}
            <circle cx="20" cy="12" r="2" fill="#111" />
            {/* Tail */}
            <path d="M 90 15 L 100 5 L 95 15 L 100 25 Z" fill="#cfd8dc" opacity="0.8" />
          </svg>
        </motion.div>
      ))}
      
      {/* Background Floating Fish Emojis */}
      <motion.div 
        className="absolute text-2xl opacity-30"
        initial={{ x: '110vw', y: '70vh' }}
        animate={{ x: '-10vw', y: ['70vh', '65vh', '70vh'] }}
        transition={{
          x: { repeat: Infinity, duration: 25, delay: 5, ease: "linear" },
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        }}
      >
        🐡
      </motion.div>
      <motion.div 
        className="absolute text-lg opacity-20"
        initial={{ x: '-10vw', y: '30vh' }}
        animate={{ x: '110vw', y: ['30vh', '35vh', '30vh'] }}
        transition={{
          x: { repeat: Infinity, duration: 30, delay: 12, ease: "linear" },
          y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }}
      >
        🐠
      </motion.div>
    </div>
  );
}

// Sentient Fish Cursor
export function FishCursor() {
  const [mounted, setMounted] = useState(false);
  const [bubbles, setBubbles] = useState<{id: number, x: number, y: number}[]>([]);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springX = useSpring(cursorX, { stiffness: 150, damping: 15, mass: 0.8 });
  const springY = useSpring(cursorY, { stiffness: 150, damping: 15, mass: 0.8 });
  
  const [angle, setAngle] = useState(0);
  const prevPos = useRef({ x: 0, y: 0 });
  const bubbleIdCounter = useRef(0);

  useEffect(() => {
    setMounted(true);
    
    // Global style injection for cursor: none
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    const moveHandler = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const dx = e.clientX - prevPos.current.x;
      const dy = e.clientY - prevPos.current.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        const theta = Math.atan2(dy, dx) * (180 / Math.PI);
        setAngle(theta);
      }
      
      prevPos.current = { x: e.clientX, y: e.clientY };
    };

    const clickHandler = (e: MouseEvent) => {
      const newBubbles = Array.from({ length: 4 }).map((_, i) => ({
        id: bubbleIdCounter.current++,
        x: e.clientX + (Math.random() * 20 - 10),
        y: e.clientY + (Math.random() * 20 - 10)
      }));
      setBubbles(prev => [...prev, ...newBubbles]);
      
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => !newBubbles.find(nb => nb.id === b.id)));
      }, 1000);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mousedown', clickHandler);

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mousedown', clickHandler);
      document.head.removeChild(style);
    };
  }, [cursorX, cursorY]);

  if (!mounted) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: springX,
          y: springY,
          rotate: angle,
          marginLeft: '-15px',
          marginTop: '-15px',
        }}
        whileTap={{ scale: 0.8 }}
      >
        <svg fill="currentColor" width="30" height="30" viewBox="0 0 100 100" className="text-emerald-500 drop-shadow-md">
           <g>
             {/* Fish Body */}
             <path d="M20,50 Q40,30 80,50 Q40,70 20,50 Z" />
             {/* Fish Tail with wagging animation */}
             <g style={{ transformOrigin: '20px 50px' }} className="animate-[wag_0.2s_ease-in-out_infinite_alternate]">
               <path d="M20,50 L5,35 L5,65 Z" />
             </g>
           </g>
        </svg>
      </motion.div>

      {/* Ripple/Bubbles */}
      <AnimatePresence>
        {bubbles.map(bubble => (
          <motion.div
            key={bubble.id}
            className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full border-2 border-cyan-400"
            initial={{ x: bubble.x - 5, y: bubble.y - 5, width: 10, height: 10, opacity: 1, scale: 1 }}
            animate={{ y: bubble.y - 40, width: 30, height: 30, x: bubble.x - 15, opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wag {
          0% { transform: rotate(-15deg); }
          100% { transform: rotate(15deg); }
        }
      `}} />
    </>
  );
}
