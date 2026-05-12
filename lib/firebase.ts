import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { useState, useEffect } from 'react';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.log('Login popup closed by user.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      alert('Browser memblokir popup login. Mohon izinkan popup untuk situs ini agar bisa login.');
      return null;
    }
    if (error?.code === 'auth/cancelled-popup-request') {
      console.log('Multiple popup requests cancelled.');
      return null;
    }
    if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
       console.log('Known firebase iframe popup issue. Please open app in a new tab.');
       alert('Kami mendeteksi kendala pada login. Mohon buka aplikasi ini di tab baru (open in new tab) untuk melakukan login.');
       return null;
    }
    console.error('Error signing in with Google', error);
    alert(`Gagal login. Jika Anda berada di dalam iframe (AI Studio), cobalah buka di tab baru.`);
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
