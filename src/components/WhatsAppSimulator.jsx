import React, { useState } from 'react';
import { Smartphone, CheckCheck, Send, ArrowLeft, MoreVertical, ShieldCheck, User, ExternalLink } from 'lucide-react';

export default function WhatsAppSimulator({ customerMsg, adminMsg, customerPhone, onClose }) {
  const [activeView, setActiveView] = useState('customer'); // 'customer' | 'admin'

  const formatPhoneForWA = (phone) => {
    if (!phone) return '6281234567890';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const getDirectWALink = () => {
    const isCustomer = activeView === 'customer';
    const targetPhone = isCustomer ? formatPhoneForWA(customerPhone) : '6281234567890';
    const textMsg = isCustomer ? customerMsg : adminMsg;
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(textMsg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative my-auto">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <h3 className="font-bold text-white text-sm sm:text-base">Simulasi Notifikasi WhatsApp API</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            onClick={() => setActiveView('customer')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              activeView === 'customer'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Pesan ke Pelanggan</span>
          </button>
          <button
            onClick={() => setActiveView('admin')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              activeView === 'admin'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pesan ke Admin GOR</span>
          </button>
        </div>

        {/* Smartphone Screen Simulator */}
        <div className="p-3 sm:p-5 bg-slate-950 flex justify-center">
          <div className="w-full max-w-xs sm:max-w-sm bg-[#0b141a] text-slate-100 rounded-[2.2rem] border-4 border-slate-800 shadow-2xl overflow-hidden font-sans">
            
            {/* Phone Top Notch Bar */}
            <div className="bg-[#1f2c34] px-3 py-2 flex items-center justify-between text-[11px] text-slate-300 border-b border-[#2a3942]">
              <div className="flex items-center space-x-2">
                <ArrowLeft className="w-3.5 h-3.5 cursor-pointer text-slate-300" />
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                  {activeView === 'customer' ? 'WA' : 'ADM'}
                </div>
                <div>
                  <h4 className="font-bold leading-tight text-xs text-white">
                    {activeView === 'customer' ? 'System Notifier' : 'Bot Admin GOR'}
                  </h4>
                  <p className="text-[9px] text-emerald-400">Online • Official Business API</p>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>

            {/* Chat Body */}
            <div className="p-3 min-h-[300px] max-h-[340px] overflow-y-auto bg-[radial-gradient(#111b21_1px,transparent_1px)] [background-size:16px_16px] bg-[#0b141a] flex flex-col justify-end space-y-2">
              
              <div className="self-center bg-[#182229] px-2.5 py-0.5 rounded-lg text-[9px] text-slate-400 font-medium border border-[#222d34]">
                HARI INI
              </div>

              {/* Message Bubble */}
              <div className="self-start max-w-[90%] bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-none shadow-md border border-emerald-600/30 text-[11px] leading-relaxed font-sans whitespace-pre-line relative">
                {activeView === 'customer' ? customerMsg : adminMsg}
                
                <div className="flex items-center justify-end space-x-1 mt-2 text-[9px] text-emerald-200">
                  <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                </div>
              </div>

            </div>

            {/* Fake Keyboard Bottom */}
            <div className="bg-[#1f2c34] p-2 flex items-center space-x-2 border-t border-[#2a3942]">
              <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1 text-[11px] text-slate-400">
                Pesan terkirim otomatis...
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

          </div>
        </div>

        {/* Action Direct WA Links */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center space-y-2">
          <a
            href={getDirectWALink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Kirim via WhatsApp Asli ({activeView === 'customer' ? 'User' : 'Admin'})</span>
          </a>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Tutup Simulator
          </button>
        </div>

      </div>
    </div>
  );
}
