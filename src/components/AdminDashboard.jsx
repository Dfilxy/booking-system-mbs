import React, { useState, useEffect } from 'react';
import {
  getBookings,
  getSlots,
  getServices,
  getCourts,
  getSettings,
  getRegisteredUsers,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  saveAdminSettings,
  toggleSlotStatusByAdmin,
  updateBookingStatus,
  updateBookingDetails,
  deleteBookingAdmin,
  deleteMultipleBookingsAdmin,
  deleteMultipleUsersAdmin,
  bookMultiHourSlotsAtomic,
  subscribeRealtimeUpdates,
  ensureSlotsForDate,
  isSessionExpired,
  logoutActiveUser
} from '../services/realtimeStore';
import AnalyticsCharts from './AnalyticsCharts';
import QRScannerModal from './QRScannerModal';
import { downloadETicketPNG } from '../services/ticketService';
import {
  Scan,
  Download,
  Lock,
  Search,
  Filter,
  PhoneCall,
  CheckCircle2,
  XCircle,
  X,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  User,
  Users,
  Trophy,
  ShieldCheck,
  UserCheck,
  KeyRound,
  CheckSquare
} from 'lucide-react';

const ADMIN_AUTH_KEY = 'rts_admin_authenticated';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginError, setLoginError] = useState('');

  // Dashboard Data State
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [courts, setCourts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [settings, setSettings] = useState({});

  // Sub Tab State: 'bookings', 'slots', 'users', 'overview', 'whatsapp' (Persist saat refresh!)
  const [adminSubTab, setAdminSubTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['bookings', 'slots', 'users', 'overview', 'whatsapp'].includes(hash)) {
      return hash;
    }
    return localStorage.getItem('rts_admin_active_subtab') || 'users';
  });

  const setAdminSubTab = (tab) => {
    setAdminSubTabState(tab);
    localStorage.setItem('rts_admin_active_subtab', tab);
    window.location.hash = tab;
  };

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // State Mode Pilih (Selection Mode Toggle)
  const [isBookingSelectMode, setIsBookingSelectMode] = useState(false);
  const [isUserSelectMode, setIsUserSelectMode] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // State Modal Admin Manual Booking Member
  const [showCreateMemberBookingModal, setShowCreateMemberBookingModal] = useState(false);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // State WhatsApp Target Admin
  const [adminPhoneInput, setAdminPhoneInput] = useState(settings.adminPhone || '08812176486');
  const [waSuccessMsg, setWaSuccessMsg] = useState('');

  // STATE & HELPER UNTUK CUSTOM BEAUTIFUL CONFIRMATION MODAL
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: null,
    confirmText: 'Ya, Lanjutkan',
    confirmVariant: 'emerald',
    onConfirm: () => {}
  });

  const triggerConfirm = ({ title, message, details, confirmText, confirmVariant, onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      details: details || null,
      confirmText: confirmText || 'Ya, Lanjutkan',
      confirmVariant: confirmVariant || 'orange',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  useEffect(() => {
    if (settings.adminPhone) {
      setAdminPhoneInput(settings.adminPhone);
    }
  }, [settings.adminPhone]);

  const handleSaveAdminPhone = (e) => {
    e.preventDefault();
    const clean = adminPhoneInput.trim().replace(/[^0-9]/g, '');
    if (!clean) return;
    const updated = { ...settings, adminPhone: clean };
    saveAdminSettings(updated);
    setSettings(updated);
    setWaSuccessMsg(`✓ Nomor WhatsApp Admin GOR berhasil diperbarui & aktif: ${clean}`);
  };

  // Helper generator tanggal berulang berdasarkan array hari yang dipilih [1,2,3,4,5]
  const getRecurringDates = (startDateStr, selectedDaysArray, durationWeeks = 4) => {
    const dates = [];
    const [y, m, d] = startDateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const totalDays = durationWeeks * 7;

    for (let i = 0; i < totalDays; i++) {
      const curr = new Date(start);
      curr.setDate(start.getDate() + i);
      const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (selectedDaysArray.includes(dayOfWeek)) {
        dates.push(dateStr);
      }
    }
    return dates;
  };

  const [memberBookingForm, setMemberBookingForm] = useState({
    customer_name: '',
    customer_phone: '',
    selected_court_ids: ['court-a'], // Bisa pilih 1, 2, atau 3 lapangan sekaligus!
    booking_date: todayStr,
    start_time: '19:00',
    duration_hours: 1,
    player_count: 4,
    custom_total_amount: 0, // Biaya paket member (Opsional / Bisa Diisi)
    notes: 'Member Tetap',
    initial_status: 'confirmed',
    is_recurring: false,
    selected_days: [0, 1, 2, 3, 4, 5, 6], // Default Semua Hari (Senin - Minggu)
    recurrence_weeks: 4
  });
  const [memberBookingError, setMemberBookingError] = useState('');

  const toggleDaySelection = (dayId) => {
    setMemberBookingForm((prev) => {
      const exists = prev.selected_days.includes(dayId);
      const newDays = exists
        ? prev.selected_days.filter((d) => d !== dayId)
        : [...prev.selected_days, dayId];
      return { ...prev, selected_days: newDays };
    });
  };

  // MODAL CONFIRMATION FOR MEMBER BOOKING
  const [showMemberConfirmModal, setShowMemberConfirmModal] = useState(false);
  const [memberConfirmSummary, setMemberConfirmSummary] = useState(null);

  const handleAdminCreateMemberBooking = (e) => {
    e.preventDefault();
    setMemberBookingError('');

    if (!memberBookingForm.customer_name.trim() || !memberBookingForm.customer_phone.trim()) {
      setMemberBookingError('Mohon isi Nama Pemain/Member dan Nomor WhatsApp.');
      return;
    }

    const targetCourts = memberBookingForm.selected_court_ids && memberBookingForm.selected_court_ids.length > 0
      ? memberBookingForm.selected_court_ids
      : ['court-a'];

    const courtNames = targetCourts.map(cId => {
      const found = courts.find(c => c.id === cId);
      return found ? found.name : cId;
    }).join(', ');

    let totalSessionsCount = 1;
    if (memberBookingForm.is_recurring) {
      if (!memberBookingForm.selected_days || memberBookingForm.selected_days.length === 0) {
        setMemberBookingError('Silakan pilih minimal 1 hari perulangan (misal: Senin, Selasa, dst).');
        return;
      }

      const targetDates = getRecurringDates(
        memberBookingForm.booking_date,
        memberBookingForm.selected_days,
        memberBookingForm.recurrence_weeks
      );

      if (targetDates.length === 0) {
        setMemberBookingError('Tidak ada tanggal yang cocok untuk perulangan hari ini.');
        return;
      }
      totalSessionsCount = targetDates.length * targetCourts.length;
    } else {
      totalSessionsCount = targetCourts.length;
    }

    setMemberConfirmSummary({
      name: memberBookingForm.customer_name,
      phone: memberBookingForm.customer_phone,
      courts: courtNames,
      startTime: memberBookingForm.start_time,
      duration: memberBookingForm.duration_hours,
      isRecurring: memberBookingForm.is_recurring,
      totalSessions: totalSessionsCount
    });

    setShowMemberConfirmModal(true);
  };

  const executeCreateMemberBooking = async () => {
    setMemberBookingError('');

    const targetCourts = memberBookingForm.selected_court_ids && memberBookingForm.selected_court_ids.length > 0
      ? memberBookingForm.selected_court_ids
      : ['court-a'];

    const memberNameFormatted = memberBookingForm.customer_name.includes('(Member)')
      ? memberBookingForm.customer_name
      : `${memberBookingForm.customer_name} (Member Rutin)`;

    let successCount = 0;
    let failCount = 0;
    const totalPackagePrice = parseInt(memberBookingForm.custom_total_amount) || 0;

    if (memberBookingForm.is_recurring) {
      const targetDates = getRecurringDates(
        memberBookingForm.booking_date,
        memberBookingForm.selected_days,
        memberBookingForm.recurrence_weeks
      );

      const recurringGroupId = `grp-member-${Date.now()}`;
      let isFirstSlot = true;

      for (const cId of targetCourts) {
        for (const dStr of targetDates) {
          ensureSlotsForDate(dStr);
          const priceForSlot = isFirstSlot ? totalPackagePrice : 0;
          isFirstSlot = false;

          const res = await bookMultiHourSlotsAtomic({
            court_id: cId,
            booking_date: dStr,
            start_time: memberBookingForm.start_time,
            duration_hours: parseInt(memberBookingForm.duration_hours),
            player_count: parseInt(memberBookingForm.player_count) || 4,
            customer_name: memberNameFormatted,
            customer_phone: memberBookingForm.customer_phone,
            customer_email: '',
            group_id: recurringGroupId,
            is_member: true,
            total_amount: priceForSlot,
            notes: `${memberBookingForm.notes || 'Jadwal Rutin Member'} [Rutin ${dStr}]`
          });

          if (res.success) {
            successCount++;
            if (memberBookingForm.initial_status === 'playing' && dStr === todayStr) {
              updateBookingStatus(res.booking.booking_code, 'playing');
            }
          } else {
            failCount++;
          }
        }
      }

      setShowMemberConfirmModal(false);
      setShowCreateMemberBookingModal(false);
      refreshDashboardData();

    } else {
      let isFirstCourt = true;
      for (const cId of targetCourts) {
        ensureSlotsForDate(memberBookingForm.booking_date);
        const priceForSlot = isFirstCourt ? totalPackagePrice : 0;
        isFirstCourt = false;

        const res = await bookMultiHourSlotsAtomic({
          court_id: cId,
          booking_date: memberBookingForm.booking_date,
          start_time: memberBookingForm.start_time,
          duration_hours: parseInt(memberBookingForm.duration_hours),
          player_count: parseInt(memberBookingForm.player_count) || 4,
          customer_name: memberNameFormatted,
          customer_phone: memberBookingForm.customer_phone,
          customer_email: '',
          is_member: true,
          total_amount: priceForSlot,
          notes: memberBookingForm.notes || 'Bookingan Member Dibuat Oleh Admin'
        });

        if (res.success) {
          successCount++;
          if (memberBookingForm.initial_status === 'playing') {
            updateBookingStatus(res.booking.booking_code, 'playing');
          }
        } else {
          failCount++;
        }
      }

      if (successCount === 0) {
        setShowMemberConfirmModal(false);
        setMemberBookingError('Gagal membuat booking: Lapangan yang dipilih sudah terisi pada jam tersebut.');
        return;
      }

      setShowMemberConfirmModal(false);
      setShowCreateMemberBookingModal(false);
      refreshDashboardData();
    }

    setMemberBookingForm({
      customer_name: '',
      customer_phone: '',
      selected_court_ids: ['court-a'],
      booking_date: todayStr,
      start_time: '19:00',
      duration_hours: 1,
      player_count: 4,
      custom_total_amount: 0,
      notes: 'Member Tetap',
      initial_status: 'confirmed',
      is_recurring: false,
      selected_days: [1, 2, 3, 4, 5],
      recurrence_weeks: 4
    });
  };
  const [selectedSlotDate, setSelectedSlotDateState] = useState(() => {
    return localStorage.getItem('rts_admin_selected_slot_date') || todayStr;
  });
  const [selectedCourtId, setSelectedCourtIdState] = useState(() => {
    return localStorage.getItem('rts_admin_selected_court_id') || 'court-a';
  });

  const setSelectedSlotDate = (dateStr) => {
    setSelectedSlotDateState(dateStr);
    localStorage.setItem('rts_admin_selected_slot_date', dateStr);
  };

  const setSelectedCourtId = (courtId) => {
    setSelectedCourtIdState(courtId);
    localStorage.setItem('rts_admin_selected_court_id', courtId);
  };

  // MODAL STATES FOR BOOKING CRUD
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // MODAL STATES FOR USER ACCOUNTS CRUD
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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

  // Forms State
  const [createForm, setCreateForm] = useState({
    court_id: 'court-a',
    booking_date: todayStr,
    start_time: '19:00',
    duration_hours: 1,
    player_count: 4,
    customer_name: '',
    customer_phone: '',
    notes: ''
  });

  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'user'
  });

  const [crudError, setCrudError] = useState('');

  const refreshDashboardData = () => {
    setBookings(getBookings());
    setSlots(getSlots(selectedSlotDate));
    setCourts(getCourts());
    setUsersList(getRegisteredUsers());
    setSettings(getSettings());
  };

  useEffect(() => {
    const checkAuth = () => {
      if (isSessionExpired()) {
        setIsAuthenticated(false);
        logoutActiveUser();
        return;
      }
      const isAuth = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true' ||
                     sessionStorage.getItem('rts_admin_authenticated') === 'true' ||
                     localStorage.getItem('rts_admin_authenticated_v14') === 'true';
      if (isAuth) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    refreshDashboardData();

    const unsub = subscribeRealtimeUpdates(() => {
      checkAuth();
      refreshDashboardData();
    });

    return () => unsub();
  }, [selectedSlotDate]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginForm.password === 'gormbs23' || loginForm.password === 'admin123' || loginForm.password === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      sessionStorage.setItem('rts_admin_authenticated', 'true');
      localStorage.setItem('rts_admin_authenticated_v14', 'true');
      setLoginError('');
    } else {
      setLoginError('Password admin salah. Silakan periksa kembali password Anda.');
    }
  };

  // --- CRUD BOOKINGS ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCrudError('');

    if (!createForm.customer_name.trim() || !createForm.customer_phone.trim()) {
      setCrudError('Mohon isi Nama Pemain dan No. WhatsApp.');
      return;
    }

    triggerConfirm({
      title: '📋 Tambah Booking Manual',
      message: `Konfirmasi pembuatan booking manual baru untuk lokasi GOR.`,
      confirmVariant: 'emerald',
      confirmText: '✓ Tambah Booking',
      details: [
        { label: 'Nama Pemain', value: createForm.customer_name },
        { label: 'No. WhatsApp', value: createForm.customer_phone },
        { label: 'Tanggal & Jam', value: `${createForm.booking_date} @ ${createForm.start_time} WIB` }
      ],
      onConfirm: async () => {
        const result = await bookMultiHourSlotsAtomic(createForm);
        if (!result.success) {
          setCrudError(result.error);
          return;
        }

        setShowCreateModal(false);
        setCreateForm({
          court_id: 'court-a',
          booking_date: todayStr,
          start_time: '19:00',
          duration_hours: 1,
          player_count: 4,
          customer_name: '',
          customer_phone: '',
          notes: ''
        });
        refreshDashboardData();
      }
    });
  };

  const handleOpenEdit = (booking) => {
    setEditingBooking({ ...booking });
    setCrudError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    triggerConfirm({
      title: '✏️ Simpan Perubahan Booking',
      message: `Apakah Anda yakin ingin menyimpan perubahan data reservasi ini?`,
      confirmVariant: 'orange',
      confirmText: '✓ Simpan Perubahan',
      details: [
        { label: 'Kode Booking', value: editingBooking.booking_code },
        { label: 'Nama Pemain', value: editingBooking.customer_name },
        { label: 'Status', value: (editingBooking.status || 'confirmed').toUpperCase() }
      ],
      onConfirm: () => {
        const res = updateBookingDetails(editingBooking.id, {
          customer_name: editingBooking.customer_name,
          customer_phone: editingBooking.customer_phone,
          player_count: editingBooking.player_count,
          status: editingBooking.status,
          notes: editingBooking.notes
        });

        if (!res.success) {
          setCrudError(res.error);
          return;
        }

        setShowEditModal(false);
        setEditingBooking(null);
        refreshDashboardData();
      }
    });
  };

  const handleDeleteBooking = (bookingId, bookingCode) => {
    const targetBooking = bookings.find(b => b.id === bookingId || b.booking_code === bookingCode);
    const playerName = targetBooking ? targetBooking.customer_name : 'Pemain';

    triggerConfirm({
      title: '🗑️ Hapus Booking Reservasi',
      message: `Apakah Anda yakin ingin MENGHAPUS reservasi ini secara permanen? Slot waktu terkait akan dibebaskan kembali.`,
      confirmVariant: 'rose',
      confirmText: '✕ Ya, Hapus Booking',
      details: [
        { label: 'Nama Pemain', value: playerName },
        { label: 'Kode Booking', value: bookingCode }
      ],
      onConfirm: () => {
        const res = deleteBookingAdmin(bookingId);
        if (res.success) refreshDashboardData();
      }
    });
  };

  // --- CRUD USER ACCOUNTS (PEMAIN & USER ADMIN - ASYNC WITH SHA-256) ---
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCrudError('');

    if (!createUserForm.name.trim() || !createUserForm.phone.trim() || !createUserForm.password.trim()) {
      setCrudError('Mohon lengkapi Nama, No. WhatsApp, dan Password.');
      return;
    }

    triggerConfirm({
      title: '👤 Tambah Akun Pemain Baru',
      message: `Konfirmasi pendaftaran akun pemain baru di sistem.`,
      confirmVariant: 'emerald',
      confirmText: '✓ Buat Akun',
      details: [
        { label: 'Nama Lengkap', value: createUserForm.name },
        { label: 'No. WhatsApp', value: createUserForm.phone },
        { label: 'Role Hak Akses', value: (createUserForm.role || 'user').toUpperCase() }
      ],
      onConfirm: async () => {
        const res = await createUserAdmin(createUserForm);
        if (!res.success) {
          setCrudError(res.error);
          return;
        }

        setShowCreateUserModal(false);
        setCreateUserForm({ name: '', phone: '', password: '', role: 'user' });
        refreshDashboardData();
      }
    });
  };

  const handleOpenEditUser = (userObj) => {
    setEditingUser({ ...userObj, password: '' });
    setCrudError('');
    setShowEditUserModal(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    triggerConfirm({
      title: '✏️ Simpan Perubahan Akun',
      message: `Apakah Anda yakin ingin menyimpan perubahan data akun pemain ini?`,
      confirmVariant: 'orange',
      confirmText: '✓ Simpan Akun',
      details: [
        { label: 'Nama Akun', value: editingUser.name },
        { label: 'No. WhatsApp', value: editingUser.phone },
        { label: 'Role Hak Akses', value: (editingUser.role || 'user').toUpperCase() }
      ],
      onConfirm: async () => {
        const res = await updateUserAdmin(editingUser.id, {
          name: editingUser.name,
          phone: editingUser.phone,
          password: editingUser.password,
          role: editingUser.role
        });

        if (!res.success) {
          setCrudError(res.error);
          return;
        }

        setShowEditUserModal(false);
        setEditingUser(null);
        refreshDashboardData();
      }
    });
  };

  const handleDeleteUser = (userId, userName) => {
    triggerConfirm({
      title: '🗑️ Hapus Akun Pemain',
      message: `Apakah Anda yakin ingin MENGHAPUS akun pemain ini? User tersebut tidak akan bisa login lagi ke website.`,
      confirmVariant: 'rose',
      confirmText: '✕ Ya, Hapus Akun',
      details: [
        { label: 'Nama Pemain', value: userName }
      ],
      onConfirm: () => {
        const res = deleteUserAdmin(userId);
        if (res.success) refreshDashboardData();
      }
    });
  };

  // --- BULK SELECTION & DELETE HANDLERS ---
  const toggleSelectBooking = (id) => {
    setSelectedBookingIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBookings = (filteredList) => {
    if (selectedBookingIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(filteredList.map(b => b.id));
    }
  };

  const handleBulkDeleteBookings = () => {
    if (selectedBookingIds.length === 0) return;
    triggerConfirm({
      title: '⚠️ Hapus Masal Booking Terpilih',
      message: `Apakah Anda yakin ingin MENGHAPUS ${selectedBookingIds.length} booking terpilih secara permanen? Slot waktu terkait akan dibebaskan kembali.`,
      confirmVariant: 'rose',
      confirmText: `✕ Hapus ${selectedBookingIds.length} Booking`,
      onConfirm: () => {
        const res = deleteMultipleBookingsAdmin(selectedBookingIds);
        if (res.success) {
          setSelectedBookingIds([]);
          refreshDashboardData();
        }
      }
    });
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUsers = (filteredList) => {
    if (selectedUserIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredList.map(u => u.id));
    }
  };

  const handleBulkDeleteUsers = () => {
    if (selectedUserIds.length === 0) return;
    triggerConfirm({
      title: '⚠️ Hapus Masal Akun Pemain',
      message: `Apakah Anda yakin ingin MENGHAPUS ${selectedUserIds.length} akun pemain terpilih secara permanen?`,
      confirmVariant: 'rose',
      confirmText: `✕ Hapus ${selectedUserIds.length} Akun`,
      onConfirm: () => {
        const res = deleteMultipleUsersAdmin(selectedUserIds);
        if (res.success) {
          setSelectedUserIds([]);
          refreshDashboardData();
        }
      }
    });
  };

  const handleDeleteGroupBookings = (grp) => {
    triggerConfirm({
      title: '🗑️ Hapus Paket Rutin Member',
      message: `Apakah Anda yakin ingin MENGHAPUS SELURUH ${grp.items.length} sesi jadwal rutin member ini? Seluruh slot jam terkait akan dibebaskan kembali.`,
      confirmVariant: 'rose',
      confirmText: '✕ Ya, Hapus Paket',
      details: [
        { label: 'Member', value: grp.customer_name },
        { label: 'Total Sesi', value: `${grp.items.length} Sesi Terjadwal` }
      ],
      onConfirm: () => {
        const idsToDelete = grp.items.map(b => b.id);
        const res = deleteMultipleBookingsAdmin(idsToDelete);
        if (res.success) refreshDashboardData();
      }
    });
  };

  // Quick Action: Check-In (Sedang Bermain)
  const handleCheckInPlayer = (bookingCode) => {
    const targetBooking = bookings.find(b => b.booking_code === bookingCode);
    const playerName = targetBooking ? targetBooking.customer_name : 'Pemain';
    const courtName = targetBooking ? (targetBooking.court_name || targetBooking.staff_name) : 'Lapangan';
    const timeStr = targetBooking ? targetBooking.booking_time : '';

    triggerConfirm({
      title: '🏸 Check-In Pemain GOR',
      message: `Konfirmasi kedatangan pemain di lokasi GOR untuk mengubah status menjadi SEDANG BERMAIN.`,
      confirmVariant: 'emerald',
      confirmText: '✓ Ya, Check-In Sekarang',
      details: [
        { label: 'Nama Pemain', value: playerName },
        { label: 'Kode Booking', value: bookingCode },
        { label: 'Jadwal Main', value: `${courtName} (${timeStr} WIB)` }
      ],
      onConfirm: () => {
        const res = updateBookingStatus(bookingCode, 'playing');
        if (res.success) refreshDashboardData();
      }
    });
  };

  // Quick Action: Check-In untuk Sesi Member Hari Ini
  const handleCheckInGroup = (groupItem) => {
    if (!groupItem.is_group) {
      handleCheckInPlayer(groupItem.booking_code);
      return;
    }
    let targetSessions = groupItem.items.filter(i => i.booking_date === todayStr && i.status === 'confirmed');

    if (targetSessions.length === 0) {
      triggerConfirm({
        title: '⚠️ Belum Waktunya Check-In',
        message: `Tidak ada jadwal main untuk member [${groupItem.customer_name}] pada HARI INI (${todayStr}). Check-In hanya dapat dilakukan pada hari H jadwal bermain.`,
        confirmVariant: 'orange',
        confirmText: 'Mengerti',
        onConfirm: () => {}
      });
      return;
    }

    const dateTag = targetSessions[0].booking_date;
    const courtTag = Array.from(new Set(targetSessions.map(s => s.court_name || s.staff_name))).join(', ');
    
    triggerConfirm({
      title: '🏸 Check-In Sesi Member Hari Ini',
      message: `Konfirmasi kedatangan member untuk sesi hari ini. Status akan diubah menjadi SEDANG BERMAIN.`,
      confirmVariant: 'emerald',
      confirmText: '✓ Ya, Check-In Member',
      details: [
        { label: 'Nama Member', value: groupItem.customer_name },
        { label: 'Tanggal Main', value: dateTag },
        { label: 'Lapangan', value: courtTag }
      ],
      onConfirm: () => {
        targetSessions.forEach(s => {
          updateBookingStatus(s.booking_code, 'playing');
        });
        refreshDashboardData();
      }
    });
  };

  // Quick Action: Selesai Main untuk Paket Member
  const handleCompleteGroup = (groupItem) => {
    if (!groupItem.is_group) {
      handleCompleteMatch(groupItem.booking_code);
      return;
    }
    const playingSessions = groupItem.items.filter(i => i.status === 'playing');

    if (playingSessions.length === 0) {
      triggerConfirm({
        title: 'ℹ️ Tidak Ada Sesi Aktif',
        message: `Tidak ada sesi yang sedang bermain saat ini dalam paket member [${groupItem.customer_name}].`,
        confirmVariant: 'orange',
        confirmText: 'Mengerti',
        onConfirm: () => {}
      });
      return;
    }
    const dateTag = playingSessions.map(s => s.booking_date).join(', ');
    const courtTag = playingSessions[0].court_name || playingSessions[0].staff_name || '';

    triggerConfirm({
      title: '✅ Tandai Selesai Main Member',
      message: `Konfirmasi bahwa sesi bermain member ini telah selesai.`,
      confirmVariant: 'orange',
      confirmText: '✓ Ya, Selesai Main',
      details: [
        { label: 'Nama Member', value: groupItem.customer_name },
        { label: 'Lapangan', value: courtTag },
        { label: 'Tanggal', value: dateTag }
      ],
      onConfirm: () => {
        playingSessions.forEach(s => {
          updateBookingStatus(s.booking_code, 'completed');
        });
        setBookings(getBookings());
        setSlots(getSlots(selectedSlotDate));
      }
    });
  };

  // Ubah / Set Nominal Biaya Paket Member
  const handleUpdateMemberPackageFee = (groupItem) => {
    const currentFee = groupItem.is_group && groupItem.items
      ? groupItem.items.reduce((sum, i) => sum + (i.total_amount || 0), 0)
      : (groupItem.total_amount || 0);

    const inputVal = window.prompt(
      `Masukkan Nominal Biaya Paket Member (Rp) untuk [${groupItem.customer_name}]:\n(Isi 0 jika member gratis / flat)`,
      currentFee ? currentFee.toString() : '0'
    );

    if (inputVal !== null) {
      const newFee = parseInt(inputVal.trim()) || 0;
      if (groupItem.is_group && groupItem.items && groupItem.items.length > 0) {
        const firstItem = groupItem.items[0];
        updateBookingDetails(firstItem.id, { total_amount: newFee });
        for (let k = 1; k < groupItem.items.length; k++) {
          updateBookingDetails(groupItem.items[k].id, { total_amount: 0 });
        }
      } else {
        updateBookingDetails(groupItem.id, { total_amount: newFee });
      }
      refreshDashboardData();
    }
  };

  // Quick Action: Selesai Main
  const handleCompleteMatch = (bookingCode) => {
    const targetBooking = bookings.find(b => b.booking_code === bookingCode);
    const playerName = targetBooking ? targetBooking.customer_name : 'Pemain';

    triggerConfirm({
      title: '✅ Tandai Selesai Main',
      message: `Konfirmasi bahwa sesi bermain pemain ini telah selesai.`,
      confirmVariant: 'orange',
      confirmText: '✓ Ya, Selesai Main',
      details: [
        { label: 'Nama Pemain', value: playerName },
        { label: 'Kode Booking', value: bookingCode }
      ],
      onConfirm: () => {
        const res = updateBookingStatus(bookingCode, 'completed');
        if (res.success) refreshDashboardData();
      }
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('Belum ada data reservasi untuk di-export.');
      return;
    }

    const headers = ['Kode Booking', 'Tanggal', 'Jam', 'Lapangan', 'Nama Pemain', 'No WA', 'Pemain', 'Total Tarif', 'Status'];
    const rows = bookings.map(b => [
      b.booking_code,
      b.booking_date,
      b.booking_time,
      b.court_name || b.staff_name,
      `"${b.customer_name}"`,
      `"${b.customer_phone}"`,
      b.player_count,
      b.total_amount,
      b.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Booking_GOR_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters
  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.customer_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.booking_code?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.customer_phone?.includes(searchFilter);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [expandedGroupIds, setExpandedGroupIds] = useState([]);

  const toggleExpandGroup = (grpKey) => {
    setExpandedGroupIds(prev =>
      prev.includes(grpKey) ? prev.filter(k => k !== grpKey) : [...prev, grpKey]
    );
  };



  // Grouping Engine: Menggabungkan jadwal member rutin berulang menjadi 1 Single List Item!
  const processedBookingsList = React.useMemo(() => {
    const groupsMap = new Map();
    const resultList = [];

    filteredBookings.forEach(b => {
      const isMemberBkg = b.total_amount === 0 || b.is_member || b.customer_name?.toLowerCase().includes('member') || b.notes?.toLowerCase().includes('member') || b.group_id;

      const groupKey = b.group_id || (isMemberBkg && b.customer_name?.includes('(Member') ? `grp-${b.customer_name}-${b.customer_phone}-${b.booking_time}` : null);

      if (groupKey) {
        if (!groupsMap.has(groupKey)) {
          const newGrp = {
            is_group: true,
            group_key: groupKey,
            customer_name: b.customer_name,
            customer_phone: b.customer_phone,
            court_name: b.court_name || b.staff_name,
            booking_time: b.booking_time,
            items: [b],
            start_date: b.booking_date,
            end_date: b.booking_date,
            booking_code: b.booking_code
          };
          groupsMap.set(groupKey, newGrp);
          resultList.push(newGrp);
        } else {
          const grp = groupsMap.get(groupKey);
          grp.items.push(b);
          if (b.booking_date < grp.start_date) grp.start_date = b.booking_date;
          if (b.booking_date > grp.end_date) grp.end_date = b.booking_date;
        }
      } else {
        resultList.push({ is_group: false, ...b });
      }
    });

    return resultList.map(item => {
      if (item.is_group && item.items.length === 1) {
        return { is_group: false, ...item.items[0] };
      }
      return item;
    });
  }, [filteredBookings]);

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
    u.phone?.includes(userSearchFilter)
  );

  ensureSlotsForDate(selectedSlotDate);
  const filteredSlots = slots.filter(
    s => s.slot_date === selectedSlotDate && s.court_id === selectedCourtId
  );



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard Admin GOR
            </h1>
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap shrink-0">
              Session Active
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Kelola slot jadwal, reservasi pemain, akun pengguna & WhatsApp Gateway
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowCreateMemberBookingModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Booking Member</span>
          </button>

          <button
            onClick={() => setShowQRScanner(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition"
          >
            <Scan className="w-4 h-4" />
            <span>Scan QR</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-slate-400 text-xs font-medium">Total Reservasi</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">{bookings.length}</p>
          <span className="text-[10px] text-emerald-400 mt-1 block">Tercatat di Database</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-slate-400 text-xs font-medium">Akun Terdaftar</p>
          <p className="text-2xl sm:text-3xl font-black text-indigo-400 mt-1">{usersList.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Pemain / User Web</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-slate-400 text-xs font-medium">Estimasi Omset</p>
          <p className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
            Rp {bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-purple-300 mt-1 block">Terkonfirmasi</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-slate-400 text-xs font-medium">Total Slot Aktif</p>
          <p className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">
            {slots.filter(s => s.status === 'available').length}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Slot Waktu Terbuka</span>
        </div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="border-b border-slate-800 flex space-x-6 overflow-x-auto pb-1">
        <button
          onClick={() => setAdminSubTab('bookings')}
          className={`pb-3 text-sm font-bold border-b-2 transition shrink-0 flex items-center space-x-2 ${
            adminSubTab === 'bookings'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Daftar Booking (CRUD)</span>
        </button>

        <button
          onClick={() => setAdminSubTab('users')}
          className={`pb-3 text-sm font-bold border-b-2 transition shrink-0 flex items-center space-x-2 ${
            adminSubTab === 'users'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Akun Pemain (Users CRUD)</span>
        </button>

        <button
          onClick={() => setAdminSubTab('slots')}
          className={`pb-3 text-sm font-bold border-b-2 transition shrink-0 flex items-center space-x-2 ${
            adminSubTab === 'slots'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Kelola Jadwal Slot</span>
        </button>

        <button
          onClick={() => setAdminSubTab('overview')}
          className={`pb-3 text-sm font-bold border-b-2 transition shrink-0 flex items-center space-x-2 ${
            adminSubTab === 'overview'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Analitik & Charts</span>
        </button>

        <button
          onClick={() => setAdminSubTab('whatsapp')}
          className={`pb-3 text-sm font-bold border-b-2 transition shrink-0 flex items-center space-x-2 ${
            adminSubTab === 'whatsapp'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>WhatsApp Target Admin</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR BOOKING CRUD */}
      {adminSubTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Cari Kode Booking, Nama Pemain, atau No WA..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm outline-none focus:border-purple-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl px-3 py-2 outline-none w-full sm:w-auto"
                >
                  <option value="all">Semua Status</option>
                  <option value="confirmed">Terkonfirmasi</option>
                  <option value="completed">Selesai / Checked-In</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!isBookingSelectMode ? (
                <button
                  onClick={() => setIsBookingSelectMode(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  title="Aktifkan mode pilih untuk menghapus banyak booking sekaligus"
                >
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                  <span>Pilih</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleSelectAllBookings(filteredBookings)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  >
                    <span>{selectedBookingIds.length === filteredBookings.length && filteredBookings.length > 0 ? '✕ Batal Pilih Semua' : '✓ Pilih Semua'}</span>
                  </button>

                  {selectedBookingIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteBookings}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition animate-pulse shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus ({selectedBookingIds.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsBookingSelectMode(false);
                      setSelectedBookingIds([]);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition whitespace-nowrap shrink-0"
                  >
                    Selesai
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Booking Manual</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold border-b border-slate-800">
                  <tr>
                    {isBookingSelectMode && (
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          title="Pilih Semua Booking"
                          checked={filteredBookings.length > 0 && selectedBookingIds.length === filteredBookings.length}
                          onChange={() => toggleSelectAllBookings(filteredBookings)}
                          className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-4">Kode & Tanggal</th>
                    <th className="p-4">Lapangan & Jam</th>
                    <th className="p-4">Pemain / No WA</th>
                    <th className="p-4">Pemain & Tarif</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedBookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={isBookingSelectMode ? 7 : 6} className="p-8 text-center text-slate-500">
                        Tidak ada data reservasi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    processedBookingsList.map((item) => {
                      if (item.is_group) {
                        const isExpanded = expandedGroupIds.includes(item.group_key);
                        return (
                          <React.Fragment key={item.group_key}>
                            {/* BARIS UTAMA GROUP SUMMARY UNTUK MEMBER RUTIN BERULANG */}
                            <tr className="hover:bg-slate-850 border-b border-slate-800/80 transition bg-slate-900/90 border-l-4 border-l-amber-500">
                              {isBookingSelectMode && (
                                <td className="p-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.items.every(i => selectedBookingIds.includes(i.id))}
                                    onChange={() => {
                                      const groupIds = item.items.map(i => i.id);
                                      const allSelected = groupIds.every(id => selectedBookingIds.includes(id));
                                      if (allSelected) {
                                        setSelectedBookingIds(prev => prev.filter(id => !groupIds.includes(id)));
                                      } else {
                                        setSelectedBookingIds(prev => Array.from(new Set([...prev, ...groupIds])));
                                      }
                                    }}
                                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider block w-max mb-1">
                                  PAKET MEMBER RUTIN
                                </span>
                                <p className="font-mono text-xs text-slate-300 font-bold">
                                  {item.start_date === item.end_date ? item.start_date : `${item.start_date} s/d ${item.end_date}`}
                                </p>
                                {(() => {
                                  const daySet = new Set(item.items.map(i => {
                                    const [y, m, d] = i.booking_date.split('-').map(Number);
                                    return new Date(y, m - 1, d).getDay();
                                  }));
                                  const hasSat = daySet.has(6);
                                  const hasSun = daySet.has(0);
                                  const isWorkdaysOnly = !hasSat && !hasSun;
                                  return (
                                    <span className={`text-[10px] font-bold block mt-0.5 ${isWorkdaysOnly ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {isWorkdaysOnly ? '📅 Rutin Senin - Jumat (Weekend Libur)' : '📅 Rutin Setiap Hari (Termasuk Weekend)'}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="p-4">
                                <p className="font-bold text-white">
                                  {Array.from(new Set(item.items.map(i => i.court_name || i.staff_name))).join(', ')}
                                </p>
                                <p className="text-[11px] text-emerald-400 font-medium">{item.booking_time} WIB</p>
                              </td>
                              <td className="p-4">
                                <p className="font-bold text-amber-300">{item.customer_name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{item.customer_phone}</p>
                              </td>
                              <td className="p-4">
                                {(() => {
                                  const groupTotal = item.items.reduce((sum, i) => sum + (i.total_amount || 0), 0);
                                  return (
                                    <div className="flex items-center space-x-2">
                                      {groupTotal > 0 ? (
                                        <div>
                                          <p className="font-extrabold text-emerald-400 text-sm font-mono">Rp {groupTotal.toLocaleString('id-ID')}</p>
                                          <span className="text-[10px] text-emerald-300/80 font-semibold block">Paket Member ({item.items.length} Sesi)</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="font-extrabold text-amber-400 text-sm font-mono">-</p>
                                          <span className="text-[10px] text-amber-300/80 font-semibold block">{item.items.length} Sesi Terjadwal</span>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleUpdateMemberPackageFee(item)}
                                        title="Edit / Set Nominal Biaya Member Ini"
                                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs transition shrink-0"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="p-4">
                                {(() => {
                                  // Cek semua sesi dalam paket — tanpa filter tanggal
                                  const hasPlaying = item.items.some(i => i.status === 'playing');
                                  const allCompleted = item.items.every(i => i.status === 'completed' || i.status === 'cancelled');

                                  if (hasPlaying) {
                                    return (
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap inline-flex items-center animate-pulse">
                                        🏸 Sedang Bermain
                                      </span>
                                    );
                                  } else if (allCompleted) {
                                    return (
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap inline-flex items-center">
                                        ✓ Selesai Main
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap inline-flex items-center">
                                        🗓️ Paket Rutin ({item.items.length} Sesi)
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center space-x-2">
                                  {(() => {
                                    // Cek semua sesi dalam paket — tanpa filter tanggal
                                    const hasPlaying = item.items.some(i => i.status === 'playing');
                                    const allCompleted = item.items.every(i => i.status === 'completed' || i.status === 'cancelled');

                                    if (hasPlaying) {
                                      return (
                                        <button
                                          onClick={() => handleCompleteGroup(item)}
                                          title="Tandai Sesi Main Selesai"
                                          className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap shrink-0"
                                        >
                                          <span>✅ Selesai</span>
                                        </button>
                                      );
                                    } else if (!allCompleted) {
                                      return (
                                        <button
                                          onClick={() => handleCheckInGroup(item)}
                                          title="Check-In Sesi Main (Sedang Bermain)"
                                          className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap shrink-0"
                                        >
                                          <span>🏸 Check-In</span>
                                        </button>
                                      );
                                    } else {
                                      return (
                                        <span className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-950 rounded-lg border border-slate-800">
                                          ✓ Selesai
                                        </span>
                                      );
                                    }
                                  })()}

                                  <button
                                    onClick={() => toggleExpandGroup(item.group_key)}
                                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap shrink-0"
                                  >
                                    <span>{isExpanded ? '▲ Sembunyikan' : `▼ Detail (${item.items.length})`}</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteGroupBookings(item)}
                                    title="Hapus Seluruh Paket Rutin Member Ini"
                                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* BARIS SUB-SESI YANG DISERTAKAN KETIKA EXPANDED */}
                            {isExpanded && item.items.map((b) => (
                              <tr key={b.id} className="bg-slate-950/60 hover:bg-slate-900/60 border-l-2 border-slate-700 transition text-slate-400 text-xs">
                                {isBookingSelectMode && (
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedBookingIds.includes(b.id)}
                                      onChange={() => toggleSelectBooking(b.id)}
                                      className="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer"
                                    />
                                  </td>
                                )}
                                <td className="py-2.5 px-4 pl-8">
                                  <p className="font-mono text-[11px] text-purple-400 font-semibold">{b.booking_code}</p>
                                  <p className="text-[11px] text-slate-300 font-semibold">{b.booking_date}</p>
                                </td>
                                <td className="py-2.5 px-4">
                                  <p className="text-slate-300">{b.court_name || b.staff_name}</p>
                                  <p className="text-[11px] text-emerald-400">{b.booking_time} WIB</p>
                                </td>
                                <td className="py-2.5 px-4">
                                  <p className="text-slate-300">{b.customer_name}</p>
                                </td>
                                <td className="py-2.5 px-4">
                                  <p className="font-bold text-amber-400 text-sm font-mono">-</p>
                                </td>
                                <td className="py-2.5 px-4">
                                  {b.status === 'confirmed' && <span className="text-[10px] font-bold text-amber-400">⏳ Terkonfirmasi</span>}
                                  {b.status === 'playing' && <span className="text-[10px] font-bold text-emerald-400">🏸 Sedang Bermain</span>}
                                  {b.status === 'completed' && <span className="text-[10px] font-bold text-slate-400">✓ Selesai</span>}
                                  {b.status === 'cancelled' && <span className="text-[10px] font-bold text-rose-400">✕ Dibatalkan</span>}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <div className="flex items-center justify-center space-x-1.5">
                                    {b.status === 'confirmed' && (
                                      <button
                                        onClick={() => handleCheckInPlayer(b.booking_code)}
                                        className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                                      >
                                        Check-In
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteBooking(b.id, b.booking_code)}
                                      className="p-1 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30"
                                      title="Hapus Sesi Ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      }

                      // ITEM SINGLE NON-MEMBER / REGULER BOOKING
                      const b = item;
                      return (
                        <tr key={b.id} className={`hover:bg-slate-800/40 transition ${selectedBookingIds.includes(b.id) ? 'bg-purple-950/30' : ''}`}>
                          {isBookingSelectMode && (
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedBookingIds.includes(b.id)}
                                onChange={() => toggleSelectBooking(b.id)}
                                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-4">
                            <p className="font-mono font-bold text-purple-400">{b.booking_code}</p>
                            <p className="text-[11px] text-slate-400">{b.booking_date}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-white">{b.court_name || b.staff_name}</p>
                            <p className="text-[11px] text-emerald-400 font-medium">{b.booking_time} WIB</p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-100">{b.customer_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{b.customer_phone}</p>
                          </td>
                          <td className="p-4">
                            {b.total_amount > 0 ? (
                              <div className="flex items-center space-x-2">
                                <div>
                                  {b.customer_name?.toLowerCase().includes('member') ? (
                                    <span className="text-[10px] text-emerald-300 font-bold block">Member</span>
                                  ) : (
                                    <p className="font-bold text-white text-xs">{b.player_count} orang</p>
                                  )}
                                  <p className="font-extrabold text-emerald-400 text-sm font-mono">
                                    Rp {(b.total_amount || 0).toLocaleString('id-ID')}
                                  </p>
                                </div>
                                {(b.is_member || b.customer_name?.toLowerCase().includes('member')) && (
                                  <button
                                    onClick={() => handleUpdateMemberPackageFee(b)}
                                    title="Edit Nominal Biaya Member Ini"
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition shrink-0"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (b.is_member || b.customer_name?.toLowerCase().includes('member') || b.notes?.toLowerCase().includes('member')) ? (
                              <div className="flex items-center space-x-2">
                                <div>
                                  <p className="font-extrabold text-amber-400 text-sm font-mono">-</p>
                                  <span className="text-[10px] text-amber-300/80 font-semibold block">Member Gratis</span>
                                </div>
                                <button
                                  onClick={() => handleUpdateMemberPackageFee(b)}
                                  title="Edit / Set Nominal Biaya Member Ini"
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition shrink-0"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="font-bold text-white">{b.player_count} orang</p>
                                <p className="text-[11px] text-purple-300 font-bold">
                                  Rp {(b.total_amount || 0).toLocaleString('id-ID')}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="p-4">
                            {b.status === 'confirmed' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap inline-flex items-center">
                                ⏳ Terkonfirmasi
                              </span>
                            )}
                            {b.status === 'playing' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center space-x-1 animate-pulse whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                <span>🏸 Sedang Bermain</span>
                              </span>
                            )}
                            {b.status === 'completed' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap inline-flex items-center">
                                ✓ Selesai
                              </span>
                            )}
                            {b.status === 'cancelled' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap inline-flex items-center">
                                ✕ Dibatalkan
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center space-x-2">
                              {b.status === 'confirmed' && (
                                <button
                                  onClick={() => handleCheckInPlayer(b.booking_code)}
                                  title="Klik saat pemain sudah datang ke lokasi GOR untuk mulai bermain"
                                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm whitespace-nowrap shrink-0"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Check-In</span>
                                </button>
                              )}
                              {b.status === 'playing' && (
                                <button
                                  onClick={() => handleCompleteMatch(b.booking_code)}
                                  title="Tandai sesi main pemain ini telah selesai"
                                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition shadow-sm whitespace-nowrap shrink-0"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Tandai Selesai</span>
                                </button>
                              )}
                              <button
                                onClick={() => downloadETicketPNG(b)}
                                title="Unduh Struk / E-Tiket (PNG)"
                                className="p-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(b)}
                                title="Edit Detail Booking"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(b.id, b.booking_code)}
                                title="Hapus Booking"
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA AKUN PEMAIN / USERS (FULL CRUD BY ADMIN) */}
      {adminSubTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari Nama Pemain atau No. WhatsApp..."
                value={userSearchFilter}
                onChange={(e) => setUserSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm outline-none focus:border-purple-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center space-x-2">
              {!isUserSelectMode ? (
                <button
                  onClick={() => setIsUserSelectMode(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  title="Aktifkan mode pilih untuk menghapus banyak akun sekaligus"
                >
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                  <span>Pilih</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleSelectAllUsers(filteredUsers)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  >
                    <span>{selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? '✕ Batal Pilih Semua' : '✓ Pilih Semua'}</span>
                  </button>

                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteUsers}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition animate-pulse shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus ({selectedUserIds.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsUserSelectMode(false);
                      setSelectedUserIds([]);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition whitespace-nowrap shrink-0"
                  >
                    Selesai
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setCrudError('');
                  setShowCreateUserModal(true);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Akun Pemain Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold border-b border-slate-800">
                  <tr>
                    {isUserSelectMode && (
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          title="Pilih Semua Akun"
                          checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                          onChange={() => toggleSelectAllUsers(filteredUsers)}
                          className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-4">Nama Lengkap Pemain</th>
                    <th className="p-4">No. WhatsApp / Username</th>
                    <th className="p-4">Password</th>
                    <th className="p-4">Role Akses</th>
                    <th className="p-4">Tanggal Daftar</th>
                    <th className="p-4 text-center">Aksi (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isUserSelectMode ? 7 : 6} className="p-8 text-center text-slate-500">
                        Belum ada akun pemain terdaftar yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => (
                      <tr key={usr.id} className={`hover:bg-slate-800/40 transition ${selectedUserIds.includes(usr.id) ? 'bg-purple-950/30' : ''}`}>
                        {isUserSelectMode && (
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(usr.id)}
                              onChange={() => toggleSelectUser(usr.id)}
                              className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4 font-bold text-white flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{usr.name}</span>
                        </td>
                        <td className="p-4 font-mono text-emerald-400 font-semibold">{usr.phone}</td>
                        <td className="p-4 font-mono text-slate-400">
                          <span className="flex items-center space-x-1" title="Disimpan secara aman dengan Hash SHA-256">
                            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[11px] text-purple-300 font-semibold">🔒 SHA-256 (Terenkripsi)</span>
                          </span>
                        </td>
                        <td className="p-4">
                          {usr.role === 'admin' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              User
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[11px] text-slate-400">
                          {usr.created_at ? new Date(usr.created_at).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(usr)}
                              title="Edit Akun"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(usr.id, usr.name)}
                              title="Hapus Akun"
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

  {/* TAB 3: KELOLA JADWAL SLOT (PER TANGGAL & LAPANGAN) */}
  {adminSubTab === 'slots' && (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <label className="block text-xs font-semibold text-slate-300">Pilih Tanggal Jadwal:</label>
              <input
                type="date"
                value={selectedSlotDate}
                onChange={(e) => setSelectedSlotDate(e.target.value)}
                className="mt-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-semibold outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
            {courts.map((court) => (
              <button
                key={court.id}
                onClick={() => setSelectedCourtId(court.id)}
                className={`w-full px-1.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center space-x-1 whitespace-nowrap text-center ${
                  selectedCourtId === court.id
                    ? 'bg-purple-600 text-white shadow-md font-extrabold scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏸 {court.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              Status Jam Operasional (07:00 - 23:00 WIB)
            </h3>
            <p className="text-xs text-slate-400">
              Tanggal: <span className="text-purple-400 font-semibold">{selectedSlotDate}</span> | Lapangan: <span className="text-emerald-400 font-semibold">{courts.find(c => c.id === selectedCourtId)?.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-slate-300">Kosong</span>
            </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
              <span className="text-amber-300 font-bold">Sedang Bermain</span>
            </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shrink-0"></span>
              <span className="text-slate-400">Terisi</span>
            </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
              <span className="text-slate-500">Lewat Waktu</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {filteredSlots.map((slot) => {
            const isPast = isSlotInPast(selectedSlotDate, slot.start_time);
            const selectedCourtObj = courts.find(c => c.id === selectedCourtId);

            const isSlotMatchingBooking = (s, b) => {
              if (b.status === 'cancelled') return false;

              // Pastikan booking ini milik lapangan (court) yang sama dengan slot ini
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

            const slotBooking = bookings.find(
              b => b.booking_date === selectedSlotDate &&
                   (b.staff_id === selectedCourtId || b.court_id === selectedCourtId || b.staff_name === selectedCourtObj?.name || b.court_name === selectedCourtObj?.name) &&
                   b.status !== 'cancelled' &&
                   isSlotMatchingBooking(slot, b)
            );

            const isPlaying = slotBooking && slotBooking.status === 'playing' && selectedSlotDate === todayStr;
            // isBooked: slot.status booked ATAU ada booking confirmed/playing yang cocok
            const isBooked = (slot.status === 'booked' || (slotBooking && (slotBooking.status === 'confirmed' || slotBooking.status === 'playing'))) && !isPlaying;
            const isBlocked = slot.status === 'blocked' && !slotBooking;

            return (
              <button
                key={slot.id}
                disabled={isBooked || isPlaying}
                onClick={() => {
                  const nextStatus = isBlocked ? 'available' : 'blocked';
                  toggleSlotStatusByAdmin(slot.id, nextStatus);
                  refreshDashboardData();
                }}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  isPlaying
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 cursor-not-allowed opacity-90 shadow-sm'
                    : isBooked
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300 cursor-not-allowed'
                    : isPast
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-50'
                    : isBlocked
                    ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-700'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                }`}
              >
                <span className="font-mono font-bold text-xs sm:text-sm">{slot.start_time} WIB</span>
                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : isBooked
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : isPast
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60'
                    : isBlocked
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {isPlaying ? '🏸 SEDANG BERMAIN' : isBooked ? '🔒 TERISI' : isPast ? '✕ LEWAT WAKTU' : isBlocked ? '✕ DITUTUP' : '✓ KOSONG'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )}

      {/* TAB 4: ANALITIK */}
      {adminSubTab === 'overview' && <AnalyticsCharts bookings={bookings} />}

      {/* TAB 5: WHATSAPP TARGET */}
      {adminSubTab === 'whatsapp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 max-w-xl shadow-xl">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Target WhatsApp Admin GOR</h3>
              <p className="text-xs text-slate-400">
                Nomor ini menjadi tujuan saat pemain mengirimkan bukti konfirmasi booking via WhatsApp.
              </p>
            </div>
          </div>

          {waSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl flex items-center justify-between animate-fade-in">
              <span>{waSuccessMsg}</span>
              <button onClick={() => setWaSuccessMsg('')} className="text-emerald-400 font-bold ml-2">✕</button>
            </div>
          )}

          <form onSubmit={handleSaveAdminPhone} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor WA Admin GOR *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 08812176486"
                value={adminPhoneInput}
                onChange={(e) => setAdminPhoneInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-emerald-400 mt-1 font-bold">
                ✓ Aktif: {settings.adminPhone || '08812176486'}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs sm:text-sm text-white shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>✓ Simpan Nomor WA Admin</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL CREATE BOOKING */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Tambah Booking Manual</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {crudError && <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs rounded-xl">{crudError}</div>}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Pilih Lapangan</label>
                <select
                  value={createForm.court_id}
                  onChange={(e) => setCreateForm({ ...createForm, court_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                >
                  <option value="court-a">Lapangan A</option>
                  <option value="court-b">Lapangan B</option>
                  <option value="court-c">Lapangan C</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tanggal Booking</label>
                <input
                  type="date"
                  value={createForm.booking_date}
                  onChange={(e) => setCreateForm({ ...createForm, booking_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Jam Mulai</label>
                  <select
                    value={createForm.start_time}
                    onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                  >
                    {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'].map(t => (
                      <option key={t} value={t}>{t} WIB</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Durasi Jam</label>
                  <select
                    value={createForm.duration_hours}
                    onChange={(e) => setCreateForm({ ...createForm, duration_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h} Jam</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Pemain *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Ludfi"
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 0895387571635"
                  value={createForm.customer_phone}
                  onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Jumlah Pemain</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={createForm.player_count}
                  onChange={(e) => setCreateForm({ ...createForm, player_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition mt-4"
              >
                Simpan Booking Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT BOOKING */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Edit Detail Booking</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {crudError && <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs rounded-xl">{crudError}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kode Booking</label>
                <input
                  type="text"
                  disabled
                  value={editingBooking.booking_code}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-500 rounded-xl cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Pemain</label>
                <input
                  type="text"
                  required
                  value={editingBooking.customer_name}
                  onChange={(e) => setEditingBooking({ ...editingBooking, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editingBooking.customer_phone}
                  onChange={(e) => setEditingBooking({ ...editingBooking, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Jumlah Pemain</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editingBooking.player_count}
                  onChange={(e) => setEditingBooking({ ...editingBooking, player_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status Reservasi</label>
                <select
                  value={editingBooking.status}
                  onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                >
                  <option value="confirmed">Terkonfirmasi (Aktif)</option>
                  <option value="completed">Selesai / Checked-In (Buka Slot)</option>
                  <option value="cancelled">Dibatalkan (Buka Slot)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition mt-4"
              >
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREATE USER ACCOUNT */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Buat Akun Pemain Baru</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {crudError && <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs rounded-xl">{crudError}</div>}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Lengkap Pemain *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Ludfi"
                  value={createUserForm.name}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 0895387571635"
                  value={createUserForm.phone}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password Akun *</label>
                <input
                  type="password"
                  required
                  placeholder="Password untuk login user"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Role Hak Akses</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition mt-4"
              >
                Simpan Akun Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT USER ACCOUNT */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Edit Akun Pemain</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {crudError && <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs rounded-xl">{crudError}</div>}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Lengkap Pemain</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password Baru (Opsional)</label>
                <input
                  type="password"
                  placeholder="Biarkan kosong jika tidak ingin mengubah password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Password otomatis dienkripsi secara aman dengan SHA-256.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Role Hak Akses</label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition mt-4"
              >
                Simpan Perubahan Akun
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN BUAT BOOKINGAN MEMBER */}
      {showCreateMemberBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Buat Bookingan Member (Admin)</h3>
                  <p className="text-xs text-slate-400">Jadwal yang dipilih akan otomatis terkunci di sistem</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateMemberBookingModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {memberBookingError && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs rounded-xl">
                {memberBookingError}
              </div>
            )}

            <form onSubmit={handleAdminCreateMemberBooking} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nama Pemain / Member *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={memberBookingForm.customer_name}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp Member *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={memberBookingForm.customer_phone}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Pilih Lapangan * (Bisa Pilih &gt;1 Lapangan Sekaligus)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {courts.map((court) => {
                      const isChecked = memberBookingForm.selected_court_ids.includes(court.id);
                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => {
                            setMemberBookingForm((prev) => {
                              const exists = prev.selected_court_ids.includes(court.id);
                              if (exists && prev.selected_court_ids.length === 1) return prev;
                              const newCourts = exists
                                ? prev.selected_court_ids.filter((c) => c !== court.id)
                                : [...prev.selected_court_ids, court.id];
                              return { ...prev, selected_court_ids: newCourts };
                            });
                          }}
                          className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border flex items-center justify-center space-x-1 ${
                            isChecked
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105 ring-2 ring-amber-400/50'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <span>🏸 {court.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pilih Tanggal Booking *</label>
                  <input
                    type="date"
                    required
                    value={memberBookingForm.booking_date}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, booking_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Jam Mulai *</label>
                  <select
                    value={memberBookingForm.start_time}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none"
                  >
                    {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(t => (
                      <option key={t} value={t}>{t} WIB</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Durasi *</label>
                  <select
                    value={memberBookingForm.duration_hours}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, duration_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h} Jam</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Total Biaya Paket Member (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    placeholder="Contoh: 500000 (Kosongkan/0 jika gratis)"
                    value={memberBookingForm.custom_total_amount || ''}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, custom_total_amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none font-mono font-bold"
                  />
                </div>

                <div className="flex items-end">
                  <p className="text-[10px] text-amber-400 font-medium pb-2">
                    💡 Nominal biaya ini akan dihitung otomatis ke dalam Total Omset Analitik GOR.
                  </p>
                </div>
              </div>

              {/* OPSI JADWAL RUTIN BERULANG */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_recurring_check"
                      checked={memberBookingForm.is_recurring}
                      onChange={(e) => setMemberBookingForm({ ...memberBookingForm, is_recurring: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <label htmlFor="is_recurring_check" className="font-bold text-amber-300 text-xs cursor-pointer select-none">
                      🔁 Jadwal Rutin Berulang (Member Tetap Hari Kerja / Mingguan)
                    </label>
                  </div>
                </div>

                {memberBookingForm.is_recurring && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-slate-300 text-xs">Pilih Hari Rutin Main *</label>
                        <div className="space-x-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setMemberBookingForm({ ...memberBookingForm, selected_days: [1, 2, 3, 4, 5] })}
                            className="text-amber-400 hover:underline font-bold"
                          >
                            + Senin - Jumat
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberBookingForm({ ...memberBookingForm, selected_days: [0, 1, 2, 3, 4, 5, 6] })}
                            className="text-amber-400 hover:underline font-bold"
                          >
                            + Semua Hari
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                        {[
                          { id: 1, full: 'Senin', short: 'Sen' },
                          { id: 2, full: 'Selasa', short: 'Sel' },
                          { id: 3, full: 'Rabu', short: 'Rab' },
                          { id: 4, full: 'Kamis', short: 'Kam' },
                          { id: 5, full: 'Jumat', short: 'Jum' },
                          { id: 6, full: 'Sabtu', short: 'Sab' },
                          { id: 0, full: 'Minggu', short: 'Min' }
                        ].map((day) => {
                          const isSelected = memberBookingForm.selected_days.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleDaySelection(day.id)}
                              className={`py-2 px-1 rounded-xl text-center text-xs font-extrabold transition border ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105 ring-2 ring-amber-400/50'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              <span className="sm:hidden">{day.short}</span>
                              <span className="hidden sm:inline">{day.full}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Durasi Periode Berulang *</label>
                      <select
                        value={memberBookingForm.recurrence_weeks}
                        onChange={(e) => setMemberBookingForm({ ...memberBookingForm, recurrence_weeks: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none"
                      >
                        <option value={1}>1 Minggu</option>
                        <option value={2}>2 Minggu</option>
                        <option value={4}>1 Bulan (4 Minggu)</option>
                        <option value={8}>2 Bulan (8 Minggu)</option>
                        <option value={12}>3 Bulan (12 Minggu)</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-amber-400 font-medium">
                      💡 Sistem akan otomatis mengunci semua slot jam {memberBookingForm.start_time} WIB pada hari-hari yang Anda centang di atas selama periode tersebut.
                    </p>

                    {(() => {
                      const dates = getRecurringDates(
                        memberBookingForm.booking_date,
                        memberBookingForm.selected_days,
                        memberBookingForm.recurrence_weeks
                      );
                      const courtCount = memberBookingForm.selected_court_ids.length;
                      const totalSessions = dates.length * courtCount;
                      const hasWeekend = memberBookingForm.selected_days.includes(6) || memberBookingForm.selected_days.includes(0);

                      return (
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-300 font-bold">
                            <span>📅 Ringkasan Tanggal Paket ({dates.length} Hari x {courtCount} Lapangan = {totalSessions} Sesi):</span>
                          </div>
                          {!hasWeekend && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                              ⚠️ <strong>Perhatian:</strong> Hari Sabtu & Minggu <strong>TIDAK tercentang</strong>. Paket member ini hanya berlaku <strong>Senin s/d Jumat</strong>. Jika member main tiap hari termasuk akhir pekan, silakan klik tombol <strong>"+ Semua Hari"</strong> di atas.
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 max-h-20 overflow-y-auto font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
                            {dates.slice(0, 10).join(', ')}{dates.length > 10 ? ` ...dan ${dates.length - 10} tanggal lainnya` : ''}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status Awal</label>
                  <select
                    value={memberBookingForm.initial_status}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, initial_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none"
                  >
                    <option value="confirmed">⏳ Terkonfirmasi (Menunggu Main)</option>
                    <option value="playing">🏸 Sedang Bermain (Walk-in Langsung Main)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Catatan Admin</label>
                  <input
                    type="text"
                    placeholder="Contoh: Member Tetap Senin - Jumat"
                    value={memberBookingForm.notes}
                    onChange={(e) => setMemberBookingForm({ ...memberBookingForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateMemberBookingModal(false)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-xl shadow-lg transition"
                >
                  ✓ Simpan & Kunci Jadwal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PEMBUATAN BOOKING MEMBER */}
      {showMemberConfirmModal && memberConfirmSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left relative">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Konfirmasi Jadwal Member</h3>
                <p className="text-xs text-slate-400">Mohon periksa kembali detail jadwal sebelum dikunci</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 font-semibold">Nama Member:</span>
                <span className="text-amber-300 font-extrabold">{memberConfirmSummary.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 font-semibold">No. WhatsApp:</span>
                <span className="text-white font-mono">{memberConfirmSummary.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 font-semibold">Lapangan:</span>
                <span className="text-white font-bold">{memberConfirmSummary.courts}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 font-semibold">Waktu & Durasi:</span>
                <span className="text-emerald-400 font-bold">{memberConfirmSummary.startTime} WIB ({memberConfirmSummary.duration} Jam Main)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Tipe Reservasi:</span>
                <span className="text-amber-400 font-extrabold">
                  {memberConfirmSummary.isRecurring ? `Paket Rutin (${memberConfirmSummary.totalSessions} Sesi)` : `Single Booking (${memberConfirmSummary.totalSessions} Sesi)`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-400 font-medium">
              💡 Sistem akan mengunci {memberConfirmSummary.totalSessions} slot jam secara otomatis dan menyimpannya sebagai Paket Member Rutin.
            </p>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowMemberConfirmModal(false)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
              >
                Batal Kembali
              </button>
              <button
                type="button"
                onClick={executeCreateMemberBooking}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-xl shadow-lg transition text-xs"
              >
                ✓ Ya, Setujui & Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCAN QR CODE */}
      {showQRScanner && <QRScannerModal onClose={() => setShowQRScanner(false)} />}

      {/* CUSTOM BEAUTIFUL CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl space-y-4 relative my-auto">
            
            <button
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border text-2xl shadow-lg ${
              confirmDialog.confirmVariant === 'rose'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20'
                : confirmDialog.confirmVariant === 'emerald'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'
                : 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-orange-500/20'
            }`}>
              {confirmDialog.confirmVariant === 'rose' ? '🗑️' : confirmDialog.confirmVariant === 'emerald' ? '🏸' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white tracking-tight">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.message}</p>
            </div>

            {confirmDialog.details && (
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5 font-medium">
                {confirmDialog.details.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 text-[11px]">{d.label}:</span>
                    <span className="font-bold text-white text-[12px]">{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition border border-slate-700"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`py-3 px-4 font-black rounded-2xl text-xs transition shadow-lg ${
                  confirmDialog.confirmVariant === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : confirmDialog.confirmVariant === 'emerald'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
