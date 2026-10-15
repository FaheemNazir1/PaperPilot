import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  BookOpen,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { currentUser, signInWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine redirect target after login
  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // If already authenticated, redirect to target or dashboard
  useEffect(() => {
    if (currentUser) {
      navigate(fromLocation, { replace: true });
    }
  }, [currentUser, navigate, fromLocation]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Successful login will trigger onAuthStateChanged and redirect
      navigate(fromLocation, { replace: true });
    } catch (err: any) {
      console.error('Google Sign-In caught in LoginPage:', err);

      const errorCode = err?.code || '';
      let friendlyMessage = 'Authentication failed. Please try again.';

      if (errorCode === 'auth/popup-closed-by-user') {
        friendlyMessage = 'The Google sign-in window was closed before completing.';
      } else if (errorCode === 'auth/cancelled-popup-request') {
        friendlyMessage = 'Sign-in was cancelled due to multiple simultaneous requests.';
      } else if (errorCode === 'auth/popup-blocked') {
        friendlyMessage = 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (errorCode === 'auth/network-request-failed') {
        friendlyMessage = 'Network error connecting to Google Authentication. Please check your internet connection.';
      } else if (errorCode === 'auth/invalid-api-key' || errorCode === 'auth/api-key-not-valid') {
        friendlyMessage = 'Invalid Firebase API Key. Please verify your VITE_FIREBASE_API_KEY in .env.local.';
      } else if (errorCode === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not authorized in Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (err?.message) {
        friendlyMessage = err.message;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between relative overflow-hidden selection:bg-accent-500/30 selection:text-accent-200">
      {/* Subtle Ambient Radial Backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a08_1px,transparent_1px),linear-gradient(to_bottom,#27272a08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-600/20 border border-accent-500/40 flex items-center justify-center text-accent-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-zinc-100 tracking-tight text-sm">PaperPilot</span>
            <span className="text-[10px] text-zinc-400 block leading-tight font-mono">Research paper library</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-full font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Google sign-in</span>
        </div>
      </header>

      {/* Central Login Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
          {/* Brand & Subtitle */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-600/15 border border-accent-500/30 text-accent-400 mb-4 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              PaperPilot
            </h1>
            <p className="text-xs uppercase tracking-wider text-accent-400 font-mono font-medium mt-1">
              Scientific paper manager
            </p>

            <p className="text-sm text-zinc-400 mt-3 font-normal leading-relaxed">
              Upload and organize scientific papers for your literature review.
            </p>
          </div>

          {/* Configuration Notice if .env.local is pending */}
          {!isConfigured && (
            <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Firebase Credentials Required</div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5">
                    Please provide your Firebase Web App configuration in <code className="bg-amber-950/60 px-1 rounded font-mono">.env.local</code> to enable Google authentication.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="text-[11px] leading-snug">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Google Sign-In Action */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-signin-button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-sm transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-zinc-700 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google G Logo */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Security & Academic Notice */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Official Firebase Google Authentication</span>
          </div>
        </div>

        {/* Project Context Footer */}
        <div className="mt-6 text-center text-xs text-zinc-400">
          <p className="text-[11px]">PaperPilot · Your private research paper library</p>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-zinc-400 border-t border-zinc-900">
        &copy; {new Date().getFullYear()} PaperPilot. All rights reserved.
      </footer>
    </div>
  );
};
