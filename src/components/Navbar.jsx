import React, { useState, useEffect } from 'react';
import { Calendar, Smartphone, Clock, Trophy, ShieldCheck, LogOut, AlertTriangle, X, Check } from 'lucide-react';

export default function Navbar({ isRouteAdmin, activeTab, setActiveTab, onResetRole }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID'));
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerLogoutConfirm = () => {
    setShowLogoutModal(true);
  };

  const handleExecuteLogout = () => {
    setShowLogoutModal(false);
    onResetRole();
  };

  return (
    <>
      {isRouteAdmin ? (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/95 border-b border-purple-900/50 text-white shadow-2xl w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              
              {/* Admin Logo & Brand */}
              <div className="flex items-center space-x-3 shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white p-1 shadow-md border border-amber-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                  <img src="/logo-gor-mbs.jpg" alt="Logo GOR MBS" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-base sm:text-xl tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                      GOR MBS
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ADMIN / KASIR
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-300 font-medium">Mandiri Bengle Sejahtera</p>
                </div>
              </div>

              {/* Admin Header Actions */}
              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                <button
                  onClick={triggerLogoutConfirm}
                  className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs sm:text-sm font-bold transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Logout Admin (Keluar)</span>
                  <span className="sm:hidden text-[11px]">Logout</span>
                </button>
              </div>

            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 text-white shadow-xl w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              
              {/* Customer Logo & Brand */}
              <div className="flex items-center space-x-3 cursor-pointer min-w-0" onClick={() => setActiveTab('booking')}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white p-1 shadow-md border border-orange-500/50 overflow-hidden shrink-0 flex items-center justify-center">
                  <img src="/logo-gor-mbs.jpg" alt="Logo GOR MBS" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent truncate">
                      GOR MBS
                    </span>
                    <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">
                      3 Lapangan
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-300 truncate font-medium">Mandiri Bengle Sejahtera</p>
                </div>
              </div>

              {/* Customer Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
                <button
                  onClick={() => setActiveTab('booking')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${
                    activeTab === 'booking'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Sewa Lapangan</span>
                </button>

                <button
                  onClick={() => setActiveTab('manage')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${
                    activeTab === 'manage'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Cek Tiket / Booking</span>
                </button>
              </nav>

              {/* Clock & Explicit Logout Button */}
              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-mono text-xs">{time}</span>
                </div>

                <button
                  onClick={triggerLogoutConfirm}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-bold transition shadow-sm ml-1 sm:ml-2 whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Logout (Keluar)</span>
                  <span className="sm:hidden text-[11px]">Logout</span>
                </button>
              </div>

            </div>
          </div>
          
          {/* Mobile Ergonomic Bottom Bar */}
          <div className="md:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-2 px-4 w-full">
            <button
              onClick={() => setActiveTab('booking')}
              className={`flex-1 flex flex-col items-center space-y-0.5 py-1 text-[11px] font-medium transition ${
                activeTab === 'booking' ? 'text-orange-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Sewa Lapangan</span>
            </button>

            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 flex flex-col items-center space-y-0.5 py-1 text-[11px] font-medium transition ${
                activeTab === 'manage' ? 'text-orange-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Cek Tiket</span>
            </button>
          </div>
        </header>
      )}

      {/* MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative my-auto space-y-4">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h3 className="font-extrabold text-white text-lg">Konfirmasi Keluar Akun</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin Logout (Keluar) dari portal website saat ini?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteLogout}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
