import React, { useState, useEffect } from 'react';
import RoleSelectorLanding from './components/RoleSelectorLanding';
import Navbar from './components/Navbar';
import PublicBooking from './components/PublicBooking';
import BookingManage from './components/BookingManage';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import FloatingContactWidget from './components/FloatingContactWidget';
import {
  initRealtimeDatabase,
  getCurrentSession,
  logoutActiveUser,
  updateLastActivity,
  isSessionExpired,
  getActiveUser
} from './services/realtimeStore';

export default function App() {
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  // Theme State: 'dark' (default) atau 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('rts_theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('rts_theme', nextTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
  }, [theme]);

  // Sesi multi-tab dan pemulihan otomatis dari LocalStorage
  const [currentRole, setCurrentRole] = useState(() => {
    // 1. Cek sesi role khusus tab ini dulu
    const tabRole = sessionStorage.getItem('rts_tab_role');
    if (tabRole === 'admin' || tabRole === 'user') {
      const activeUser = getActiveUser();
      if (activeUser && activeUser.role === tabRole) {
        return tabRole;
      }
    }

    // 2. Cek URL Hash (#admin, #booking, #manage)
    const hash = window.location.hash.replace('#', '');
    if (hash === 'admin') {
      const isAdminAuth = sessionStorage.getItem('rts_admin_authenticated') === 'true' ||
                          localStorage.getItem('rts_admin_authenticated_v14') === 'true';
      if (isAdminAuth) {
        sessionStorage.setItem('rts_tab_role', 'admin');
        return 'admin';
      }
    }

    // 3. Cek Active User global
    const session = getCurrentSession();
    if (session?.role) {
      sessionStorage.setItem('rts_tab_role', session.role);
      return session.role;
    }

    return null;
  });

  const [customerTab, setCustomerTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['booking', 'manage'].includes(hash)) {
      return hash;
    }
    return localStorage.getItem('rts_customer_active_tab') || 'booking';
  });

  const setCustomerTab = (tabName) => {
    setCustomerTabState(tabName);
    localStorage.setItem('rts_customer_active_tab', tabName);
    window.location.hash = tabName;
  };

  useEffect(() => {
    // Inisialisasi awal database lokal
    initRealtimeDatabase();

    // Pastikan hash URL selaras dengan state aplikasi
    if (currentRole) {
      if (currentRole === 'admin') {
        if (window.location.hash !== '#admin') {
          window.location.hash = 'admin';
        }
      } else if (currentRole === 'user') {
        const hash = window.location.hash.replace('#', '');
        if (['booking', 'manage'].includes(hash)) {
          setCustomerTabState(hash);
        } else {
          window.location.hash = customerTab || 'booking';
        }
      }
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (currentRole === 'user' && ['booking', 'manage'].includes(hash)) {
        setCustomerTabState(hash);
        localStorage.setItem('rts_customer_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Event listener aktivitas pengguna untuk memperbarui last_activity_timestamp
    const handleUserActivity = () => {
      if (currentRole) {
        updateLastActivity();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Timer pengecekan periodik inaktivitas 1 jam (cek setiap 15 detik)
    const interval = setInterval(() => {
      if (currentRole && isSessionExpired()) {
        handleLogout();
        setSessionExpiredNotice(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(interval);
    };
  }, [currentRole, customerTab]);

  const handleAuthenticated = ({ role }) => {
    updateLastActivity();
    setCurrentRole(role);
    sessionStorage.setItem('rts_tab_role', role);
    if (role === 'admin') {
      sessionStorage.setItem('rts_admin_authenticated', 'true');
      localStorage.setItem('rts_admin_authenticated_v14', 'true');
      window.location.hash = 'admin';
    } else {
      window.location.hash = customerTab || 'booking';
    }
    setSessionExpiredNotice(false);
  };

  const handleLogout = () => {
    logoutActiveUser();
    window.location.hash = 'login';
    setCurrentRole(null);
  };

  // 1. JIKA BELUM LOGIN / SESI HAK AKSES KOSONG -> TAMPILKAN FORM DAFTAR / LOGIN
  if (!currentRole) {
    if (window.location.hash !== '#login') {
      window.location.hash = 'login';
    }
    return (
      <div className="relative">
        {sessionExpiredNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-2xl border border-rose-400 flex items-center space-x-2 animate-bounce">
            <span>⏰ Sesi Anda telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan login kembali.</span>
          </div>
        )}
        <RoleSelectorLanding onAuthenticated={handleAuthenticated} theme={theme} toggleTheme={toggleTheme} />
      </div>
    );
  }

  const isRouteAdmin = currentRole === 'admin';

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden max-w-full w-full flex flex-col justify-between">
      
      {/* Background Glow Effects - Cyber Orange & Emerald */}
      <div className="fixed top-0 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-orange-500/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div>
        {/* Navigation Bar */}
        <Navbar
          isRouteAdmin={isRouteAdmin}
          activeTab={customerTab}
          setActiveTab={setCustomerTab}
          onResetRole={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Dedicated Main Content View */}
        <main className="relative z-10 pb-8 w-full max-w-full overflow-x-hidden">
          {isRouteAdmin ? (
            <AdminDashboard />
          ) : (
            <>
              {customerTab === 'booking' && <PublicBooking />}
              {customerTab === 'manage' && <BookingManage />}
            </>
          )}
        </main>
      </div>

      {/* Floating WhatsApp & Instagram Quick Contact Widget */}
      <FloatingContactWidget />

      {/* Bespoke Comprehensive Web Footer */}
      {!isRouteAdmin ? (
        <Footer setActiveTab={setCustomerTab} />
      ) : (
        <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-center text-xs text-slate-400 w-full overflow-x-hidden mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} GOR MBS (Mandiri Bengle Sejahtera). Dashboard Pengelolaan Kasir & Admin.</p>
          </div>
        </footer>
      )}

    </div>
  );
}
