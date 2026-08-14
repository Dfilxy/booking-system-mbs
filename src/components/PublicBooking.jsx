import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getCourts,
  getSlots,
  getBookings,
  ensureSlotsForDate,
  bookMultiHourSlotsAtomic,
  subscribeRealtimeUpdates,
  initRealtimeDatabase,
  getActiveUser,
  getSettings,
  validateIndonesianPhone,
  checkBookingRateLimit,
  updateBookingRateLimit
} from '../services/realtimeStore';
import { dispatchAdminWhatsAppNotification } from '../services/whatsappService';
import WhatsAppSimulator from './WhatsAppSimulator';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  QrCode,
  CalendarPlus,
  Trophy,
  Users,
  ChevronRight,
  X,
  Download,
  Printer
} from 'lucide-react';
import { downloadETicketPNG, printETicket } from '../services/ticketService';

export default function PublicBooking() {
  const [courts, setCourts] = useState([]);
  const [slots, setSlots] = useState([]);

  // Logged-in Customer User State
  const [activeUser, setActiveUser] = useState(null);

  // Selected State (Persist saat refresh!)
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const [selectedCourt, setSelectedCourtState] = useState(null);
  const [selectedDate, setSelectedDateState] = useState(() => {
    return localStorage.getItem('rts_cust_selected_date') || todayStr;
  });
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [durationHours, setDurationHoursState] = useState(() => {
    return parseInt(localStorage.getItem('rts_cust_duration') || '1', 10);
  });
  const [playerCount, setPlayerCountState] = useState(() => {
    return parseInt(localStorage.getItem('rts_cust_player_count') || '4', 10);
  });
  const [sysSettings, setSysSettings] = useState(() => getSettings() || {});
  const currentAdminPhone = sysSettings.adminPhone || '08812176486';

  const setSelectedDate = (dateVal) => {
    setSelectedDateState(dateVal);
    localStorage.setItem('rts_cust_selected_date', dateVal);
  };

  const setSelectedCourt = (courtObj) => {
    setSelectedCourtState(courtObj);
    setSelectedStartTime(null);
    if (courtObj?.id) {
      localStorage.setItem('rts_cust_selected_court_id', courtObj.id);
    }
  };

  const setDurationHours = (val) => {
    setDurationHoursState(val);
    localStorage.setItem('rts_cust_duration', val.toString());
  };

  const setPlayerCount = (val) => {
    setPlayerCountState(val);
    localStorage.setItem('rts_cust_player_count', val.toString());
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // UI Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showWASimulator, setShowWASimulator] = useState(false);
  const [adminWaMsg, setAdminWaMsg] = useState('');
  const [adminWaUrl, setAdminWaUrl] = useState('');

  const [allBookings, setAllBookings] = useState([]);

  const reloadData = () => {
    initRealtimeDatabase();
    setCourts(getCourts());
    if (selectedDate) {
      ensureSlotsForDate(selectedDate);
    }
    setSlots(getSlots(selectedDate));
    setAllBookings(getBookings());
  };

  useEffect(() => {
    reloadData();

    const userObj = getActiveUser();
    if (userObj) {
      setActiveUser(userObj);
      setFormData(prev => ({
        ...prev,
        name: userObj.name || '',
        phone: userObj.phone || ''
      }));
    }

    const unsubscribe = subscribeRealtimeUpdates(() => {
      if (selectedDate) {
        setSlots(getSlots(selectedDate));
      }
      setAllBookings(getBookings());
      setSysSettings(getSettings() || {});
    });

    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    if (courts.length > 0 && !selectedCourt) {
      const savedCourtId = localStorage.getItem('rts_cust_selected_court_id');
      const foundCourt = courts.find(c => c.id === savedCourtId);
      setSelectedCourt(foundCourt || courts[0]);
    }
  }, [courts]);

  // Helper: Cek apakah slot jam sudah lewat dibanding jam realtime sekarang
  const isSlotInPast = (slotDateStr, startTimeStr) => {
    const n = new Date();
    const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    if (slotDateStr < todayStr) return true;
    if (slotDateStr === todayStr) {
      const currentHour = new Date().getHours();
      const slotHour = parseInt(startTimeStr.split(':')[0], 10);
      return slotHour <= currentHour;
    }
    return false;
  };

  const currentAvailableSlots = getSlots(selectedDate);
  const filteredSlots = currentAvailableSlots.filter(
    s => s.court_id === selectedCourt?.id && s.slot_date === selectedDate
  );

  const getEndTime = (startStr, duration) => {
    if (!startStr) return '';
    const startH = parseInt(startStr.split(':')[0]);
    const endH = startH + parseInt(duration);
    return endH.toString().padStart(2, '0') + ':00';
  };

  const calculateTotalAmount = () => {
    const ratePerPerson = 5000;
    const players = parseInt(playerCount) || 1;
    return players * ratePerPerson;
  };

  const [showBookingConfirmModal, setShowBookingConfirmModal] = useState(false);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Check Anti-Spam Rate Limit (30 detik cooldown)
    const rateCheck = checkBookingRateLimit();
    if (!rateCheck.isAllowed) {
      setErrorMessage(rateCheck.error);
      return;
    }

    if (!selectedStartTime) {
      setErrorMessage('Silakan pilih jam mulai main pada grid ketersediaan.');
      return;
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMessage('Mohon lengkapi Nama Pemain dan Nomor WhatsApp Anda.');
      return;
    }

    // 2. Check Strict Indonesian WA Number Format
    const phoneVal = validateIndonesianPhone(formData.phone);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error);
      return;
    }

    // Pre-validation: Cek apakah durasi jam yang dipilih menabrak slot terisi
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const duration = parseInt(durationHours) || 1;
    const requiredTimes = [];
    for (let h = startHour; h < startHour + duration; h++) {
      requiredTimes.push(h.toString().padStart(2, '0') + ':00');
    }

    const occupiedHours = [];
    for (const tStr of requiredTimes) {
      const slotObj = filteredSlots.find(s => s.start_time === tStr);
      const isPast = isSlotInPast(selectedDate, tStr);
      if (!slotObj || slotObj.status !== 'available' || isPast) {
        occupiedHours.push(tStr);
      }
    }

    if (occupiedHours.length > 0) {
      setErrorMessage(`⚠️ Peringatan Bentrok (${duration} Jam): Slot jam ${occupiedHours.join(', ')} WIB di ${selectedCourt?.name} sudah TERISI / DIBOOKING oleh pemain atau member lain. Anda tidak dapat mengambil sewa ${duration} jam dari jam ${selectedStartTime} WIB. Silakan pilih jam atau kurangi durasi.`);
      return;
    }

    // Tampilkan Modal Konfirmasi sebelum eksekusi booking
    setShowBookingConfirmModal(true);
  };

  const handleFinalBookingSubmit = async () => {
    setShowBookingConfirmModal(false);
    setLoading(true);

    try {
      const res = await bookMultiHourSlotsAtomic({
        court_id: selectedCourt.id,
        booking_date: selectedDate,
        start_time: selectedStartTime,
        duration_hours: parseInt(durationHours),
        player_count: parseInt(playerCount),
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: formData.email,
        notes: formData.notes
      });

      if (!res.success) {
        setErrorMessage(res.error);
        setLoading(false);
        setSlots(getSlots(selectedDate));
        return;
      }

      // Update Anti-Spam Rate Limit Timestamp
      updateBookingRateLimit();

      const newBkg = res.booking;
      setConfirmedBooking(newBkg);
      if (formData.phone?.trim()) {
        localStorage.setItem('rts_last_booking_phone', formData.phone.trim());
      }

      const waRes = await dispatchAdminWhatsAppNotification(newBkg);
      setAdminWaMsg(waRes.adminMsg);
      setAdminWaUrl(waRes.adminWaUrl);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat memproses booking: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateGoogleCalendarUrl = (booking) => {
    if (!booking) return '#';
    const title = encodeURIComponent(`Badminton: ${booking.staff_name} (${booking.booking_code})`);
    const details = encodeURIComponent(`Sewa Lapangan Bulu Tangkis.\nKode Booking: ${booking.booking_code}\nLapangan: ${booking.staff_name}\nPemain: ${booking.player_count} Orang`);
    const dateFormatted = booking.booking_date.replace(/-/g, '');
    
    const startStr = booking.booking_time.split(' - ')[0] || '19:00';
    const startTimeFormatted = startStr.replace(':', '') + '00';
    const endStr = booking.booking_time.split(' - ')[1]?.replace(' WIB', '') || '21:00';
    const endTimeFormatted = endStr.replace(':', '') + '00';
    
    const dates = `${dateFormatted}T${startTimeFormatted}/${dateFormatted}T${endTimeFormatted}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full max-w-full overflow-x-hidden">
      
      {/* GOR MBS Badminton Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 p-5 sm:p-8 mb-6 sm:mb-8 shadow-2xl w-full max-w-full">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl space-y-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> GOR MBS • Mandiri Bengle Sejahtera
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ⚡ Tarif Spesial: Rp 5.000 / Orang
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Sewa Lapangan Bulu Tangkis Berkualitas & Realtime 🏸
          </h1>

          <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
            Nikmati keseruan bermain bulu tangkis di 3 lapangan terbaik kami (<span className="font-bold text-amber-300">Lapangan A</span>, <span className="font-bold text-amber-300">Lapangan B</span>, <span className="font-bold text-amber-300">Lapangan C</span>). Cek ketersediaan jam kosong secara realtime tanpa rasa khawatir bentrok jadwal, dilengkapi E-Ticket QR Code & konfirmasi instan!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold text-slate-300">
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-1">
              <span>✨ 3 Lapangan Nyaman</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-1">
              <span>⚡ Jadwal Realtime Anti-Bentrok</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-1">
              <span>📱 E-Ticket QR Code Instant</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-1">
              <span>💬 Notifikasi WA Admin</span>
            </span>
          </div>

        </div>
      </div>

      {/* Main Grid Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 w-full max-w-full">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 w-full max-w-full">
          
          {errorMessage && (
            <div className="p-4 bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs sm:text-sm rounded-2xl flex items-start justify-between shadow-2xl animate-fade-in ring-2 ring-rose-500/30">
              <div className="flex items-start space-x-2.5">
                <span className="text-lg leading-none">⚠️</span>
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
              <button 
                onClick={() => setErrorMessage('')} 
                className="text-rose-400 hover:text-white font-extrabold text-sm ml-3 shrink-0 p-1 hover:bg-rose-900/50 rounded-lg transition"
                title="Tutup Notifikasi"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: Pilih Lapangan (Lapangan A, B, C) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl w-full max-w-full">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs sm:text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Pilih Lapangan</h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">Pilih lapangan yang ingin disewa</p>
                </div>
              </div>
            </div>

            {/* 3 Courts Grid */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full">
              {courts.map((court) => {
                const isSelected = selectedCourt?.id === court.id;
                return (
                  <div
                    key={court.id}
                    onClick={() => {
                      setSelectedCourt(court);
                      setSelectedStartTime(null);
                    }}
                    className={`px-1 py-2.5 sm:p-5 rounded-xl sm:rounded-2xl border transition cursor-pointer text-center flex flex-col items-center justify-between min-w-0 ${
                      isSelected
                        ? 'bg-orange-950/60 border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-500 scale-[1.02]'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 text-base sm:text-2xl flex items-center justify-center mb-1 sm:mb-2">
                      🏸
                    </div>
                    <h3 className="font-extrabold text-white text-xs sm:text-lg tracking-tight whitespace-nowrap text-center">
                      {court.name}
                    </h3>
                    
                    <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-slate-800/80 w-full text-center flex flex-col items-center justify-center">
                      <span className="text-[9px] sm:text-[11px] text-slate-400 font-medium">Tarif Sewa:</span>
                      <span className="font-black text-orange-400 text-[10px] sm:text-sm tracking-tight mt-0.5 whitespace-nowrap">
                        Rp 5.000 / Orang
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Pilih Tanggal, Jumlah Pemain & Durasi Main */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl w-full max-w-full">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs sm:text-sm">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Tanggal, Pemain & Durasi</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 w-full">
              {/* Tanggal */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">Tanggal Sewa:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedStartTime(null);
                  }}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm outline-none focus:border-orange-500 transition font-semibold"
                />
              </div>

              {/* Jumlah Pemain (Orang) */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">
                  Jumlah Pemain (Orang):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={playerCount}
                    onChange={(e) => setPlayerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full pl-9 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-semibold outline-none focus:border-orange-500 transition"
                  />
                  <Users className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                </div>
                <span className="text-[10px] text-orange-400 mt-1 block font-medium">Rp 5.000 / orang</span>
              </div>

              {/* Durasi Main */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">
                  Durasi Main:
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-semibold outline-none focus:border-orange-500 transition"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h}>{h} Jam Main</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 3: Grid Jam Mulai & Ketersediaan Realtime */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl w-full max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs sm:text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Pilih Jam Mulai ({selectedCourt?.name})
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Sewa {durationHours} Jam {selectedStartTime ? `(s/d ${getEndTime(selectedStartTime, durationHours)} WIB)` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-[11px] sm:text-xs">
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-300">Kosong</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-amber-300 font-bold">Sedang Bermain</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                  <span className="text-slate-400">Terisi</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  <span className="text-slate-500">Lewat Waktu</span>
                </div>
              </div>
            </div>

            {/* Time Slot Grid Responsive */}
            {filteredSlots.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs sm:text-sm">
                Tidak ada slot jadwal yang tersedia pada tanggal ini.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
                {filteredSlots.map((slot) => {
                  const isPast = isSlotInPast(selectedDate, slot.start_time);
                  const isSelected = selectedStartTime === slot.start_time;

                  const isSlotMatchingBooking = (s, b) => {
                    if (b.status === 'cancelled') return false;

                    const isCourtMatch = (
                      b.staff_id === s.court_id ||
                      b.court_id === s.court_id ||
                      b.staff_name === s.court_name ||
                      b.court_name === s.court_name ||
                      (b.slot_ids && b.slot_ids.some(id => id.includes(s.court_id)))
                    );

                    if (!isCourtMatch) return false;

                    if (b.slot_ids && b.slot_ids.includes(s.id)) return true;
                    if (b.slot_id === s.id) return true;
                    if (b.booking_time && s.start_time) {
                      const times = b.booking_time.split('-').map(t => t.replace(/WIB/g, '').trim());
                      if (times.length >= 2) {
                        const bStartHour = parseInt(times[0].split(':')[0]);
                        const bEndHour = parseInt(times[1].split(':')[0]);
                        const slotHour = parseInt(s.start_time.split(':')[0]);
                        if (slotHour >= bStartHour && slotHour < bEndHour) return true;
                      }
                    }
                    return false;
                  };

                  // Cek apakah ada booking aktif untuk slot ini
                  const slotBooking = allBookings.find(
                    b => b.booking_date === selectedDate &&
                         (b.staff_id === selectedCourt?.id || b.court_id === selectedCourt?.id || b.staff_name === selectedCourt?.name || b.court_name === selectedCourt?.name) &&
                         b.status !== 'cancelled' &&
                         isSlotMatchingBooking(slot, b)
                  );

                  const isPlaying = slotBooking && slotBooking.status === 'playing' && selectedDate === todayStr;
                  const isBooked = (slot.status === 'booked' || (slotBooking && (slotBooking.status === 'confirmed' || slotBooking.status === 'playing'))) && !isPlaying;
                  const isAvailable = slot.status === 'available' && !isPast && !isBooked && !isPlaying;

                  return (
                    <button
                      key={slot.id}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedStartTime(slot.start_time);
                          setErrorMessage('');
                        } else if (isPlaying) {
                          setErrorMessage(`⚠️ Slot jam ${slot.start_time} WIB di ${selectedCourt?.name} sedang AKTIF BERMAIN oleh pemain lain. Slot ini tidak dapat dibooking.`);
                        } else if (isPast) {
                          setErrorMessage(`⚠️ Slot jam ${slot.start_time} WIB sudah LEWAT WAKTU untuk hari ini.`);
                        } else {
                          setErrorMessage(`🔒 Slot jam ${slot.start_time} WIB di ${selectedCourt?.name} sudah TERISI / DIBOOKING oleh pemain atau member lain. Silakan pilih jam lain yang berwarna hijau (✓ Kosong).`);
                        }
                      }}
                      className={`p-3 rounded-xl sm:rounded-2xl border text-center font-semibold text-xs sm:text-sm transition flex flex-col items-center justify-center space-y-1 ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105 ring-2 ring-orange-400 font-extrabold'
                          : isAvailable
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-400'
                          : isPlaying
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40 cursor-pointer opacity-90 shadow-sm'
                          : isPast
                          ? 'bg-slate-900/60 border-slate-800/80 text-slate-600 hover:bg-slate-900 cursor-pointer opacity-50'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300/80 hover:bg-rose-900/30 cursor-pointer opacity-80'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="font-mono text-xs sm:text-sm">{slot.start_time} WIB</span>
                      </div>

                      <span className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse'
                          : isPast
                          ? 'bg-slate-800 text-slate-500 border border-slate-700/60'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                      }`}>
                        {isSelected ? '✓ Dipilih' : isAvailable ? '✓ Kosong' : isPlaying ? '🏸 Sedang Bermain' : isPast ? '✕ Lewat Waktu' : '🔒 Terisi'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Right Column Form (Customer Form) */}
        <div className="lg:col-span-4 w-full max-w-full">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl sticky top-20 w-full max-w-full">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center justify-between">
              <span>Form Data Pemain</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </h2>

            {activeUser && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Akun Pemain: <b>{activeUser.name}</b> ({activeUser.phone})</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-tight">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="space-y-3.5">
              
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Nama Pemain Utama / Tim *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Ludfi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">No. WhatsApp Pemain *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 0895387571635"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Notifikasi booking ini dapat dikirimkan ke WhatsApp Admin GOR ({currentAdminPhone})</span>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Email (Opsional)</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="ahmad@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs sm:text-sm outline-none transition"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">Catatan Tambahan</label>
                <div className="relative">
                  <textarea
                    rows="2"
                    placeholder="Catatan tambahan..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs outline-none transition resize-none"
                  ></textarea>
                  <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Summary Card */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Lapangan:</span>
                  <span className="font-bold text-white">{selectedCourt?.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Jumlah Pemain:</span>
                  <span className="font-bold text-white">{playerCount} Orang (@ Rp 5.000)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Durasi Main:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedStartTime
                      ? `${durationHours} Jam (${selectedStartTime} s/d ${getEndTime(selectedStartTime, durationHours)} WIB)`
                      : 'Pilih jam mulai'}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-white">Total Tarif:</span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-400 text-base block">
                      Rp {Number(calculateTotalAmount()).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      ({playerCount} orang × Rp 5.000)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedStartTime}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all transform flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
                  loading || !selectedStartTime
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25 border border-orange-400/30 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {loading ? (
                  <span className="flex items-center space-x-2 text-white font-bold">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Memproses Reservasi Anda...</span>
                  </span>
                ) : (
                  <>
                    <span>Sewa Lapangan Sekarang</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

      </div>

      {/* CONFIRMATION E-TICKET MODAL CARD */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-4 sm:p-5 text-center shadow-2xl relative my-auto">
            
            <button
              onClick={() => {
                setConfirmedBooking(null);
                setSelectedStartTime(null);
                setFormData({ name: activeUser?.name || '', phone: activeUser?.phone || '', email: '', notes: '' });
              }}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-lg font-extrabold text-white mb-0.5">RESERVASI BERHASIL! 🏸</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Tunjukkan QR Tiket ini saat Anda tiba di lokasi. Anda juga dapat mengirim rincian ini ke WA Admin GOR.
            </p>

            {/* Ticket Summary Card */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-3 mb-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-[11px] text-slate-400 font-medium">Kode Booking</span>
                <span className="font-mono font-black text-emerald-400 text-base tracking-wider">{confirmedBooking.booking_code}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-900">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Pemain Utama</span>
                    <span className="font-extrabold text-white text-xs block truncate mt-0.5">{confirmedBooking.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">No. WA Pemain</span>
                    <span className="font-bold text-sky-400 font-mono text-xs block truncate mt-0.5">{confirmedBooking.customer_phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-900">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Jumlah Pemain</span>
                    <span className="font-extrabold text-emerald-400 text-xs block mt-0.5">{confirmedBooking.player_count} Orang</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Lapangan</span>
                    <span className="font-extrabold text-emerald-400 text-xs block mt-0.5">{confirmedBooking.staff_name || confirmedBooking.court_name}</span>
                  </div>
                </div>

                <div className="pb-2 border-b border-slate-900">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Jadwal Main ({confirmedBooking.duration_hours} Jam)</span>
                  <span className="font-bold text-purple-300 text-xs block mt-0.5">{confirmedBooking.booking_date} @ {confirmedBooking.booking_time} WIB</span>
                </div>

                <div className="pt-1 flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">Total Bayar</span>
                  <span className="font-black text-emerald-400 text-base font-mono">
                    Rp {Number(confirmedBooking.total_amount).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* QR Code E-Ticket Asli Terverifikasi */}
              <div className="pt-3 border-t border-slate-800 text-center space-y-2">
                <span className="text-xs font-bold text-white block">QR Code Tiket E-Ticket Pemain</span>
                <div className="p-2.5 bg-white rounded-2xl w-fit mx-auto shadow-xl border-2 border-emerald-500/40 my-1">
                  <QRCodeSVG
                    value={confirmedBooking.qr_code_token || confirmedBooking.booking_code}
                    size={160}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                  Token QR Tiket: {confirmedBooking.qr_code_token || confirmedBooking.booking_code}
                </span>
                <p className="text-[10px] text-slate-400">
                  Tunjukkan QR Code ini kepada Admin GOR saat Anda tiba di tempat untuk Check-In.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <a
                href={adminWaUrl || `https://wa.me/${currentAdminPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mx-auto">
                  <Phone className="w-4 h-4 text-slate-950 shrink-0" />
                  <span className="whitespace-nowrap">Kirim Notifikasi WA Admin</span>
                </div>
              </a>

              <button
                type="button"
                onClick={() => downloadETicketPNG(confirmedBooking)}
                className="w-full py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/20 border border-purple-400/30 transition flex items-center justify-center text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mx-auto">
                  <Download className="w-4 h-4 text-white shrink-0" />
                  <span className="whitespace-nowrap">Unduh E-Tiket (PNG)</span>
                </div>
              </button>

              <a
                href={generateGoogleCalendarUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-700 transition text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mx-auto">
                  <CalendarPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Simpan ke Google Calendar</span>
                </div>
              </a>

              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setSelectedStartTime(null);
                  setFormData({ name: activeUser?.name || '', phone: activeUser?.phone || '', email: '', notes: '' });
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Selesai & Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {showWASimulator && (
        <WhatsAppSimulator
          customerMsg=""
          adminMsg={adminWaMsg}
          customerPhone={confirmedBooking?.customer_phone}
          onClose={() => setShowWASimulator(false)}
        />
      )}

      {/* MODAL KONFIRMASI PEMESANAN LAPANGAN UNTUK USER */}
      {showBookingConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl relative my-auto space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-left">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base">Konfirmasi Data Reservasi</h3>
                  <p className="text-[10px] text-slate-400">Pastikan rincian sewa Anda sudah benar</p>
                </div>
              </div>
              <button
                onClick={() => setShowBookingConfirmModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-2.5 font-sans text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400 font-medium">Pemain</span>
                <span className="font-extrabold text-white text-xs">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400 font-medium">No. WhatsApp</span>
                <span className="font-bold text-sky-400 font-mono text-xs">{formData.phone}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400 font-medium">Lapangan</span>
                <span className="font-extrabold text-emerald-400 text-xs">{selectedCourt?.name}</span>
              </div>
              <div className="border-b border-slate-900 pb-2 space-y-0.5">
                <span className="text-slate-400 font-medium block">Jadwal & Waktu Main</span>
                <span className="font-bold text-purple-300 text-xs block">{selectedDate} @ {selectedStartTime} - {getEndTime(selectedStartTime, durationHours)} WIB</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-slate-400 font-medium">Jumlah Pemain</span>
                <span className="font-extrabold text-white text-xs">{playerCount} Orang ({durationHours} Jam)</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                <span className="text-slate-200 font-extrabold">Total Tarif</span>
                <span className="font-black text-emerald-400 text-base font-mono">Rp {calculateTotalAmount().toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowBookingConfirmModal(false)}
                className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs transition border border-slate-700 flex items-center justify-center space-x-1.5 whitespace-nowrap"
              >
                <span>✏️ Periksa Lagi</span>
              </button>
              <button
                type="button"
                onClick={handleFinalBookingSubmit}
                className="py-3 px-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-400/20 flex items-center justify-center space-x-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
                <span className="whitespace-nowrap">Ya, Sewa Sekarang</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
