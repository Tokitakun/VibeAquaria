/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, ImageIcon, Leaf, Droplets, Fish, AlertTriangle, CheckCircle2, Activity, Info, Loader2, Bookmark, MapPin, Heart, BookOpen, Map, Store, Trash2, Share2, Quote, Search, Lock, CheckSquare, Square, Code, Cpu, Cloud, Layers } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Lottie from 'lottie-react';
import { StoreLocator } from './StoreLocator';
import { UserProfile } from './UserProfile';
import { useAuth, db, signInWithGoogle } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import encyclopediaData from '../lib/encyclopedia.json';
import lottieAnimationData from '../public/lottie-fish.json';

import { InteractiveWelcomeCard } from './InteractiveWelcomeCard';
import { NeonTetraBackground, FishCursor } from './AquaticExperience';
import { RippleButton } from './RippleButton';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const playBlupSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    
    // "Blup" envelope
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.error("Audio error", e);
  }
};

// System Instruction based on VibeAquaria AI rules
const SYSTEM_INSTRUCTION = `
# ROLE
Anda adalah "VibeAquaria AI", asisten pintar yang ramah dan ahli dalam dunia Aquascape. Anda bertugas membantu user di aplikasi VibeAquaria (Project #JuaraVibeCoding) untuk menjaga ekosistem air tetap sehat dan berkelanjutan (Sustainable).

# PERSONA & TONE
- GAYA BAHASA: Santai, ramah, dan sangat mudah dipahami orang awam. 
- TEKNIK ANALOGI: Jelaskan istilah sulit dengan perumpamaan sehari-hari (Contoh: "Filter itu seperti ginjal akuarium, fungsinya membersihkan kotoran agar air tidak beracun").
- SIKAP: Selalu mendukung (supportive) dan sangat peduli pada keselamatan ikan (Zero Fish Fatality).

# OPERATIONAL MODES

1. MODUL SNAP & CARE (IDENTIFIKASI):
   - Jika user upload foto, tebak jenis ikan/tanamannya.
   - Jelaskan cara rawatnya pakai bahasa "curhat" (Contoh: "Ikan ini suka air yang tenang, jangan kasih arus kencang ya biar dia nggak pusing").
   - Berikan info pH dan Suhu dalam bahasa simpel (Contoh: "Suhu adem: 24-28 derajat").

2. MODUL BUILDER (KONSULTASI TEMA):
   - Jelaskan tema (Iwagumi, Dutch, dll) dengan bahasa visual (Contoh: "Tema Iwagumi itu seperti taman batu Jepang yang tenang").
   - Kasih daftar belanjaan yang masuk akal buat pemula.

3. MODUL COMPATIBILITY (CEK TEMAN):
   - Pakai status: 🟢 Aman (Temanan), 🟡 Waspada (Mungkin berantem), 🔴 Bahaya (Jangan digabung!).
   - Jelaskan alasannya (Contoh: "Ikan ini galak, nanti udang kamu dimakan").

4. MODUL AUTH & ABOUT (HISTORY & INFO):
   - Jika user tanya kenapa harus login: Jelaskan bahwa dengan login (Google Sign-In), semua riwayat foto dan konsultasi mereka akan tersimpan aman di "Buku Catatan Digital" mereka.
   - Jika user tanya tentang VibeAquaria: Jelaskan ini project buatan Nafis (siswa SMA penghobi Molly) untuk membantu sesama scaper menjaga alam.

# STRICT CONSTRAINTS
- OUTPUT HARUS 100% VALID JSON.
- Fokus pada Sustainability: Berikan skor 1-100 untuk setiap pilihan user.
- Gunakan Bahasa Indonesia yang sangat akrab (User-friendly).

# JSON STRUCTURE REFERENCE
{
  "category": "snap_care" | "builder" | "compatibility" | "info",
  "status": "success" | "error",
  "data": {
    "title": "Nama Ikan / Tema / Status",
    "analogi_awam": "Penjelasan sangat simpel pakai perumpamaan dunia nyata.",
    "tips_praktis": [
      "Langkah simpel 1",
      "Langkah simpel 2"
    ],
    "spek_air": {
      "suhu": "Misal: Adem (24-28C)",
      "ph": "Misal: Netral (6.5-7.5)",
      "level": "Gampang / Lumayan / Susah"
    },
    "indikator": "🟢" | "🟡" | "🔴",
    "skor_sustainability": 90,
    "pesan_catatan": "Pesan tentang kenapa login itu penting untuk simpan history ini."
  },
  "summary": "1 kalimat kesimpulan biar user paham intinya."
}
`;

type TabType = 'home' | 'snap' | 'builder' | 'compatibility' | 'ensiklopedia' | 'info' | 'catatan';

export default function VibeAquariaApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Catatan Digital State
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const { user } = useAuth();
  
  // Realtime subscription logic
  useEffect(() => {
    if (user) {
      // If user is logged in, fetch from Firestore
      const q = query(
        collection(db, 'notes'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedNotes(notesData);
      }, (err) => {
        console.error('Error fetching notes', err);
      });
      return () => unsubscribe();
    } else {
      // Fallback to local storage if not logged in
      const notes = localStorage.getItem('vibe_aquaria_notes');
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          setTimeout(() => setSavedNotes(parsed), 0);
        } catch (e) {
          console.error('Failed to parse notes');
        }
      } else {
        setTimeout(() => setSavedNotes([]), 0);
      }
    }
  }, [user]);

  const saveToNotes = async (dataToSave: any) => {
    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const newNote = {
      date: formattedDate,
      ...dataToSave
    };

    if (user) {
      // Save it to firestore
      try {
        await addDoc(collection(db, 'notes'), {
          ...newNote,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to save to firestore", err);
      }
    } else {
      const fallbackNote = { ...newNote, id: Date.now() };
      const updatedNotes = [fallbackNote, ...savedNotes];
      setSavedNotes(updatedNotes);
      localStorage.setItem('vibe_aquaria_notes', JSON.stringify(updatedNotes));
    }
  };


  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setMediaStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access denied or error:', err);
      setError("Ups! VibeAquaria butuh ijin kamera buat liat ikan cantikmu.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        // Create a dummy File object for the AI processing
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => setSelectedImage(new File([blob], "camera-capture.jpg", { type: "image/jpeg" })));
        
        playBlupSound();
        closeCamera();
      }
    }
  };

  const closeCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    setMediaStream(null);
    setIsCameraOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteNote = async (id: string | number) => {
    if (user && typeof id === 'string') {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (err) {
        console.error("Failed to delete note from firestore", err);
      }
    } else {
      const updatedNotes = savedNotes.filter(note => note.id !== id);
      setSavedNotes(updatedNotes);
      localStorage.setItem('vibe_aquaria_notes', JSON.stringify(updatedNotes));
    }
  };

  const clearInput = () => {
    setInputText('');
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && !selectedImage) {
      setError('Silakan berikan input teks atau gambar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key tidak ditemukan. Pastikan sudah dikonfigurasi di Environment Secrets.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [];
      if (selectedImage) {
        const imagePart = await fileToGenerativePart(selectedImage);
        parts.push(imagePart);
      }
      
      let contextualPrompt = inputText.trim();
      if (!contextualPrompt) {
        contextualPrompt = 'Analisis gambar ini sesuai instruksi.';
      }

      parts.push(contextualPrompt);

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: parts,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for more deterministic JSON
        }
      });

      const responseText = response.text || '';
      try {
        const jsonResponse = JSON.parse(responseText);
        setResult(jsonResponse);
        playBlupSound();
      } catch (e) {
        throw new Error('Gagal memproses respons dari AI (Format JSON tidak valid).');
      }

    } catch (err: any) {
      console.error(err);
      // Handle Quota Exhausted (429) specifically
      if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429')) {
        setError('Waduh, asisten AI VibeAquaria lagi rame banget/limit tercapai! 🙏 Tunggu sebentar ya (sekitar 1 menit) terus coba kirim lagi. Maaf banget ya Scaper!');
      } else {
        setError(err.message || 'Terjadi kesalahan saat memproses permintaan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-slate-700 font-sans selection:bg-cyan-200 flex flex-col relative overflow-hidden">
      <NeonTetraBackground />
      <FishCursor />
      <InteractiveWelcomeCard />
      <div className="bg-emerald-600 text-white text-center py-2 px-4 shadow-sm text-xs md:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 relative z-10">
        <Leaf className="w-4 h-4" /> VibeAquaria mendedikasikan AI untuk kelestarian ekosistem air
      </div>

      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-sky-100 shadow-sm z-50">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Server Online
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 flex-1 w-full">
        {/* Mobile Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 backdrop-blur-md border-t border-cyan-100 px-2 py-2 flex justify-between items-center shadow-lg pb-safe">
        <button onClick={() => { setActiveTab('home'); clearInput(); }} className={cn("flex flex-col items-center p-2 rounded-xl transition-all", activeTab === 'home' ? "text-cyan-900 bg-cyan-50" : "text-slate-500 hover:text-cyan-700")}>
          <Droplets className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => { setActiveTab('snap'); clearInput(); }} className={cn("flex flex-col items-center p-2 rounded-xl transition-all", activeTab === 'snap' ? "text-cyan-900 bg-cyan-50" : "text-slate-500 hover:text-cyan-700")}>
          <Camera className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Snap</span>
        </button>
        <button onClick={() => { setActiveTab('builder'); clearInput(); }} className={cn("flex flex-col items-center p-2 rounded-xl transition-all", activeTab === 'builder' ? "text-cyan-900 bg-cyan-50" : "text-slate-500 hover:text-cyan-700")}>
          <Leaf className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Builder</span>
        </button>
        <button onClick={() => { setActiveTab('compatibility'); clearInput(); }} className={cn("flex flex-col items-center p-2 rounded-xl transition-all", activeTab === 'compatibility' ? "text-cyan-900 bg-cyan-50" : "text-slate-500 hover:text-cyan-700")}>
          <Activity className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Cek</span>
        </button>
        <button onClick={() => { setActiveTab('ensiklopedia'); clearInput(); }} className={cn("flex flex-col items-center p-2 rounded-xl transition-all", activeTab === 'ensiklopedia' ? "text-cyan-900 bg-cyan-50" : "text-slate-500 hover:text-cyan-700")}>
          <Map className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Wiki</span>
        </button>
      </nav>

      {/* Mobile Top Header (for user profile & about/notes) */}
      <header className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-cyan-100 pt-2 sticky top-0 z-40 bg-sky-50/90 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('home'); clearInput(); }}>
          <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-cyan-800">VibeAquaria <span className="font-light opacity-60">AI</span></h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setActiveTab('info'); clearInput(); }} className={cn("p-2 rounded-full transition-colors", activeTab === 'info' ? "bg-cyan-100 text-cyan-800" : "text-slate-500 hover:bg-sky-100")} title="Tentang Aplikasi">
            <Info className="w-4 h-4"/>
          </button>
          <button onClick={() => { setActiveTab('catatan'); clearInput(); }} className={cn("p-2 rounded-full transition-colors", activeTab === 'catatan' ? "bg-cyan-100 text-cyan-800" : "text-slate-500 hover:bg-sky-100")} title="Catatan AI">
            <BookOpen className="w-4 h-4"/>
          </button>
          <div className="pl-1 scale-90">
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Desktop & Tablet Header */}
      <header className="mb-8 lg:mb-10 hidden md:flex flex-col lg:flex-row items-center justify-between pb-4 lg:pb-6 border-b border-cyan-100 mt-2 lg:mt-0 gap-4 lg:gap-6 sticky top-0 z-40 bg-sky-50/90 backdrop-blur-md pt-4">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity w-full lg:w-auto justify-center lg:justify-start" onClick={() => { setActiveTab('home'); clearInput(); }}>
          <div className="w-12 h-12 rounded-full bg-cyan-700 flex items-center justify-center shrink-0 shadow-sm">
            <Droplets className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-cyan-800 flex items-baseline gap-2">
              VibeAquaria <span className="font-light opacity-60 text-2xl">AI</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold opacity-40 mt-1">Pakar Aquascape & Ekosistem</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex flex-wrap justify-center items-center gap-x-2 lg:gap-x-4 gap-y-2 font-sans text-[11px] md:text-sm uppercase tracking-widest font-bold">
          <button onClick={() => { setActiveTab('home'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'home' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>Home</button>
          <button onClick={() => { setActiveTab('snap'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'snap' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>Snap & Care</button>
          <button onClick={() => { setActiveTab('builder'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'builder' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>Builder</button>
          <button onClick={() => { setActiveTab('compatibility'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'compatibility' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>Kecocokan</button>
          <button onClick={() => { setActiveTab('ensiklopedia'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'ensiklopedia' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>Wiki</button>
          
          <div className="w-px h-6 bg-cyan-200 hidden lg:block mx-1"></div>
          
          <button onClick={() => { setActiveTab('catatan'); clearInput(); }} className={cn("transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl", activeTab === 'catatan' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}><BookOpen className="w-4 h-4"/> Catatan</button>
          <button onClick={() => { setActiveTab('info'); clearInput(); }} className={cn("transition-all px-3 py-2 rounded-xl", activeTab === 'info' ? "text-cyan-900 bg-cyan-100" : "text-slate-500 hover:bg-sky-100 hover:text-cyan-800")}>About</button>
          <div className="pl-2">
            <UserProfile />
          </div>
        </nav>
      </header>

      {activeTab === 'info' ? (
        <AboutComponent />
      ) : activeTab === 'ensiklopedia' ? (
        <EncyclopediaComponent />
      ) : activeTab === 'home' ? (
        <HomeComponent setActiveTab={setActiveTab} savedNotes={savedNotes} />
      ) : activeTab === 'catatan' ? (
        <CatatanComponent savedNotes={savedNotes} onDelete={deleteNote} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column - Input */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="backdrop-blur-md bg-white/70 p-6 lg:p-8 rounded-3xl flex flex-col gap-4 border border-stone-200 shadow-sm">
             <div className="bg-white p-6 lg:p-8 rounded-3xl border border-stone-100 shadow-sm">
                 <div className="mb-6">
                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-600 mb-2">Input configuration</p>
                    <h2 className="text-xl font-light italic text-cyan-900">
                      {activeTab === 'snap' && 'Identifikasi Flora/Fauna'}
                      {activeTab === 'builder' && 'Konsultan Tema Aquascape'}
                      {activeTab === 'compatibility' && 'Cek Kecocokan Spesies'}
                    </h2>
                    <p className="text-[11px] font-sans text-slate-500 mt-2 leading-relaxed">
                      {activeTab === 'snap' && 'Unggah foto organisme air untuk mendapatkan panduan perawatan dan informasi keberlanjutan.'}
                      {activeTab === 'builder' && 'Sebutkan tema (contoh: Iwagumi, Dutch) dan kami akan buatkan rencana pembuatannya.'}
                      {activeTab === 'compatibility' && 'Masukkan dua atau lebih spesies untuk dianalisis kecocokannya.'}
                      <br/>
                      <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-full">
                        Didukung oleh {encyclopediaData.length} data spesies
                      </span>
                    </p>
                 </div>
                 
                 {activeTab === 'snap' && (
                    <div className="mb-6 space-y-4">
                      {isCameraOpen ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-0 right-0 gap-4 flex justify-center">
                            <button onClick={capturePhoto} className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-full hover:bg-emerald-600 shadow-lg">
                              Ayo Foto!
                            </button>
                            <button onClick={closeCamera} className="bg-rose-500 text-white font-bold px-6 py-3 rounded-full hover:bg-rose-600 shadow-lg">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center aspect-video relative overflow-hidden",
                              imagePreview ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:border-emerald-300 hover:bg-stone-50 relative group"
                            )}
                          >
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              ref={fileInputRef} 
                              onChange={handleImageChange}
                            />
                            {imagePreview ? (
                              <div className="absolute inset-0">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-cyan-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm">
                                  <p className="text-white font-sans text-xs font-bold tracking-widest flex items-center gap-2 shadow-sm rounded-full bg-white/20 px-6 py-3"><Camera className="w-4 h-4" /> GANTI GAMBAR</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-cyan-50 p-4 rounded-full text-cyan-600 mb-3 group-hover:scale-110 transition-transform group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-light italic text-cyan-900">Klik untuk mengunggah foto</p>
                                <p className="text-[10px] font-sans uppercase tracking-widest text-slate-400 mt-3">PNG, JPG, max 10MB</p>
                              </>
                            )}
                          </div>
                          {!imagePreview && (
                            <button 
                              onClick={startCamera}
                              className="w-full bg-cyan-100 text-cyan-800 font-sans text-xs font-bold tracking-widest py-3 px-4 rounded-2xl border border-cyan-200 hover:bg-cyan-200 transition-colors flex justify-center items-center gap-2"
                            >
                              <Camera className="w-4 h-4" /> BUKA KAMERA
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 relative">
                    <textarea
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-6 py-5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all min-h-[120px] resize-none text-slate-700"
                      placeholder={
                        activeTab === 'snap' ? 'Tuliskan catatan tambahan tentang ekosistem Anda...' :
                        activeTab === 'builder' ? 'Contoh: Saya ingin membuat aquascape tema Nature untuk ukuran tank 60cm...' :
                        'Contoh: Apakah aman mencampur Neon Tetra dengan Udang Hias Amano di suhu 26°C?'
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                  </div>

                  {error && (
                    <div className="mt-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-5 text-[11px] font-sans font-bold flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 shrink-0 -mt-0.5 text-rose-500" />
                      <p>{error}</p>
                    </div>
                  )}

                 <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="mt-6 w-full bg-cyan-700 hover:bg-cyan-800 text-white font-sans font-bold tracking-widest text-xs py-4 px-6 rounded-full shadow-md shadow-cyan-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
                 >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isLoading ? 'MENGANALISIS...' : 'KIRIM KE VIBEAQUARIA AI'}
                 </button>
             </div>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!result && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full min-h-[400px] border border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/50 backdrop-blur-sm"
              >
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Fish className="w-10 h-10 text-stone-300" />
                </div>
                <h3 className="text-2xl font-light italic text-cyan-800 mb-3">Kolam Masih Kosong</h3>
                <p className="max-w-sm text-sm font-sans opacity-80 leading-relaxed">Gunakan panel di sebelah kiri untuk berinteraksi dengan asisten AI VibeAquaria.</p>
              </motion.div>
            )}

            {isLoading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-6"
              >
                {/* Header Skeleton */}
                <div className="p-6 md:p-8 rounded-3xl bg-cyan-50 border border-cyan-100 flex flex-col md:flex-row gap-6 relative overflow-hidden h-72 md:h-56 animate-pulse">
                  <div className="flex-1 space-y-4 w-full flex flex-col justify-center">
                    <div className="h-6 bg-cyan-200/60 rounded-full w-1/3 md:w-1/4"></div>
                    <div className="h-10 bg-cyan-200/60 rounded-3xl w-4/5 md:w-2/3 mt-2"></div>
                    <div className="h-4 bg-cyan-200/60 rounded-full w-full mt-6"></div>
                    <div className="h-4 bg-cyan-200/60 rounded-full w-5/6"></div>
                    <div className="h-12 bg-cyan-200/60 rounded-full w-2/3 md:w-1/3 mt-6"></div>
                  </div>
                  <div className="hidden md:flex shrink-0 w-32 h-32 self-center items-center justify-center bg-white/30 rounded-3xl shadow-inner">
                    <div className="w-full h-full p-2">
                       <Lottie animationData={lottieAnimationData} loop={true} style={{ width: '100%', height: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-stone-100 animate-pulse h-36">
                    <div className="h-4 bg-stone-200 rounded-full w-1/4 mb-6"></div>
                    <div className="h-6 bg-stone-200 rounded-full w-full"></div>
                  </div>
                  <div className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-stone-100 animate-pulse h-48">
                    <div className="h-4 bg-stone-200 rounded-full w-1/3 mb-8"></div>
                    <div className="space-y-6">
                       <div className="flex justify-between"><div className="h-4 bg-stone-200 rounded-full w-1/4"></div><div className="h-4 bg-stone-200 rounded-full w-1/4"></div></div>
                       <div className="flex justify-between"><div className="h-4 bg-stone-200 rounded-full w-1/4"></div><div className="h-4 bg-stone-200 rounded-full w-1/4"></div></div>
                    </div>
                  </div>
                  <div className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-stone-100 animate-pulse h-48">
                     <div className="h-4 bg-stone-200 rounded-full w-1/3 mb-6"></div>
                     <div className="h-20 bg-stone-200 rounded-2xl w-full"></div>
                  </div>
                </div>
              </motion.div>
            )}

            {result && !isLoading && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pb-24 lg:pb-0"
              >
                {/* Result Cards based on type */}
                {result.status === 'error' ? (
                  <div className="bg-rose-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                     <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                     <div className="z-10 relative">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="bg-white/20 p-3 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <h2 className="text-2xl font-light italic">Analisis Gagal</h2>
                       </div>
                       <p className="text-sm font-sans opacity-90 leading-relaxed">{result.message || 'Terjadi kesalahan tidak terduga pada output.'}</p>
                     </div>
                  </div>
                ) : (
                  <>
                    {/* Header Score & Summary */}
                    <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-600 to-cyan-700 text-white shadow-xl shadow-cyan-900/10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 mix-blend-overlay"></div>
                      <div className="z-10 flex-1 w-full text-center md:text-left">
                        <span className="text-[10px] font-sans uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-4 inline-block shadow-sm">
                          {result.category === 'snap_care' ? 'Snap & Care Identity Card' : result.category === 'builder' ? 'Builder Consultant' : result.category === 'info' ? 'Info Project' : 'Compatibility Check'}
                        </span>
                        <h2 className="text-3xl lg:text-4xl font-light italic mb-2 leading-tight flex items-center justify-center md:justify-start gap-3 flex-wrap">
                          {result.data?.title || 'Hasil Analisis'}
                          <span className="text-4xl drop-shadow-md bg-white/10 p-2 rounded-2xl border border-white/20">
                            {result.data?.indikator === '🔴' ? '🚫' : result.data?.indikator === '🟡' ? '⚔️' : result.data?.indikator}
                          </span>
                        </h2>
                        <p className="text-sm leading-relaxed text-emerald-50 font-sans italic border-l-2 border-white/30 pl-4 mt-4">
                          &quot;{result.summary}&quot;
                        </p>
                        <button 
                          onClick={() => saveToNotes({ ...result.data, category: result.category, summary: result.summary })}
                          className="mt-6 bg-white text-cyan-800 hover:bg-stone-100 font-sans font-bold text-xs px-5 py-2.5 rounded-full flex items-center justify-center md:justify-start gap-2 shadow-lg transition-all active:scale-95 mx-auto md:mx-0"
                        >
                           <Bookmark className="w-4 h-4 text-emerald-600" /> Simpan ke Timeline
                        </button>
                      </div>
                      
                      <div className="z-10 shrink-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 min-w-[140px] shadow-inner">
                        <span className="text-[10px] font-sans uppercase tracking-widest opacity-90 mb-2 font-bold block">Sustain Score</span>
                        <span className={cn("text-5xl font-bold font-sans tracking-tighter drop-shadow-lg", result.data?.skor_sustainability >= 90 ? "text-emerald-200" : result.data?.skor_sustainability >= 70 ? "text-cyan-100" : "text-rose-200")}>
                          {result.data?.skor_sustainability || 0}
                        </span>
                        <div className="h-1.5 w-full bg-white/20 rounded-full mt-4 overflow-hidden shadow-inner">
                          <div className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", result.data?.skor_sustainability >= 90 ? "bg-emerald-300 shadow-emerald-200" : result.data?.skor_sustainability >= 70 ? "bg-cyan-300" : "bg-rose-400")} style={{ width: `${result.data?.skor_sustainability || 0}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Unified Data Component */}
                    <VibeResultCard data={result.data} />
                    
                    <div className="mt-10">
                       <h3 className="text-xl font-light italic text-cyan-900 mb-6 flex items-center gap-3"><Store className="w-6 h-6 text-emerald-600" /> Toko Aquarium Terdekat</h3>
                       <StoreLocator height="300px" />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
      </div>
      <Footer />
    </div>
  );
}

function AboutComponent() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="backdrop-blur-md bg-white/70 p-8 md:p-12 rounded-3xl border border-stone-200 shadow-sm">
          <h2 className="text-4xl font-light italic text-cyan-800 mb-6 flex items-center gap-3">
            <Info className="w-8 h-8 text-emerald-600" />
            Tentang VibeAquaria
          </h2>
          <div className="space-y-8 text-base font-sans text-slate-700 leading-relaxed">
            <p className="text-lg italic font-medium text-cyan-700">
              &quot;VibeAquaria lahir dari keresahan terhadap tingginya angka kematian fauna air akibat trial-and-error (coba-coba) yang tidak perlu.&quot;
            </p>
            <p>
              Di dunia Aquascape, sebuah akuarium bukan sekadar pajangan, melainkan ekosistem rapuh yang saling bergantung. VibeAquaria hadir sebagai asisten digital pintar yang membantumu merawat ekosistem mini tersebut dengan bahasa yang super gampang dimengerti, layaknya curhat dengan teman sesama hobiis.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white/60 p-6 rounded-2xl border border-cyan-100 shadow-sm">
                <h3 className="font-bold text-cyan-800 mb-3 flex items-center gap-2">
                  <Leaf className="w-5 h-5" /> Untuk Scaper Pemula
                </h3>
                <p className="text-sm">
                  <strong>Pernah Mengalami Ini?</strong> Beli banyak ikan lucu di toko, lalu digabung di akuarium, tapi keesokan harinya banyak yang mati. Atau tanaman tiba-tiba layu karena kurang cahaya. 
                  <br/><br/>
                  <strong>Solusi VibeAquaria:</strong> Cek nama ikan sebelum membeli! Biar tahu mana ikan yang suka gigit, mana udang yang bisa hidup damai bareng ikan lain, dan suhu mana yang bikin mereka betah.
                </p>
              </div>
              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <Droplets className="w-5 h-5" /> Untuk Scaper Senior
                </h3>
                <p className="text-sm">
                  <strong>Buku Saku Cepat:</strong> Saat ingin eksplor flora/fauna baru untuk di-mix di tank kompetisi (seperti Dutch style atau Iwagumi), gunakan ensiklopedia dan fitur kecocokan VibeAquaria sebagai <i>cross-check</i> cepat parameter suhu, pH, dan behavior tanpa harus pusing membuka banyak forum.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-stone-200 flex flex-col md:flex-row items-center gap-6 justify-between text-sm">
              <div>
                <p className="font-bold text-slate-800 mb-1">Misi Kelestarian Air (Zero Fish Fatality)</p>
                <p className="text-slate-500">Dikembangkan dari project #JuaraVibeCoding</p>
              </div>
              <div className="text-right text-xs md:text-sm font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                Lestarikan Alam, Dimulai dari Akuariummu
              </div>
            </div>
          </div>
       </div>
       <TechStackSection />
    </div>
  )
}

function HomeComponent({ setActiveTab, savedNotes }: { setActiveTab: (tab: TabType) => void, savedNotes: any[] }) {
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [trendingSpecies, setTrendingSpecies] = useState<any[]>([]);

  useEffect(() => {
    if (encyclopediaData && encyclopediaData.length > 0) {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * encyclopediaData.length);
        setDailyTip(encyclopediaData[randomIndex]);
        
        const trending = encyclopediaData.filter(s => ['Molly Black', 'Neon Tetra', 'Red Cherry Shrimp'].includes(s.title));
        setTrendingSpecies(trending.length > 0 ? trending : encyclopediaData.slice(0, 3));
      }, 0);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Hero */}
      <section className="text-center pt-8 md:pt-16 pb-8 relative">
        <div className="flex justify-center mb-6">
           <div className="w-24 h-24 bg-white/40 border border-white/60 shadow-xl rounded-full flex items-center justify-center animate-float backdrop-blur-md">
             <span className="text-5xl">🐠</span>
           </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-light italic text-cyan-900 mb-6 tracking-tight">
          Harmoni dalam <span className="font-bold text-emerald-600">Satu Ekosistem</span>
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto font-sans text-lg md:text-xl leading-relaxed mb-10">
          Rawat akuarium dengan panduan AI yang pintar, ramah, dan pro-kelestarian alam.
        </p>

        {/* Impact Bar */}
        <div className="flex flex-wrap justify-center divide-x divide-cyan-200 border-y border-cyan-100 py-4 max-w-3xl mx-auto font-sans mb-8 bg-white/30 backdrop-blur-sm rounded-2xl md:rounded-full">
          <div className="px-4 md:px-8 flex flex-col items-center">
            <span className="text-2xl font-bold text-cyan-700">100+</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Spesies Terdata</span>
          </div>
          <div className="px-4 md:px-8 flex flex-col items-center">
            <span className="text-2xl font-bold text-emerald-600"><Leaf className="w-6 h-6 inline" /></span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Eco-Friendly Guide</span>
          </div>
          <div className="px-4 md:px-8 flex flex-col items-center">
            <span className="text-2xl font-bold text-cyan-800">AI</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Powered by Gemini</span>
          </div>
        </div>
      </section>

      {/* Grid Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <div 
          onClick={() => setActiveTab('snap')} 
          className="cursor-pointer group bg-gradient-to-br from-cyan-600 to-cyan-800 text-white p-8 rounded-[2rem] overflow-hidden relative shadow-[0_10px_30px_rgb(8,145,178,0.2)] border border-cyan-500 hover:shadow-[0_15px_40px_rgb(8,145,178,0.4)] transition-all transform hover:-translate-y-1"
        >
           <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
           <div className="absolute left-0 bottom-0 w-32 h-32 bg-cyan-900/30 rounded-full blur-xl -ml-10 -mb-10 group-hover:scale-125 transition-transform duration-700"></div>
           <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:bg-white/30 transition-all">
             📸
           </div>
           <h3 className="relative z-10 text-2xl font-bold mb-2">Snap & Care</h3>
           <p className="relative z-10 text-sm font-sans text-cyan-50 leading-relaxed opacity-95">Identifikasi instan dengan teknologi AI. Ketahui jenis ikan dan tanaman, serta dapatkan panduan perawatan langsung untuk ekosistemmu.</p>
           
           <div className="relative z-10 mt-6 inline-flex items-center text-xs font-bold uppercase tracking-widest text-cyan-200 group-hover:text-white transition-colors">
             Coba Sekarang &rarr;
           </div>
        </div>

        <div 
          onClick={() => setActiveTab('builder')} 
          className="cursor-pointer group bg-white/60 backdrop-blur-md p-8 rounded-[2rem] overflow-hidden relative shadow-[0_10px_30px_rgb(8,145,178,0.05)] border border-cyan-100 hover:border-emerald-300 hover:shadow-[0_10px_30px_rgb(8,145,178,0.15)] transition-all"
        >
           <div className="text-4xl mb-6 group-hover:scale-110 transition-transform bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600">
             🌿
           </div>
           <h3 className="text-xl font-bold text-cyan-900 mb-2">Tema Builder</h3>
           <p className="text-sm font-sans text-slate-600 leading-relaxed">Konsultasi tema aquascape. Mau Iwagumi atau Dutch style? Dapatkan resepnya.</p>
        </div>

        <div 
          onClick={() => setActiveTab('compatibility')} 
          className="cursor-pointer group bg-white/60 backdrop-blur-md p-8 rounded-[2rem] overflow-hidden relative shadow-[0_10px_30px_rgb(8,145,178,0.05)] border border-cyan-100 hover:border-rose-300 hover:shadow-[0_10px_30px_rgb(8,145,178,0.15)] transition-all"
        >
           <div className="text-4xl mb-6 group-hover:scale-110 transition-transform bg-rose-50 w-16 h-16 rounded-2xl flex items-center justify-center text-rose-500">
             ⚔️
           </div>
           <h3 className="text-xl font-bold text-cyan-900 mb-2">Kecocokan</h3>
           <p className="text-sm font-sans text-slate-600 leading-relaxed">Cek apakah ikanmu bakal rukun atau malah berantem. Hindari salah campur!</p>
        </div>
      </section>

      {/* Daily Tip */}
      {dailyTip && (
        <section className="bg-gradient-to-r from-[#0891B2] to-[#155E75] rounded-[2rem] p-8 md:p-10 relative overflow-hidden text-white shadow-[0_10px_40px_rgb(8,145,178,0.2)] mx-2">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
             <div className="w-24 h-24 bg-white/10 border border-white/20 rounded-[2rem] flex items-center justify-center text-5xl shrink-0 backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform">
               {dailyTip.img || "💡"}
             </div>
             <div>
               <h3 className="text-xs font-bold uppercase tracking-widest text-[#67E8F9] mb-3 flex items-center gap-2">
                 <Info className="w-4 h-4" /> Tips Hari Ini
               </h3>
               <p className="text-2xl font-light italic mb-3">&quot;{dailyTip.title}&quot;</p>
               <p className="text-[#ECFEFF] font-sans text-sm md:text-base opacity-90 leading-relaxed">{dailyTip.p}</p>
             </div>
           </div>
        </section>
      )}

      {/* Trending Species */}
      {trendingSpecies.length > 0 && (
        <section className="px-2">
          <div className="flex justify-between items-end mb-8">
             <div>
               <h2 className="text-3xl font-light italic text-[#155E75] mb-2">Trending Minggu Ini</h2>
               <p className="text-sm font-sans text-slate-500">Paling banyak dicari oleh komunitas scaper</p>
             </div>
             <button onClick={() => setActiveTab('ensiklopedia')} className="text-xs font-bold font-sans text-[#0891B2] hover:text-[#155E75] uppercase tracking-widest transition-colors mb-1 hidden md:block">Lihat Semua &rarr;</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {trendingSpecies.map((s, i) => (
                <div 
                  key={s.id}
                  className="bg-white/70 backdrop-blur-md border border-cyan-100 p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(8,145,178,0.03)] hover:shadow-[0_10px_30px_rgb(8,145,178,0.08)] transition-all flex items-start gap-5 cursor-pointer"
                  onClick={() => setActiveTab('ensiklopedia')}
                >
                   <div className="w-16 h-16 bg-[#F0F9FF] border border-cyan-100 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-inner">
                     {s.img}
                   </div>
                   <div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#059669] mb-1 block">{s.category}</span>
                     <h3 className="text-lg font-bold text-[#155E75] leading-tight mb-2">{s.title}</h3>
                     <p className="text-xs font-sans text-slate-500 line-clamp-2 leading-relaxed">{s.p}</p>
                   </div>
                </div>
             ))}
          </div>
        </section>
      )}

      {/* Eco-Care Routine To-Do List */}
      <EcoCareRoutineComponent />

      {/* Explore Section */}
      <div className="backdrop-blur-md bg-white/70 rounded-[2rem] border border-cyan-100 p-8 md:p-12 shadow-[0_10px_30px_rgb(8,145,178,0.05)] mx-2">
        <h3 className="text-3xl font-light italic text-[#155E75] mb-4 flex items-center gap-3"><Map className="w-8 h-8 text-[#0891B2]"/> Eksplorasi Sekitar</h3>
        <p className="text-slate-600 font-sans mb-8 text-lg">Temukan toko perlengkapan aquascape dan ikan hias terdekat di daerah Anda.</p>
        <StoreLocator height="400px" />
      </div>

      {/* Testimonial */}
      <section className="py-16 px-4 mb-8">
         <div className="max-w-4xl mx-auto relative">
           <div className="absolute -left-4 -top-8 text-cyan-200 opacity-50 z-0">
             <Quote className="w-24 h-24" />
           </div>
           <div className="bg-white/70 backdrop-blur-sm p-10 md:p-14 rounded-[3rem] border border-cyan-100 shadow-[0_10px_40px_rgb(8,145,178,0.08)] relative z-10 text-center flex flex-col items-center">
             <img src="https://ui-avatars.com/api/?name=Budi+Scaper&background=0284c7&color=fff" alt="User" className="w-20 h-20 rounded-full border-4 border-white shadow-md mb-6 object-cover" />
             <h2 className="text-xl md:text-3xl font-light italic text-[#155E75] leading-relaxed mb-8">
               &quot;Sejak pakai VibeAquaria, saya jadi tahu kalau Neon Tetra dan Cupang nggak boleh gabung. Ikan saya sehat, dan saya nggak perlu tebak-tebak lagi soal perawatannya.&quot;
             </h2>
             <div className="flex flex-col items-center">
               <div className="flex text-amber-400 mb-2">
                 {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
               </div>
               <p className="font-bold text-cyan-900 text-lg">Budi Scaper</p>
               <p className="text-slate-500 font-sans text-sm">Penghobi Aquascape Pemula</p>
             </div>
           </div>
         </div>
      </section>
    </div>
  );
}

function CatatanComponent({ savedNotes, onDelete }: { savedNotes: any[], onDelete: (id: string | number) => void }) {
  const [filter, setFilter] = useState<string>('all');

  const filteredNotes = savedNotes.filter(note => {
    if (filter === 'all') return true;
    return note.category === filter;
  });

  const shareNote = async (note: any) => {
    const text = `VibeAquaria Update 🐠\n\n${note.title}\nStatus: ${note.indikator}\nSustain Score: ${note.skor_sustainability}\n\n"${note.analogi_awam || note.summary}"\n\n#VibeAquaria #JuaraVibeCoding #Aquascape`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VibeAquaria Update',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Teks berhasil disalin ke clipboard!');
    }
  };

  if (savedNotes.length === 0) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <BookOpen className="w-10 h-10 text-stone-300" />
        </div>
        <h3 className="text-2xl font-light italic text-cyan-800 mb-3">Buku Catatan Digital Kosong</h3>
        <p className="max-w-sm text-sm font-sans opacity-80 leading-relaxed">Gunakan fitur VibeAquaria dan simpan hasilnya di sini untuk Anda lihat kembali kapan saja.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-full">
            <BookOpen className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-3xl font-light italic text-cyan-800">Catatan Digital Personal</h2>
            <p className="font-sans text-sm text-slate-500">Timeline ekosistem air Anda (Total: {savedNotes.length} catatan)</p>
          </div>
        </div>

        <select 
          className="bg-white border border-stone-200 rounded-full px-4 py-2 text-sm font-sans text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 shadow-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Semua Kategori</option>
          <option value="snap_care">Snap & Care</option>
          <option value="builder">Builder</option>
          <option value="compatibility">Kecocokan</option>
        </select>
      </div>

      <div className="relative border-l-2 border-stone-200 ml-4 md:ml-8 space-y-8 pb-8">
        {filteredNotes.length === 0 ? (
          <p className="text-slate-400 pl-8 italic">Tidak ada catatan untuk kategori ini.</p>
        ) : (
          filteredNotes.map((note) => (
            <div key={note.id} className="relative pl-8 md:pl-12">
              {/* Timeline dot */}
              <div className="absolute w-4 h-4 bg-emerald-500 rounded-full -left-[9px] top-6 border-4 border-slate-50 shadow-sm z-10"></div>
              
              <div className="backdrop-blur-md bg-white/70 p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col hover:border-emerald-300 hover:shadow-md transition-all group">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] py-1.5 px-4 bg-emerald-50 rounded-full uppercase tracking-widest font-sans font-bold text-emerald-700">
                      {note.category === 'snap_care' ? 'Snap & Care' : note.category === 'builder' ? 'Builder' : 'Compatibility'}
                    </span>
                    <span className="text-xs font-sans text-slate-400 bg-stone-100 px-3 py-1 rounded-md">{note.date}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => shareNote(note)}
                      className="text-stone-400 hover:text-cyan-600 hover:bg-cyan-50 p-2 rounded-full transition-colors flex items-center justify-center"
                      title="Bagikan"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(note.id)}
                      className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-colors flex items-center justify-center"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-2xl font-light italic text-cyan-900 mb-2 group-hover:text-cyan-700 transition-colors">{note.title}</h3>
                <p className="text-sm font-sans text-slate-600 mb-6 flex-1 italic border-l-2 border-stone-200 pl-4 py-1">
                   &quot;{note.analogi_awam || note.summary}&quot;
                </p>
                
                <div className="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center bg-stone-50/50 -mx-6 md:-mx-8 px-6 md:px-8 pb-2 -mb-2 md:-mb-4 pt-4 rounded-b-[32px]">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-700">Sustainability Score</span>
                     <span className={cn("text-sm font-bold ml-1 flex items-center justify-center w-8 h-8 rounded-full shadow-sm text-white", note.skor_sustainability >= 90 ? "bg-emerald-500 shadow-emerald-400/50" : note.skor_sustainability >= 70 ? "bg-cyan-500" : "bg-rose-500")}>{note.skor_sustainability || '-'}</span>
                  </div>
                  <span className="text-3xl filter drop-shadow-md">{note.indikator}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function VibeResultCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <SectionCard title="Analogi Awam (Gampang Banget!)">
          <p className="text-xl font-light text-cyan-900 mb-4 leading-relaxed italic border-l-4 border-emerald-500 pl-5">{data.analogi_awam}</p>
        </SectionCard>
      </div>

      <div className="md:col-span-1">
        <SectionCard title="Spesifikasi Air & Tingkat Kesulitan">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <span className="text-sm text-slate-500 italic">Suhu</span>
              <span className="text-sm font-sans font-bold text-cyan-900">{data.spek_air?.suhu}</span>
            </div>
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <span className="text-sm text-slate-500 italic">pH</span>
              <span className="text-sm font-sans font-bold text-cyan-900">{data.spek_air?.ph}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 italic">Level</span>
              <span className="text-sm font-sans font-bold text-cyan-900">{data.spek_air?.level}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="md:col-span-1">
        <SectionCard title="Pesan Penting">
           <div className="flex items-start gap-4">
            <Info className="w-6 h-6 shrink-0 mt-1 opacity-80 text-emerald-600" />
            <p className="text-sm font-sans leading-relaxed text-slate-700 italic">{data.pesan_catatan}</p>
          </div>
        </SectionCard>
      </div>

      <div className="md:col-span-2">
        <SectionCard title="Tips Praktis & Langkah Simpel" dark>
          <ul className="space-y-3">
            {data.tips_praktis?.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-emerald-400 shadow-sm" />
                <span className="text-sm opacity-90 leading-relaxed font-sans">{tip}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({ title, children, dark = false }: { title: string, children: React.ReactNode, dark?: boolean }) {
  if (dark) {
    return (
      <div className="p-8 bg-cyan-800 rounded-3xl text-white relative overflow-hidden shadow-lg border border-cyan-700">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 mix-blend-overlay"></div>
        <div className="z-10 relative">
          <h3 className="text-2xl font-light italic mb-6 leading-tight flex items-center gap-3">
             {title}
          </h3>
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className="backdrop-blur-md bg-white/70 p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm h-full hover:border-emerald-200 transition-colors">
      <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
         {title}
      </p>
      {children}
    </div>
  )
}

function EncyclopediaComponent() {
  const [filter, setFilter] = useState('Semua');
  const [familyFilter, setFamilyFilter] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, familyFilter, searchTerm]);

  const filteredSpecies = encyclopediaData.filter(s => {
    let matchCat = true;
    if (filter === 'Aquascape Friendly') {
      matchCat = s.p.includes('Aquascape Friendly');
    } else if (filter !== 'Semua') {
      matchCat = s.category === filter;
    }
    
    let matchFamily = true;
    if (familyFilter !== 'Semua') {
      matchFamily = s.family === familyFilter;
    }
    
    let matchSearch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      matchSearch = s.title.toLowerCase().includes(term) || s.p.toLowerCase().includes(term);
    }
    
    return matchCat && matchFamily && matchSearch;
  });

  const families = ['Semua', ...Array.from(new Set(encyclopediaData.map(s => s.family)))].sort();
  
  const totalPages = Math.ceil(filteredSpecies.length / itemsPerPage);
  const currentSpecies = filteredSpecies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="backdrop-blur-md bg-white/70 p-8 md:p-12 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-3xl md:text-4xl font-light italic text-cyan-800 flex items-center gap-3">
               <BookOpen className="w-8 h-8 text-emerald-600" />
               Ensiklopedia VibeAquaria
            </h2>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-full">
                Total Data: {encyclopediaData.length} Spesies
              </span>
            </div>
          </div>
          
          <p className="text-slate-600 font-sans mb-8 leading-relaxed max-w-2xl">
            Jelajahi berbagai spesies untuk aquascape Anda. Gunakan fitur pencarian atau filter untuk menemukan kecocokan yang tepat.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-8 bg-sky-50/50 p-4 md:p-6 rounded-2xl border border-cyan-100">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-cyan-600" />
              </div>
              <input 
                type="text" 
                placeholder="Cari ikan (misal: CPD, Neon, Molly)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/80"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <select 
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/80 text-slate-700 font-sans cursor-pointer whitespace-nowrap min-w-[150px]"
              >
                {families.map(f => <option key={f} value={f}>{f === 'Semua' ? 'Family (Semua)' : f}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {['Semua', 'Ikan', 'Tanaman', 'Udang', 'Siput', 'Aquascape Friendly'].map(cate => (
              <button 
                key={cate}
                onClick={() => setFilter(cate)}
                className={cn(
                  "px-6 py-2 rounded-full font-sans text-xs font-bold uppercase tracking-widest transition-all mb-2",
                  filter === cate 
                    ? (cate === 'Aquascape Friendly' ? "bg-emerald-600 text-white shadow-md border-emerald-600" : "bg-cyan-900 text-white shadow-md border-cyan-900") 
                    : (cate === 'Aquascape Friendly' ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-white border border-stone-200 text-slate-500 hover:bg-stone-50")
                )}
              >
                {cate === 'Aquascape Friendly' ? '🌿 Aquascape Friendly' : cate}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-sans text-slate-500 font-medium">Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSpecies.length)} - {Math.min(currentPage * itemsPerPage, filteredSpecies.length)} dari {filteredSpecies.length} data</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {currentSpecies.map((s) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={s.id} 
                  className="bg-white border border-stone-200 p-6 rounded-3xl hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                   <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                     {s.img}
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{s.category} • {s.family}</span>
                   <h3 className="text-xl font-light italic text-cyan-900 mb-2">{s.title}</h3>
                   <p className="text-sm font-sans text-slate-600 leading-relaxed">{s.p}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 mb-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50 disabled:opacity-50 disabled:hover:bg-white transition-all font-sans text-sm font-bold disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              
              <div className="flex gap-1 overflow-x-auto max-w-full px-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Only show current, first, last, and next/prev to avoid too many buttons
                  if (page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-10 h-10 rounded-xl font-sans text-sm font-bold transition-all flex items-center justify-center",
                          currentPage === page 
                            ? "bg-cyan-700 text-white shadow-md" 
                            : "bg-white border border-cyan-100 text-cyan-700 hover:bg-cyan-50"
                        )}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (Math.abs(currentPage - page) === 2) {
                    return <span key={page} className="px-2 py-2 text-cyan-700/50">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50 disabled:opacity-50 disabled:hover:bg-white transition-all font-sans text-sm font-bold disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          )}
       </div>
    </div>
  )
}

function CompatibilityComponent() {
  const [species1, setSpecies1] = useState(encyclopediaData[0].title);
  const [species2, setSpecies2] = useState(encyclopediaData[40].title);
  const [result, setResult] = useState<{status: 'aman' | 'waspada' | 'bahaya', msg: string} | null>(null);

  const checkCompatibility = () => {
    // Simple mock logic for compatibility checker
    const s1 = species1.toLowerCase();
    const s2 = species2.toLowerCase();

    // Check specific constraint asked by user: Molly and Cupang
    if ((s1.includes('molly') && s2.includes('cupang')) || (s2.includes('molly') && s1.includes('cupang'))) {
      setResult({
        status: 'bahaya',
        msg: 'Wah, kurang cocok! Cupang Jantan bisa agresif ke ekor Molly yang cantik. Coba ganti dengan Neon Tetra!'
      });
      return;
    }

    if ((s1.includes('udang') && s2.includes('cichlid')) || (s2.includes('udang') && s1.includes('cichlid'))) {
      setResult({
        status: 'bahaya',
        msg: 'Bahaya! Cichlid ukuran sedang/besar sangat suka memangsa udang hias. Udangmu akan jadi camilan mahal!'
      });
      return;
    }

    if ((s1.includes('neon') && s2.includes('udang')) || (s2.includes('neon') && s1.includes('udang'))) {
      setResult({
        status: 'aman',
        msg: 'Aman dan Damai! Udang membersihkan lantai, Neon Tetra menghiasi tengah air. Sangat cocok!'
      });
      return;
    }

    // Default static fallback behavior to mock the result:
    setResult({
      status: 'waspada',
      msg: 'Kombinasi ini butuh perhatian ekstra. Pastikan akuarium memiliki banyak tempat sembunyi seperti tanaman lebat atau kayu untuk mengurangi stres.'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="backdrop-blur-md bg-white/70 p-8 md:p-12 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>
          
          <h2 className="text-4xl font-light italic text-cyan-800 mb-4 flex items-center gap-3 relative z-10">
             <Activity className="w-8 h-8 text-emerald-600" />
             Kalkulator Kecocokan
          </h2>
          <p className="text-slate-600 font-sans mb-10 leading-relaxed max-w-2xl relative z-10">
            Periksa apakah dua spesies aman jika digabungkan dalam satu akuarium. Langkah kecil untuk #ZeroFishFatality.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-8 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Kandidat Penghuni 1</label>
              <select 
                value={species1} 
                onChange={e => setSpecies1(e.target.value)}
                className="w-full bg-white border border-stone-200 p-4 rounded-2xl text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {encyclopediaData.map(s => (
                  <option key={s.id} value={s.title}>{s.title} ({s.category})</option>
                ))}
                <option value="Cupang Jantan">Cupang Jantan (Ikan Hias)</option>
              </select>
            </div>

            <div className="flex justify-center mt-6 md:mt-0">
               <div className="w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center border border-cyan-100 text-cyan-700 font-bold">
                 VS
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Kandidat Penghuni 2</label>
              <select 
                value={species2} 
                onChange={e => setSpecies2(e.target.value)}
                className="w-full bg-white border border-stone-200 p-4 rounded-2xl text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {encyclopediaData.map(s => (
                  <option key={s.id} value={s.title}>{s.title} ({s.category})</option>
                ))}
                <option value="Cupang Jantan">Cupang Jantan (Ikan Hias)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={checkCompatibility}
            className="w-full bg-cyan-900 text-white font-sans text-sm font-bold tracking-widest py-4 px-6 rounded-2xl hover:bg-cyan-800 hover:shadow-lg transition-all relative z-10"
          >
            CEK KECOCOKAN
          </button>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-8 p-6 md:p-8 rounded-3xl border flex items-start gap-5",
                result.status === 'aman' ? "bg-emerald-50 border-emerald-200" :
                result.status === 'bahaya' ? "bg-rose-50 border-rose-200" :
                "bg-amber-50 border-amber-200"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xl",
                result.status === 'aman' ? "bg-emerald-500" :
                result.status === 'bahaya' ? "bg-rose-500" :
                "bg-amber-500"
              )}>
                {result.status === 'aman' ? '🟢' : result.status === 'bahaya' ? '🔴' : '🟡'}
              </div>
              <div>
                <h3 className={cn(
                  "text-lg font-bold font-sans mb-2",
                  result.status === 'aman' ? "text-emerald-900" :
                  result.status === 'bahaya' ? "text-rose-900" :
                  "text-amber-900"
                )}>
                  {result.status === 'aman' ? "Seharusnya Aman!" : 
                   result.status === 'bahaya' ? "Awas, Berbahaya!" : 
                   "Butuh Perhatian Khusus"}
                </h3>
                <p className={cn(
                  "font-sans leading-relaxed text-sm md:text-base",
                  result.status === 'aman' ? "text-emerald-800" :
                  result.status === 'bahaya' ? "text-rose-800" :
                  "text-amber-800"
                )}>
                  {result.msg}
                </p>
              </div>
            </motion.div>
          )}
       </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-cyan-100 bg-white/50 backdrop-blur-md pt-12 pb-24 md:pb-12 text-center text-sans relative z-10 font-sans">
       <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
         <div className="flex items-center gap-2 mb-6">
            <Droplets className="w-6 h-6 text-cyan-600" />
            <span className="text-xl font-bold tracking-tight text-cyan-800">VibeAquaria</span>
         </div>
         <p className="text-slate-500 text-sm mb-8">
           © 2026 VibeAquaria | Dibangun oleh <span className="font-bold text-cyan-700">Muhammad Dzurunnafis Khairuddin</span> · #JuaraVibeCoding
         </p>
         
         <div className="flex flex-wrap justify-center gap-6 mb-8 text-slate-400">
            <div className="flex items-center gap-1.5 hover:text-cyan-600 transition-colors cursor-default" title="Next.js">
               {/* icon replacement */}
               <span className="font-bold text-xs uppercase tracking-widest">Next.js</span>
            </div>
            <div className="flex items-center gap-1.5 hover:text-cyan-600 transition-colors cursor-default" title="Tailwind CSS">
               <span className="font-bold text-xs uppercase tracking-widest">Tailwind</span>
            </div>
            <div className="flex items-center gap-1.5 hover:text-cyan-600 transition-colors cursor-default" title="Google Cloud Run">
               <span className="font-bold text-xs uppercase tracking-widest">Cloud Run</span>
            </div>
            <div className="flex items-center gap-1.5 hover:text-cyan-600 transition-colors cursor-default" title="Gemini AI">
               <span className="font-bold text-xs uppercase tracking-widest">Gemini AI</span>
            </div>
         </div>

         <div className="flex items-center gap-4 text-slate-400">
            <a href="https://tokita.nlfts.dev/" target="_blank" rel="noopener noreferrer" className="p-2 bg-sky-50 rounded-full hover:bg-cyan-100 hover:text-cyan-700 transition-colors" title="Portfolio">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/muhammad-dzurunnafis-khairuddin" target="_blank" rel="noopener noreferrer" className="p-2 bg-sky-50 rounded-full hover:bg-cyan-100 hover:text-cyan-700 transition-colors" title="LinkedIn">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
         </div>
       </div>
    </footer>
  )
}

function TechStackSection() {
  const stacks = [
    { name: "Next.js", desc: "(App Router)", icon: <Layers className="w-6 h-6" />, type: "Frontend" },
    { name: "Tailwind & Framer", desc: "Styling", icon: <Code className="w-6 h-6" />, type: "Styling" },
    { name: "Gemini 1.5 Flash API", desc: "Intelligence", icon: <Cpu className="w-6 h-6" />, type: "Intelligence" },
    { name: "Firebase & Cloud Run", desc: "(Dockerized)", icon: <Cloud className="w-6 h-6" />, type: "Backend" },
  ];

  return (
    <div className="mt-12 w-full max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-center text-cyan-900 mb-8 flex items-center justify-center gap-2">
         Behind the Scenes
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stacks.map((stack, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center text-center p-6 bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl rounded-3xl"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 mb-3 bg-emerald-100/50 px-2 py-1 rounded-md">
              Powered By
            </div>
            <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-700 mb-4 shadow-sm border border-cyan-100">
              {stack.icon}
            </div>
            <h4 className="font-bold text-slate-800 mb-1">{stack.type}</h4>
            <div className="text-sm font-medium text-emerald-700">{stack.name}</div>
            <div className="text-xs text-slate-500 mt-1">{stack.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EcoCareRoutineComponent() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'ecoCareNotes'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(tasksData);
      });
      return () => unsubscribe();
    } else {
      setTasks([]);
    }
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
    try {
      await addDoc(collection(db, 'ecoCareNotes'), {
        userId: user.uid,
        title: newTaskTitle.trim() || 'Rutinitas Perawatan',
        text: newTaskText,
        isCompleted: false,
        createdAt: serverTimestamp()
      });
      setNewTaskText("");
      setNewTaskTitle("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      const taskRef = doc(db, 'ecoCareNotes', id);
      await updateDoc(taskRef, {
        isCompleted: !currentStatus
      });
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'ecoCareNotes', id));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  return (
    <div className="w-full mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="text-3xl font-light italic text-[#155E75] mb-6 flex items-center gap-3">
        <CheckSquare className="w-8 h-8 text-[#0891B2]" /> Eco-Care Routine
      </h3>
      
      {!user ? (
        <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-12 border-2 border-dashed border-cyan-800/30 bg-white/20 backdrop-blur-lg shadow-[0_10px_30px_rgb(8,145,178,0.05)] text-center group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/5 to-[#06B6D4]/5 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/50 flex items-center justify-center text-[#155E75] mb-2 shadow-inner border border-white/40">
              <Lock className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-slate-800 italic">Routine Locked</h4>
            <p className="text-slate-600 max-w-md mx-auto font-sans leading-relaxed text-lg">
              Login to access your personalized Eco-Care To-Do List and keep track of your aquarium as health.
            </p>
            <button
              onClick={signInWithGoogle}
              className="mt-6 bg-[#059669] text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-[#047857] hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              Sign In to Unlock
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Judul Rutinitas (opsional)"
                  className="w-full md:w-1/3 bg-white/50 backdrop-blur-md border border-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl md:rounded-l-full md:rounded-r-xl px-6 py-4 text-slate-700 shadow-sm text-lg"
                />
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Tambahkan deskripsi rutinitas perawatan (mis. Ganti Air 20%)..."
                  className="w-full bg-white/50 backdrop-blur-md border border-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl md:rounded-r-full md:rounded-l-xl px-6 py-4 text-slate-700 shadow-sm pr-12 text-lg"
                />
              </div>
              <RippleButton
                type="submit"
                disabled={!newTaskText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full font-bold shadow-md transition-all active:scale-95 flex-shrink-0 text-lg w-full md:w-auto"
              >
                Tambah
              </RippleButton>
            </div>
            
            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2 px-2">
               <button 
                 type="button" 
                 onClick={() => setNewTaskText('🌿 Trimming Tanaman')} 
                 className="bg-white/60 hover:bg-white/90 text-slate-600 px-4 py-2 rounded-full text-sm font-medium border border-cyan-100 transition-colors shadow-sm active:scale-95"
               >
                 🌿 Trimming Tanaman
               </button>
               <button 
                 type="button" 
                 onClick={() => setNewTaskText('💧 Ganti Air 20%')} 
                 className="bg-white/60 hover:bg-white/90 text-slate-600 px-4 py-2 rounded-full text-sm font-medium border border-cyan-100 transition-colors shadow-sm active:scale-95"
               >
                 💧 Ganti Air 20%
               </button>
               <button 
                 type="button" 
                 onClick={() => setNewTaskText('🍖 Kasih Makan ikan')} 
                 className="bg-white/60 hover:bg-white/90 text-slate-600 px-4 py-2 rounded-full text-sm font-medium border border-cyan-100 transition-colors shadow-sm active:scale-95"
               >
                 🍖 Kasih Makan ikan
               </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    toggleTask(task.id, task.isCompleted);
                    if (!task.isCompleted) playBlupSound();
                  }}
                  className={cn(
                    "flex flex-col justify-between p-6 rounded-3xl cursor-pointer transition-all min-h-[160px]",
                    "bg-white/30 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(8,145,178,0.06)] hover:shadow-[0_10px_30px_rgb(8,145,178,0.12)] hover:-translate-y-1",
                    task.isCompleted && "opacity-60 bg-emerald-50/40 border-emerald-100/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className={cn(
                      "flex-shrink-0 transition-colors mt-0.5",
                      task.isCompleted ? "text-[#10B981]" : "text-[#0891B2]"
                    )}>
                      {task.isCompleted ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                    </div>
                    <button
                      onClick={(e) => deleteTask(e, task.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Hapus Tugas"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col pt-1">
                    <h1 className={cn(
                      "text-xl font-bold font-sans leading-tight mb-2",
                      task.isCompleted ? "text-slate-500 line-through" : "text-cyan-900"
                    )}>
                      {task.title || 'Rutinitas Perawatan'}
                    </h1>
                    <p className={cn(
                      "text-sm font-sans leading-relaxed text-slate-600",
                      task.isCompleted && "line-through opacity-70"
                    )}>
                      {task.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
               <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 mb-4 bg-white/40 border border-white/60 shadow-lg rounded-full flex items-center justify-center animate-bounce backdrop-blur-md">
                   <span className="text-4xl text-cyan-500">🐠</span>
                 </div>
                 <p className="text-slate-600 text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">
                   Belum ada rutinitas? Tambahkan catatan pertamamu untuk menjaga ekosistemmu tetap sehat!
                 </p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
