import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { useState, useEffect } from 'react';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

let isSigningIn = false;

export const signInWithGoogle = async () => {
  if (isSigningIn) return null;
  isSigningIn = true;
  
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    isSigningIn = false;
    return result.user;
  } catch (error: any) {
    isSigningIn = false;
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    if (errorCode === 'auth/popup-closed-by-user') {
      console.log('Login popup closed by user.');
      return null;
    }
    if (errorCode === 'auth/popup-blocked') {
      alert('Browser memblokir popup login. Mohon izinkan popup untuk situs ini agar bisa login.');
      return null;
    }
    if (errorCode === 'auth/cancelled-popup-request') {
      console.log('Multiple popup requests cancelled.');
      return null;
    }
    if (errorMessage.includes('INTERNAL ASSERTION FAILED') || errorCode === 'auth/network-request-failed') {
       console.log('Known firebase iframe issue detected:', errorMessage);
       alert('⚠️ Waduh Scaper, ada kendala koneksi/iframe!\n\nMohon klik tombol "Open in new tab" (ikon kotak panah di pojok kanan atas) untuk membuka aplikasi ini di tab baru agar login bisa berjalan lancar.');
       return null;
    }
    
    console.error('Error signing in with Google', error);
    alert(`Gagal login. Jika Anda di dalam AI Studio, coba buka di tab baru (Ikon di pojok kanan atas).`);
    return null;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
};
