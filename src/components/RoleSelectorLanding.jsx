import React, { useState } from 'react';
import {
  registerNewUser,
  authenticateAnyAccount
} from '../services/realtimeStore';
import {
  Trophy,
  User,
  Phone,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';

export default function RoleSelectorLanding({ onAuthenticated, theme, toggleTheme }) {
  // Auth Tab Mode: 'register' or 'login'
  const [authMode, setAuthMode] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return (hash === 'login' || hash === 'signin') ? 'login' : 'register';
  });

  // Register Form Fields
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    password: ''
  });

  // Login Form Fields
  const [loginForm, setLoginForm] = useState({
    usernameOrPhone: '',
    password: ''
  });

  // Feedback Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Submit Handler for Registration (Async dengan SHA-256 Hashing)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!registerForm.name.trim() || !registerForm.phone.trim() || !registerForm.password.trim()) {
      setErrorMessage('Mohon isi Nama Lengkap, No. WhatsApp, dan Password untuk mendaftar.');
      return;
    }

    const res = await registerNewUser({
      name: registerForm.name,
      phone: registerForm.phone,
      password: registerForm.password
    });

    if (!res.success) {
      setErrorMessage(res.error);
      return;
    }

    setSuccessMessage(`Pendaftaran berhasil! Selamat datang, ${res.user.name}. Mengalihkan ke halaman sewa lapangan...`);
    setTimeout(() => {
      onAuthenticated({ role: 'user', user: res.user });
    }, 450);
  };

  // Submit Handler for Login (Async dengan SHA-256 Hash Verification)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginForm.usernameOrPhone.trim() || !loginForm.password.trim()) {
      setErrorMessage('Mohon isi Username / No. WA dan Password Anda.');
      return;
    }

    const res = await authenticateAnyAccount({
      usernameOrPhone: loginForm.usernameOrPhone,
      password: loginForm.password
    });

    if (!res.success) {
      setErrorMessage(res.error);
      return;
    }

    if (res.role === 'admin') {
      setSuccessMessage('Login Admin berhasil! Membuka Dashboard Admin GOR...');
      setTimeout(() => {
        onAuthenticated({ role: 'admin' });
      }, 450);
    } else {
      setSuccessMessage(`Selamat datang kembali, ${res.user.name}! Membuka halaman booking...`);
      setTimeout(() => {
        onAuthenticated({ role: 'user', user: res.user });
      }, 450);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
 

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 my-auto py-6">
        
        {/* Branding Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 mx-auto shadow-2xl shadow-amber-500/20 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center">
            <img src="/logo-gor-mbs.jpg" alt="Logo GOR MBS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400 bg-clip-text text-transparent tracking-tight">
            GOR MBS 🏸
          </h1>
          <p className="text-amber-400 font-bold text-xs sm:text-sm">
            Mandiri Bengle Sejahtera
          </p>
          <p className="text-slate-400 text-xs">
            Daftar atau Login untuk mengakses website sewa lapangan bulu tangkis
          </p>
        </div>

        {/* MAIN AUTH CARD */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative">
          
          {/* TAB TOGGLE: DAFTAR VS LOGIN */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center space-x-1 mb-6 shadow-inner">
            <button
              onClick={() => {
                setAuthMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                authMode === 'register'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                authMode === 'login'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Masuk</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{successMessage}</p>
            </div>
          )}

          {/* FORM 1: DAFTAR AKUN BARU (REGISTER) */}
          {authMode === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap Pemain *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Ludfi"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  No. WhatsApp Pemain *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 0895387571635"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password Akun *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Buat password akun Anda"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2 mt-6"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftar Akun & Masuk Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* FORM 2: LOGIN AKUN (USER / ADMIN AUTOMATIC DETECT) */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  No. WhatsApp Pemain / Username Admin *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="No. WA Pemain (0895...) atau Admin"
                    value={loginForm.usernameOrPhone}
                    onChange={(e) => setLoginForm({ ...loginForm, usernameOrPhone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password Anda"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>



              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2 mt-6"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Website</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer Note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 SmashArena GOR Realtime Booking System.
        </p>

      </div>
    </div>
  );
}
