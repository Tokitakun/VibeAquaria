'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Camera, StickyNote, Users, BookOpen, Anchor } from 'lucide-react';
import { useAuth, signInWithGoogle } from '../lib/firebase';
import { cn } from '@/lib/utils';

export function InteractiveWelcomeCard() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (loading) return;
    
    // Always show for guests
    if (!user) {
      setIsOpen(true);
      setCurrentSlide(0); 
    } else {
      // For logged in users, check if they've finished the tutorial
      const hasSeenOnboarding = localStorage.getItem('vibeAquariaOnboarded_v6');
      if (!hasSeenOnboarding) {
        setIsOpen(true);
      }
    }
  }, [user, loading]);

  const handleClose = () => {
    // Only set the cache if the user is logged in
    if (user) {
      localStorage.setItem('vibeAquariaOnboarded_v6', 'true');
    }
    setIsOpen(false);
  };

  const slides = [
    {
      icon: <Sparkles className="w-12 h-12 text-emerald-500 mb-4" />,
      text: "Selamat Datang di VibeAquaria! Sahabat setia ekosistem airmu. Mari mulai perjalananmu menciptakan dunia bawah air yang indah."
    },
    {
      icon: <Camera className="w-12 h-12 text-cyan-500 mb-4" />,
      text: "Deteksi Instan! Gunakan fitur Snap & Care untuk mengetahui jenis ikan dan cek kesehatan mereka hanya dengan satu foto."
    },
    {
      icon: <StickyNote className="w-12 h-12 text-blue-500 mb-4" />,
      text: "Catatan Digital. Simpan semua hasil temuanmu dan buat jadwal perawatan rutin agar ikanmu tetap bahagia. Semuanya tersimpan aman!"
    },
    {
      icon: <Users className="w-12 h-12 text-indigo-500 mb-4" />,
      text: "Konsultasi Tim. Rancang desain aquascape impianmu dan pastikan semua penghuni di dalamnya hidup rukun lewat fitur Builder & Compatibility."
    },
    {
      icon: <BookOpen className="w-12 h-12 text-teal-500 mb-4" />,
      text: "Eksplorasi Wiki. Cari tahu jenis ikan, tanaman, dan dekorasi yang paling cocok untuk ukuran akuarium kamu!"
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2rem] p-8 overflow-hidden text-center"
            >
              {/* Close button */}
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {loading ? (
                <motion.div 
                  key="auth-loading"
                  className="flex flex-col items-center justify-center py-10"
                >
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600 font-medium animate-pulse">Memuat...</p>
                </motion.div>
              ) : !user ? (
                <motion.div 
                  key="auth-prompt"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col items-center justify-center py-6"
                >
                  <Anchor className="w-16 h-16 text-cyan-600 mb-6 drop-shadow-md" />
                  <h2 className="text-2xl font-bold font-sans text-cyan-900 mb-3">Halo, Scaper!</h2>
                  <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                    Bingung mau mulai dari mana? Login dulu yuk :D
                  </p>
                  <button 
                    onClick={signInWithGoogle}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform active:scale-95"
                  >
                    Sign In with Google
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center flex-1 py-4"
                    >
                      {slides[currentSlide].icon}
                      <p className="text-lg font-medium text-slate-700 leading-relaxed min-h-[100px]">
                        {slides[currentSlide].text}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation & Indicators */}
                  <div className="mt-8 flex flex-col items-center gap-6">
                    <div className="flex gap-2">
                      {slides.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            currentSlide === idx ? "w-6 bg-emerald-500" : "w-2 bg-slate-300"
                          )}
                        />
                      ))}
                    </div>

                    <div className="flex w-full gap-3">
                      <button
                        onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                        disabled={currentSlide === 0}
                        className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 bg-white/50 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (currentSlide === slides.length - 1) {
                            handleClose();
                          } else {
                            setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
                          }
                        }}
                        className="flex-1 py-3 px-4 rounded-full font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-transform active:scale-95"
                      >
                        {currentSlide === slides.length - 1 ? 'Mulai Sekarang' : 'Next'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Guidebook Icon */}
      {!loading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-[900] group"
        >
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            Guidebook
            <div className="absolute top-full right-4 border-[6px] border-transparent border-t-slate-800" />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-white/40 backdrop-blur-md border border-white/60 shadow-lg rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all duration-300 group ring-4 ring-emerald-500/10 hover:ring-emerald-500/30"
          >
            <BookOpen className="w-6 h-6 transition-transform group-hover:scale-110" />
          </button>
        </motion.div>
      )}
    </>
  );
}
