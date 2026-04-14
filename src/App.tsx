import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Home from './pages/Home';
import NewScan from './pages/NewScan';
import ScanDetail from './pages/ScanDetail';
import Profile from './pages/Profile';
import Communications from './pages/Communications';
import Forum from './pages/Forum';
import SymptomTracker from './pages/SymptomTracker';
import Layout from './components/Layout';
import Auth from './pages/Auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 92) {
          return prev;
        }
        const next = prev + Math.max(1, (95 - prev) * 0.08);
        return Math.min(92, next);
      });
    }, 180);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
        
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          // For testing: set admin as doctor
          if (user.email === 'flyingpig071@gmail.com' && data.role !== 'doctor') {
            const updatedProfile = { ...data, role: 'doctor' };
            await setDoc(docRef, updatedProfile);
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          const newProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            medicalHistory: '',
            setupComplete: false,
            role: user.email === 'flyingpig071@gmail.com' ? 'doctor' : 'user',
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          }
        }
      } else {
        setProfile(null);
      }
      setLoadingProgress(100);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-4">
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <div className="w-full mt-6">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${Math.round(loadingProgress)}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-500 mt-3 text-center">
              Loading your health dashboard... {Math.round(loadingProgress)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {user && profile && !profile.setupComplete && (
        <SetupWalkthrough onComplete={() => setProfile({ ...profile, setupComplete: true })} />
      )}
      <Router>
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route element={user ? <Layout /> : <Navigate to="/auth" />}>
            <Route path="/" element={<Home />} />
            <Route path="/new-scan" element={<NewScan />} />
            <Route path="/scan/:id" element={<ScanDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/symptoms" element={<SymptomTracker />} />
          </Route>
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}


import SetupWalkthrough from './components/SetupWalkthrough';

