/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { useAuth, signInWithGoogle, logOut } from '../lib/firebase';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function UserProfile() {
  const { user, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative group">
      {user ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="hidden md:flex flex-col items-end">
             <span className="text-xs font-bold text-cyan-900">{user.displayName}</span>
             <span className="text-[10px] text-slate-400">Scaper #Juara</span>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-400 shadow-sm relative">
            <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>

          <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right group-hover:scale-100 scale-95 z-50 overflow-hidden">
            <div className="p-4 border-b border-stone-100 text-center">
              <p className="text-sm font-bold text-cyan-900 truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={logOut}
              className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white shadow-md px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Login
        </button>
      )}
    </div>
  );
}
