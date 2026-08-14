import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Instagram, Clock, Calendar, ShieldCheck, ChevronRight, Heart } from 'lucide-react';
import { getSettings, subscribeRealtimeUpdates } from '../services/realtimeStore';

export default function Footer({ setActiveTab }) {
  const [settings, setSettings] = useState(() => getSettings() || {});

  useEffect(() => {
    const unsubscribe = subscribeRealtimeUpdates(() => {
      setSettings(getSettings() || {});
    });
    return () => unsubscribe();
  }, []);

  const adminPhone = settings.adminPhone || '08812176486';
  const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/62${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent('Halo Admin GOR MBS, saya ingin bertanya seputar sewa lapangan badminton.')}`;
  const igUrl = 'https://instagram.com/gormbs'; // URL Instagram GOR MBS

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-300 pt-12 pb-24 md:pb-12 mt-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md border border-orange-500/50 overflow-hidden shrink-0 flex items-center justify-center">
                <img src="/logo-gor-mbs.jpg" alt="Logo GOR MBS" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent block">
                  GOR MBS
                </span>
                <p className="text-xs text-slate-400 font-medium">Mandiri Bengle Sejahtera</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gelanggang Olahraga Bulu Tangkis Modern & Nyaman dengan 3 Lapangan Karpet Vinyl Standar Internasional di Karawang/Bengle.
            </p>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sistem Booking Online Realtime 24/7</span>
            </div>
          </div>

          {/* Navigasi Cepat */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Navigasi Halaman
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab('booking');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
                  <span>Sewa Lapangan Badminton</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab('manage');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
                  <span>Cek Tiket / Riwayat Reservasi</span>
                </button>
              </li>
              <li>
                <a
                  href="#jadwal"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setActiveTab) setActiveTab('booking');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
                  <span>Jadwal & Tarif Lapangan</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Jam Operasional */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Jam Operasional
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start space-x-2 text-slate-300">
                <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Buka Setiap Hari:</span>
                  <span className="text-slate-400">08.00 - 23.00 WIB</span>
                </div>
              </div>
              <div className="flex items-start space-x-2 text-slate-300">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Lokasi GOR:</span>
                  <span className="text-slate-400">Jl. Raya Bengle, Karawang Timur, Jawa Barat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hubungi Admin & Medsos */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Kontak CS & Social Media
            </h3>
            <div className="space-y-2.5">
              
              {/* WhatsApp Admin Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-110 transition">
                  <Phone className="w-4 h-4 fill-slate-950" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-emerald-400/80 uppercase font-bold block tracking-wide">WhatsApp CS Admin</span>
                  <span className="text-xs font-extrabold font-mono truncate block text-emerald-300">{adminPhone}</span>
                </div>
              </a>

              {/* Instagram Official Button */}
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-amber-900/30 hover:from-purple-900/50 hover:via-pink-900/50 hover:to-amber-900/50 border border-pink-500/30 text-pink-300 hover:text-pink-200 transition group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-pink-400/80 uppercase font-bold block tracking-wide">Instagram Official</span>
                  <span className="text-xs font-extrabold truncate block text-pink-200">@gormbs</span>
                </div>
              </a>

            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} GOR MBS (Mandiri Bengle Sejahtera). All Rights Reserved.</p>
          <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
            <span>Dibuat dengan</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>untuk Komunitas Badminton Karawang</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
