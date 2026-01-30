'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAllCache } from '@/lib/cache';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // Auto-restore session from localStorage (Capacitor persistence)
  useEffect(() => {
    const storedUserId = localStorage.getItem('pms_user_id');
    if (storedUserId) {
      fetch('/api/auth/restore-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: storedUserId }),
      })
        .then(res => {
          if (res.ok) {
            router.push('/dashboard');
          } else {
            // Stored ID is invalid, clear it
            localStorage.removeItem('pms_user_id');
            setRestoring(false);
          }
        })
        .catch(() => {
          setRestoring(false);
        });
    } else {
      setRestoring(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Clear stale cache from previous sessions
      clearAllCache();

      // Save user_id to localStorage for Capacitor session persistence
      if (data.user?.id) {
        localStorage.setItem('pms_user_id', data.user.id);
      }
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 text-sm">Restoring session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/8 rounded-full blur-[80px]"></div>
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}></div>

        {/* Top - Icon mark */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Globe */}
              <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="3" strokeOpacity="0.35" fill="none" />
              <ellipse cx="50" cy="50" rx="20" ry="38" stroke="white" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
              <line x1="12" y1="50" x2="88" y2="50" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
              <line x1="50" y1="12" x2="50" y2="88" stroke="white" strokeWidth="2" strokeOpacity="0.15" />
              <path d="M18 32 Q50 28, 82 32" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
              <path d="M18 68 Q50 72, 82 68" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
              {/* GT Text */}
              <text x="50" y="58" textAnchor="middle" fill="white" fontWeight="bold" fontSize="32" fontFamily="Arial, sans-serif" letterSpacing="-1">GT</text>
            </svg>
          </div>
        </div>

        {/* Center - Company Name */}
        <div className="relative z-10 -mt-8">
          <h1 className="text-5xl font-extralight tracking-[0.25em] text-white/90 uppercase mb-3">
            Global Techtrums
          </h1>
          <div className="w-24 h-[2px] bg-gradient-to-r from-indigo-400 to-purple-400 mb-6"></div>
          <p className="text-lg text-indigo-200/70 font-light tracking-wide">
            Project Management System
          </p>

          <div className="flex gap-8 mt-12">
            <div className="flex items-center gap-2.5 text-indigo-300/50">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60"></div>
              <span className="text-sm tracking-wide">Track</span>
            </div>
            <div className="flex items-center gap-2.5 text-indigo-300/50">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60"></div>
              <span className="text-sm tracking-wide">Collaborate</span>
            </div>
            <div className="flex items-center gap-2.5 text-indigo-300/50">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60"></div>
              <span className="text-sm tracking-wide">Deliver</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-indigo-400/30 text-xs tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Global Techtrums. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="3" strokeOpacity="0.35" fill="none" />
                  <ellipse cx="50" cy="50" rx="20" ry="38" stroke="white" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
                  <line x1="12" y1="50" x2="88" y2="50" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
                  <line x1="50" y1="12" x2="50" y2="88" stroke="white" strokeWidth="2" strokeOpacity="0.15" />
                  <path d="M18 32 Q50 28, 82 32" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
                  <path d="M18 68 Q50 72, 82 68" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
                  <text x="50" y="58" textAnchor="middle" fill="white" fontWeight="bold" fontSize="32" fontFamily="Arial, sans-serif" letterSpacing="-1">GT</text>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-extralight tracking-[0.2em] text-gray-800 uppercase">Global Techtrums</h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase mt-1">Project Management System</p>
          </div>

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to continue to your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Enter username or email"
                  required
                />
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Enter password"
                  required
                />
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-indigo-50 rounded-xl">
            <p className="text-sm text-indigo-700 flex items-center gap-2">
              <i className="fas fa-info-circle"></i>
              <span><strong>Admin:</strong> Use email | <strong>Users:</strong> Use username</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
