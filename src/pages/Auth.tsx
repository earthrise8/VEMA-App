import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Auth Error:", error);

      const code = error?.code as string | undefined;
      if (code === 'auth/missing-initial-state') {
        setAuthError('Sign-in could not complete because browser storage is blocked or was cleared during login. Enable site data/cookies for this site and try again in a regular browser tab.');
        return;
      }

      if (code === 'auth/popup-blocked') {
        setAuthError('Your browser blocked the Google sign-in popup. Allow popups for this site and try again.');
        return;
      }

      if (code === 'auth/popup-closed-by-user') {
        setAuthError('The sign-in popup was closed before completing login. Please try again.');
        return;
      }

      setAuthError('Unable to sign in right now. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
            <Activity className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">VEMA Health</h1>
          <p className="text-slate-500 text-lg">
            Empowering you to take control of your health with AI-powered scanning and doctor collaboration.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
          {authError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-left">
              {authError}
            </p>
          )}
          <p className="text-xs text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
