import React, { useState, useEffect } from 'react';
import { Phone, Instagram, MessageCircle, X } from 'lucide-react';
import { getSettings, subscribeRealtimeUpdates } from '../services/realtimeStore';

export default function FloatingContactWidget() {
  const [settings, setSettings] = useState(() => getSettings() || {});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeUpdates(() => {
      setSettings(getSettings() || {});
    });
    return () => unsubscribe();
  }, []);

  const adminPhone = settings.adminPhone || '08812176486';
  const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/62${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent('Halo Admin GOR MBS, saya ingin bertanya seputar sewa lapangan badminton.')}`;
  const igUrl = 'https://instagram.com/gormbs';

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end space-y-3 pointer-events-auto">
      
      {/* Expandable Menu Items */}
      {isOpen && (
        <div className="flex flex-col items-end space-y-2.5 animate-bounce-short">
          
          {/* Instagram Button */}
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-pink-500/40 text-white shadow-2xl hover:scale-105 transition cursor-pointer group"
          >
            <span className="text-xs font-bold text-slate-200 group-hover:text-pink-300">
              Follow IG @gormbs
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Instagram className="w-4 h-4" />
            </div>
          </a>

          {/* WhatsApp Admin Button */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 text-white shadow-2xl hover:scale-105 transition cursor-pointer group"
          >
            <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
              Chat Admin WA ({adminPhone})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <MessageCircle className="w-4 h-4 fill-slate-950" />
            </div>
          </a>

        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative ${
          isOpen
            ? 'bg-slate-800 text-slate-300 border border-slate-700'
            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 border-2 border-emerald-300 shadow-emerald-500/40 animate-pulse-subtle'
        }`}
        title="Bantuan Admin & Sosmed"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-slate-950 fill-slate-950" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-300 border-2 border-slate-950 animate-ping"></span>
          </div>
        )}
      </button>

    </div>
  );
}
