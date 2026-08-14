import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Instagram, Clock, ChevronRight } from 'lucide-react';
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
  const igUrl = 'https://www.instagram.com/gor_mbs?igsh=MTBqaWF2OGJ0YzdlNw==';

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-300 pt-10 pb-8 mt-16 relative z-10 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Main Grid 3 Kolom Rapi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Navigasi Cepat */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Navigasi Halaman
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab('booking');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Sewa Lapangan Badminton</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab('manage');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
                  className="hover:text-orange-400 transition flex items-center space-x-1.5 cursor-pointer text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Jadwal & Tarif Lapangan</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Jam Operasional & Alamat GOR */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Jam Operasional & Alamat
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
                  <span className="font-bold block text-white">Alamat GOR:</span>
                  <span className="text-slate-400 leading-relaxed block">
                    Citra Kebun Mas Blok B, Bengle, Kec. Majalaya, Karawang, Jawa Barat 41371
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hubungi CS & Social Media */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Kontak CS & Instagram
            </h3>
            <div className="space-y-2.5">
              
              {/* WhatsApp Admin Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-105 transition">
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
                className="flex items-center space-x-3 p-2.5 rounded-xl bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-amber-900/30 hover:from-purple-900/50 hover:via-pink-900/50 hover:to-amber-900/50 border border-pink-500/30 text-pink-300 hover:text-pink-200 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-pink-400/80 uppercase font-bold block tracking-wide">Instagram Official</span>
                  <span className="text-xs font-extrabold truncate block text-pink-200">@gor_mbs</span>
                </div>
              </a>

            </div>
          </div>

        </div>

        {/* Bottom copyright (Centered Perfectly) */}
        <div className="pt-6 border-t border-slate-900 text-center flex justify-center items-center w-full">
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} GOR MBS (Mandiri Bengle Sejahtera). All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
