import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  CameraOff,
  X,
  Send,
  RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanQRCodeCheckIn } from '../services/realtimeStore';
import { formatCustomerVerifiedWAMessage } from '../services/whatsappService';
import confetti from 'canvas-confetti';

export default function QRScannerModal({ onClose, onSuccessCheckIn }) {
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const html5QrcodeRef = useRef(null);
  const isStartedRef = useRef(false);
  const qrRegionId = 'html5qr-code-full-region';

  useEffect(() => {
    let scannerInstance = null;

    const startCameraScanner = async () => {
      if (isStartedRef.current) return;
      isStartedRef.current = true;

      try {
        setCameraError('');
        setCameraActive(true);

        const regionEl = document.getElementById(qrRegionId);
        if (regionEl) regionEl.innerHTML = '';

        scannerInstance = new Html5Qrcode(qrRegionId);
        html5QrcodeRef.current = scannerInstance;

        const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.85)
          };
        };

        const config = {
          fps: 20,
          qrbox: qrboxFunction,
          aspectRatio: 1.0
        };

        // Mulai kamera (Cobakan kamera belakang smartphone / fallback ke kamera webcam laptop)
        const onScanSuccess = (decodedText) => {
          handleVerifyCode(decodedText);
        };

        try {
          await scannerInstance.start(
            { facingMode: 'environment' },
            config,
            onScanSuccess,
            () => {}
          );
        } catch (camErr) {
          await scannerInstance.start(
            { facingMode: 'user' },
            config,
            onScanSuccess,
            () => {}
          );
        }

      } catch (err) {
        console.warn('Kamera tidak dapat diakses:', err);
        setCameraActive(false);
        setCameraError('Kamera tidak dapat diakses. Gunakan ketik kode booking di bawah atau klik tombol Check-In di tabel admin.');
      }
    };

    startCameraScanner();

    return () => {
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          html5QrcodeRef.current.stop().then(() => {
            html5QrcodeRef.current.clear();
            isStartedRef.current = false;
          }).catch(() => {
            isStartedRef.current = false;
          });
        } else {
          isStartedRef.current = false;
        }
      }
    };
  }, []);

  const formatPhoneForWA = (phone) => {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const handleVerifyCode = (codeToVerify) => {
    const targetCode = (codeToVerify || qrInput).trim();
    if (!targetCode) {
      setErrorMsg('Silakan masukkan Kode Booking atau Token QR.');
      return;
    }

    setErrorMsg('');
    const res = scanQRCodeCheckIn(targetCode);

    if (res.success) {
      const bkg = res.booking;
      const customerMsg = formatCustomerVerifiedWAMessage(bkg);
      const formattedPhone = formatPhoneForWA(bkg.customer_phone);
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customerMsg)}`;

      // Selebrasi Confetti
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      setScanResult({
        booking: bkg,
        customerWaUrl: waUrl,
        message: `✓ Check-In Berhasil! Pemain: ${bkg.customer_name} (${bkg.staff_name})`
      });

      if (onSuccessCheckIn) onSuccessCheckIn(bkg);

      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    } else {
      setErrorMsg(res.error || '⚠️ Tiket QR / Kode Booking tidak valid atau sudah dibatalkan.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleVerifyCode(qrInput);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      
      {/* CSS Khusus Memastikan Kamera 1 Layar Penuh (Tidak Terbelah Dua) */}
      <style>{`
        #html5qr-code-full-region {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          display: block !important;
          overflow: hidden !important;
        }
        #html5qr-code-full-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
          border-radius: 0.85rem !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #html5qr-code-full-region canvas {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
        }
        #html5qr-code-full-region img {
          display: none !important;
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xs sm:max-w-sm w-full p-4 sm:p-5 text-center shadow-2xl relative my-auto">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2 text-left">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base">Scanner QR Tiket Pemain</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Verifikasi kedatangan pemain di GOR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Viewport Single Box */}
        {!scanResult && (
          <div className="mb-4">
            <div className="bg-slate-950 rounded-2xl border-2 border-emerald-500/40 p-1 overflow-hidden shadow-2xl relative max-w-[260px] h-[210px] mx-auto block">
              
              <div id={qrRegionId} className="w-full h-full block rounded-xl overflow-hidden bg-black"></div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-10">
                  <CameraOff className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="text-[11px] text-slate-300 leading-tight">{cameraError}</p>
                </div>
              )}

            </div>

            <div className="mt-2 text-center text-[11px] text-slate-400">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Kamera Aktif • Arahkan QR Code Pemain Ke Sini</span>
              </span>
            </div>
          </div>
        )}

        {/* Alert Error */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 text-left animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scan Success State */}
        {scanResult ? (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3 animate-fade-in my-1">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-extrabold text-white text-base">VERIFIKASI SUKSES - SEDANG BERMAIN! 🏸</h4>
              <p className="text-xs text-emerald-400 mt-0.5 font-medium">Status diubah ke Sedang Bermain (Slot tetap terkunci/terisi)</p>
            </div>
            
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Kode Booking:</span>
                <span className="font-bold text-purple-400">{scanResult.booking.booking_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Pemain:</span>
                <span className="font-bold text-white">{scanResult.booking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No. WhatsApp:</span>
                <span className="font-bold text-sky-400">{scanResult.booking.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lapangan:</span>
                <span className="font-bold text-emerald-400">{scanResult.booking.staff_name}</span>
              </div>
            </div>

            <a
              href={scanResult.customerWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 text-center"
            >
              <Send className="w-4 h-4 shrink-0 text-slate-950" />
              <span className="whitespace-nowrap">Kirim Bukti WA Pemain</span>
            </a>

            <button
              onClick={() => {
                setScanResult(null);
                setQrInput('');
                setErrorMsg('');
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan QR Tiket Lainnya</span>
            </button>
          </div>
        ) : (
          /* Input Manual */
          <form onSubmit={handleManualSubmit} className="space-y-3 text-left pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Ketik Kode Booking / Token QR Manual:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="BKG-XXXX-XXXX atau QR-XXXX"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:border-emerald-500 transition"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Verifikasi & Check-In</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
