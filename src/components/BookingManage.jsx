import React, { useState, useEffect } from 'react';
import { getBookings, updateBookingStatus, subscribeRealtimeUpdates, getActiveUser } from '../services/realtimeStore';
import { Search, XCircle, AlertCircle, Download, QrCode, History, Calendar, Clock, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { downloadETicketPNG } from '../services/ticketService';

export default function BookingManage() {
  const [searchCode, setSearchCode] = useState('');
  const [matchingBookings, setMatchingBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [expandedQr, setExpandedQr] = useState({});

  const refreshUserBookings = (term) => {
    const allBookings = getBookings();
    const activeUser = getActiveUser();
    const lastPhone = localStorage.getItem('rts_last_booking_phone') || '';
    const searchTerm = (term !== undefined ? term : searchCode).trim().toUpperCase();

    if (searchTerm) {
      // 1. Cari berdasarkan Kode Booking / Token persis
      const exactMatch = allBookings.filter(
        b => b.booking_code?.toUpperCase() === searchTerm ||
             b.cancel_token === searchTerm ||
             b.qr_code_token === searchTerm
      );

      if (exactMatch.length > 0) {
        setMatchingBookings(exactMatch);
        setMessage('');
        return;
      }

      // 2. Cari berdasarkan No WA / Nama Pemain
      const phoneOrNameMatch = allBookings.filter(
        b => b.customer_phone?.replace(/[^0-9]/g, '').includes(searchTerm.replace(/[^0-9]/g, '')) ||
             b.customer_name?.toUpperCase().includes(searchTerm)
      );

      if (phoneOrNameMatch.length > 0) {
        setMatchingBookings(phoneOrNameMatch.sort((a, b) => (b.booking_date > a.booking_date ? 1 : -1)));
        setMessage('');
        return;
      }

      setMatchingBookings([]);
      setMessage('Tidak ditemukan tiket atau riwayat booking untuk kata kunci tersebut.');
    } else {
      // Auto-load berdasarkan user login atau nomor telepon booking terakhir
      const targetPhone = activeUser?.phone || lastPhone;
      if (targetPhone) {
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        const autoMatches = allBookings.filter(
          b => b.customer_phone?.replace(/[^0-9]/g, '').includes(cleanPhone) ||
               (activeUser?.name && b.customer_name?.toLowerCase().includes(activeUser.name.toLowerCase()))
        );
        if (autoMatches.length > 0) {
          setMatchingBookings(autoMatches.sort((a, b) => (b.booking_date > a.booking_date ? 1 : -1)));
          setMessage('');
          return;
        }
      }
      setMatchingBookings([]);
    }
  };

  useEffect(() => {
    refreshUserBookings();

    const unsubscribe = subscribeRealtimeUpdates(() => {
      refreshUserBookings();
    });
    return () => unsubscribe();
  }, []);

  // Check URL query parameters for cancel token link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manageToken = params.get('manage');
    if (manageToken) {
      setSearchCode(manageToken);
      refreshUserBookings(manageToken);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    refreshUserBookings(searchCode);
  };

  const handleCancelBooking = (bookingCode) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan reservasi ini? Slot waktu akan dikembalikan ke publik.')) return;

    const res = updateBookingStatus(bookingCode, 'cancelled');
    if (res.success) {
      refreshUserBookings(searchCode);
      setMessage('Reservasi Anda berhasil dibatalkan. Terima kasih.');
    }
  };

  const toggleQrView = (bookingId) => {
    setExpandedQr(prev => ({ ...prev, [bookingId]: !prev[bookingId] }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Cek & Riwayat Reservasi Tiket</h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          Cari tiket dengan Kode Booking atau No. WhatsApp Anda untuk melihat riwayat reservasi dan mengunduh E-Tiket kapan saja.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Kode Booking atau No. WhatsApp (misal: 08953...)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-2xl text-white text-xs sm:text-sm uppercase outline-none transition"
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 shrink-0 border border-orange-400/30"
          >
            <span>Cari Reservasi</span>
          </button>
        </form>

        {message && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Matching Bookings List / History */}
      {matchingBookings.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-orange-400" />
              <span>Daftar Riwayat Reservasi ({matchingBookings.length} Tiket)</span>
            </h2>
          </div>

          <div className="space-y-4">
            {matchingBookings.map((booking) => {
              const showQr = expandedQr[booking.id];

              return (
                <div
                  key={booking.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-orange-500/40 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Kode Booking</span>
                      <h3 className="font-mono text-xl sm:text-2xl font-black text-orange-400">{booking.booking_code}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        booking.status === 'confirmed'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : booking.status === 'playing'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                          : booking.status === 'completed'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {booking.status === 'confirmed' && '⏳ Terkonfirmasi'}
                        {booking.status === 'playing' && '🏸 Sedang Bermain'}
                        {booking.status === 'completed' && '✓ Selesai'}
                        {booking.status === 'cancelled' && '✕ Dibatalkan'}
                      </span>
                    </div>
                  </div>

                  {/* Grid Rincian Ticket */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block mb-0.5 font-medium">Pemesan:</span>
                      <p className="font-bold text-white text-sm">{booking.customer_name}</p>
                      <p className="text-slate-400 font-mono text-[11px] mt-0.5">{booking.customer_phone}</p>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block mb-0.5 font-medium">Jadwal Main:</span>
                      <p className="font-bold text-emerald-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{booking.staff_name || booking.court_name}</span>
                      </p>
                      <p className="text-slate-300 text-[11px] mt-0.5 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{booking.booking_date} @ {booking.booking_time} WIB</span>
                      </p>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block mb-0.5 font-medium">Total Harga & Pemain:</span>
                        <p className="font-extrabold text-emerald-400 text-sm font-mono">
                          Rp {(booking.total_amount || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">{booking.player_count || 4} Pemain | {booking.duration_hours || 1} Jam</span>
                    </div>
                  </div>

                  {/* Optional Collapsible QR Code */}
                  {showQr && (
                    <div className="bg-slate-950 p-5 rounded-2xl border border-purple-500/30 text-center space-y-2 animate-fadeIn">
                      <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-2xl border-2 border-emerald-500/40">
                        <QRCodeSVG
                          value={booking.qr_code_token || booking.booking_code}
                          size={160}
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <span className="text-xs font-mono text-emerald-400 font-bold block">
                        Token QR Check-In: {booking.qr_code_token || booking.booking_code}
                      </span>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleQrView(booking.id)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>{showQr ? 'Sembunyikan QR Code' : 'Lihat QR Code'}</span>
                    </button>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => downloadETicketPNG(booking)}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20 border border-purple-400/30 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh E-Tiket (PNG)</span>
                      </button>

                      {booking.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking.booking_code)}
                          title="Batalkan Reservasi Ini"
                          className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800/80 p-6 space-y-3">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Belum Ada Riwayat Tiket Yang Ditampilkan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ketikkan Kode Booking atau No. WhatsApp Anda pada kolom pencarian di atas untuk menampilkan seluruh daftar tiket dan mengunduh E-Tiket Anda.
          </p>
        </div>
      )}

    </div>
  );
}
