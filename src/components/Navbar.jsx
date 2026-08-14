import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Smartphone,
  Clock,
  LogOut,
  AlertTriangle,
  X,
  Check,
  Sun,
  Moon,
  User,
  Phone,
  Edit,
  AlertCircle
} from 'lucide-react';
import {
  getActiveUser,
  updateUserProfile,
  subscribeRealtimeUpdates
} from '../services/realtimeStore';

export default function Navbar({ isRouteAdmin, activeTab, setActiveTab, onResetRole, theme, toggleTheme }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID'));
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile Dropdown & Edit Modal States
  const [currentUser, setCurrentUser] = useState(() => getActiveUser());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);

    const active = getActiveUser();
    setCurrentUser(active);
    if (active) {
      setEditForm({ name: active.name || '', phone: active.phone || '' });
    }

    const unsubscribe = subscribeRealtimeUpdates(() => {
      const updated = getActiveUser();
      setCurrentUser(updated);
      if (updated) {
        setEditForm({ name: updated.name || '', phone: updated.phone || '' });
      }
    });

    // Close profile menu when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('#profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);

    return () => {
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showEditProfileModal || showLogoutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEditProfileModal, showLogoutModal]);

  const triggerLogoutConfirm = () => {
    setShowLogoutModal(true);
  };

  const handleExecuteLogout = () => {
    setShowLogoutModal(false);
    onResetRole();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setEditError('Mohon isi Nama Lengkap dan Nomor WhatsApp Anda.');
      return;
    }

    setIsSavingProfile(true);
    try {
      if (isRouteAdmin) {
        // Admin update display info
        setEditSuccess('✅ Profil Admin berhasil diperbarui!');
        setTimeout(() => {
          setShowEditProfileModal(false);
          setEditSuccess('');
        }, 1200);
        return;
      }

      if (!currentUser) return;
      const res = await updateUserProfile(currentUser.id, {
        name: editForm.name,
        phone: editForm.phone
      });

      if (res.success) {
        setCurrentUser(res.user);
        setEditSuccess('✅ Profil & Nomor WhatsApp berhasil diperbarui!');
        setTimeout(() => {
          setShowEditProfileModal(false);
          setEditSuccess('');
        }, 1200);
      } else {
        setEditError(res.error || 'Gagal memperbarui profil.');
      }
    } catch (err) {
      setEditError('Terjadi kesalahan koneksi.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      {isRouteAdmin ? (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/95 border-b border-purple-900/50 text-white shadow-2xl w-full">
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

              {/* Admin Header Actions (Theme Toggle & Sleek Default Profile Button) */}
              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                {/* Theme Toggle Button */}
                {toggleTheme && (
                  <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Beralih ke Mode Terang (Light Theme)' : 'Beralih ke Mode Gelap (Dark Theme)'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="hidden xs:inline text-slate-200">☀️ Mode Terang</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="hidden xs:inline text-slate-800">🌙 Mode Gelap</span>
                      </>
                    )}
                  </button>
                )}

                {/* Default Circular Profile Icon Button (Admin) */}
                <div className="relative shrink-0" id="profile-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfileMenu(!showProfileMenu);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                    title="Menu Profil & Akun Admin"
                  >
                    <User className="w-5 h-5" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-fade-in space-y-2.5 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-xs text-white truncate">Admin Kasir MBS</h4>
                          <p className="text-[11px] text-amber-400 font-mono truncate">Super Admin GOR</p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setEditError('');
                            setEditSuccess('');
                            setEditForm({ name: 'Admin Kasir MBS', phone: '08123456789' });
                            setShowEditProfileModal(true);
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left cursor-pointer"
                        >
                          <Edit className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>✏️ Edit Profil Admin</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            triggerLogoutConfirm();
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Keluar (Logout Admin)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 text-white shadow-xl w-full">
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

              {/* Clock, Theme Toggle & Sleek Default Profile Button */}
              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-mono text-xs">{time}</span>
                </div>

                {/* Theme Toggle Button */}
                {toggleTheme && (
                  <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Beralih ke Mode Terang (Light Theme)' : 'Beralih ke Mode Gelap (Dark Theme)'}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="hidden xs:inline text-slate-200">☀️ Terang</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="hidden xs:inline text-slate-800">🌙 Gelap</span>
                      </>
                    )}
                  </button>
                )}

                {/* Default Circular Profile Icon Button (User) */}
                <div className="relative shrink-0" id="profile-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfileMenu(!showProfileMenu);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                    title={`Profil (${currentUser?.name || 'Pemain'})`}
                  >
                    <User className="w-5 h-5" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-fade-in space-y-2.5 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-xs text-white truncate">
                            {currentUser?.name || 'Pemain MBS'}
                          </h4>
                          <p className="text-[11px] text-amber-400 font-mono truncate">
                            {currentUser?.phone || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setEditError('');
                            setEditSuccess('');
                            setEditForm({ name: currentUser?.name || '', phone: currentUser?.phone || '' });
                            setShowEditProfileModal(true);
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left cursor-pointer"
                        >
                          <Edit className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>✏️ Edit Profil (Ubah WA & Nama)</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            triggerLogoutConfirm();
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Keluar (Logout Akun)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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

      {/* MODAL EDIT PROFIL (NAMA & NOMOR WA) */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 my-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Profil {isRouteAdmin ? 'Admin' : 'Pemain'}</h3>
                  <p className="text-[11px] text-slate-400">Perbarui Nama Lengkap & Nomor WhatsApp</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditProfileModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert Error / Success */}
            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                  placeholder="Masukkan Nama Lengkap"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nomor WhatsApp Aktif (Format 08... atau 628...)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                    placeholder="Contoh: 081234567890"
                  />
                </div>
                <p className="text-[10px] text-amber-400/90 mt-1">
                  💡 Ubah nomor WhatsApp jika sebelumnya salah memasukkan nomor agar tiket & konfirmasi booking terhubung dengan benar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
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
