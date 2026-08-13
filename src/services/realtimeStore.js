/**
 * REALTIME DATA STORE & INTER-TAB & MULTI-DEVICE CLOUD SYNC ENGINE (FIREBASE FIRESTORE)
 * Sewa Lapangan Bulu Tangkis (Lapangan A, B, C)
 */

import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

const STORAGE_KEY_SLOTS = 'rts_schedule_slots_badminton_v14';
const STORAGE_KEY_BOOKINGS = 'rts_bookings_badminton_v14';
const STORAGE_KEY_SERVICES = 'rts_services_badminton_v14';
const STORAGE_KEY_COURTS = 'rts_courts_badminton_v14';
const STORAGE_KEY_PROMOS = 'rts_promo_codes_badminton_v14';
const STORAGE_KEY_SETTINGS = 'rts_admin_settings_badminton_v14';
const STORAGE_KEY_USERS = 'rts_registered_users_v14';
const STORAGE_KEY_ACTIVE_USER = 'rts_active_user_v14';
const STORAGE_KEY_ADMIN_AUTH = 'rts_admin_authenticated_v14';
const STORAGE_KEY_LAST_ACTIVITY = 'rts_last_activity_timestamp_v14';

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 Jam Inactivity Timeout

const broadcastChannel = new BroadcastChannel('badminton_booking_realtime_channel');

// UTILITY HASH PASSWORD (SHA-256 ENCRYPTION)
export const hashPassword = async (plainPassword) => {
  if (!plainPassword) return '';
  if (/^[a-f0-9]{64}$/i.test(plainPassword)) return plainPassword;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return btoa(plainPassword);
  }
};

// 3 LAPANGAN (LAPANGAN A, LAPANGAN B, LAPANGAN C)
const DEFAULT_COURTS = [
  { id: 'court-a', name: 'Lapangan A', price_per_person: 5000, avatar: '🏸', is_active: true },
  { id: 'court-b', name: 'Lapangan B', price_per_person: 5000, avatar: '🏸', is_active: true },
  { id: 'court-c', name: 'Lapangan C', price_per_person: 5000, avatar: '🏸', is_active: true }
];

const DEFAULT_SERVICES = [
  { id: 'srv-custom', name: 'Sewa Lapangan Bulu Tangkis (Rp 5.000 / Orang)', category: 'Sewa Lapangan', duration: 60, price: 5000, icon: 'Trophy' }
];

const DEFAULT_PROMOS = [
  { code: 'SMASH50', discount_percent: 50, max_uses: 100, current_uses: 5, is_active: true },
  { code: 'BADMINTONKU', discount_percent: 20, max_uses: 500, current_uses: 20, is_active: true }
];

const DEFAULT_SETTINGS = {
  adminPhone: '08812176486',
  fonnteApiKey: '',
  businessName: 'GOR MBS (Mandiri Bengle Sejahtera)',
  operatingHours: '07:00 - 23:00 WIB'
};

const DEFAULT_USERS = [
  { id: 'usr-1', name: 'Ahmad Ludfi', phone: '0895387571635', password: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', role: 'user', created_at: new Date().toISOString() }
];

const TIMES = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export const updateLastActivity = () => {
  localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString());
};

export const isSessionExpired = () => {
  const lastActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
  if (!lastActivity) return false;

  const now = Date.now();
  const elapsed = now - parseInt(lastActivity, 10);
  return elapsed > ONE_HOUR_MS;
};

export const getCurrentSession = () => {
  if (isSessionExpired()) {
    logoutActiveUser();
    return null;
  }

  const isAdminAuth = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true' || sessionStorage.getItem('rts_admin_authenticated') === 'true';
  if (isAdminAuth) return { role: 'admin' };

  const activeUser = getActiveUser();
  if (activeUser) return { role: 'user', user: activeUser };

  return null;
};

export const ensureSlotsForDate = (dateStr) => {
  if (!dateStr) return;
  const currentSlots = JSON.parse(localStorage.getItem(STORAGE_KEY_SLOTS) || '[]');
  let hasNew = false;
  const newSlots = [];

  DEFAULT_COURTS.forEach((court) => {
    TIMES.forEach((time) => {
      const exists = currentSlots.some(
        s => s.slot_date === dateStr && s.court_id === court.id && s.start_time === time
      );
      if (!exists) {
        const slotItem = {
          id: `slot-${dateStr}-${court.id}-${time.replace(':', '')}`,
          court_id: court.id,
          court_name: court.name,
          slot_date: dateStr,
          start_time: time,
          status: 'available'
        };
        currentSlots.push(slotItem);
        newSlots.push(slotItem);
        hasNew = true;
      }
    });
  });

  if (hasNew) {
    currentSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
    syncSlotsBatchToFirestore(newSlots);
  }
};

const generateDefaultBadmintonSlots = () => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = tomorrowObj.toISOString().split('T')[0];

  const slots = [];

  [today, tomorrow].forEach((dateStr) => {
    DEFAULT_COURTS.forEach((court) => {
      TIMES.forEach((time) => {
        const isInitialBooked = 
          (time === '19:00' && court.id === 'court-a') ||
          (time === '20:00' && court.id === 'court-a');

        slots.push({
          id: `slot-${dateStr}-${court.id}-${time.replace(':', '')}`,
          court_id: court.id,
          court_name: court.name,
          slot_date: dateStr,
          start_time: time,
          status: isInitialBooked ? 'booked' : 'available'
        });
      });
    });
  });

  return slots;
};

// FIREBASE FIRESTORE SYNC HELPERS
const syncBookingToFirestore = async (booking) => {
  try {
    if (booking && booking.id) {
      await setDoc(doc(db, 'bookings', booking.id), booking);
    }
  } catch (err) {
    console.error('Error syncing booking to Firestore:', err);
  }
};

const syncSlotToFirestore = async (slot) => {
  try {
    if (slot && slot.id) {
      await setDoc(doc(db, 'slots', slot.id), slot);
    }
  } catch (err) {
    console.error('Error syncing slot to Firestore:', err);
  }
};

const syncSlotsBatchToFirestore = async (slotsArray) => {
  try {
    if (!slotsArray || slotsArray.length === 0) return;
    const batch = writeBatch(db);
    slotsArray.forEach(slot => {
      if (slot && slot.id) {
        batch.set(doc(db, 'slots', slot.id), slot, { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('Error batch syncing slots to Firestore:', err);
  }
};

const deleteBookingFromFirestore = async (bookingId) => {
  try {
    if (bookingId) {
      await deleteDoc(doc(db, 'bookings', bookingId));
    }
  } catch (err) {
    console.error('Error deleting booking from Firestore:', err);
  }
};

const syncUserToFirestore = async (user) => {
  try {
    if (user && user.id) {
      await setDoc(doc(db, 'users', user.id), user);
    }
  } catch (err) {
    console.error('Error syncing user to Firestore:', err);
  }
};

const deleteUserFromFirestore = async (userId) => {
  try {
    if (userId) {
      await deleteDoc(doc(db, 'users', userId));
    }
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
  }
};

const syncSettingsToFirestore = async (settings) => {
  try {
    await setDoc(doc(db, 'settings', 'admin_config'), settings);
  } catch (err) {
    console.error('Error syncing settings to Firestore:', err);
  }
};

let isFirestoreListenerActive = false;

export const initRealtimeDatabase = () => {
  if (!localStorage.getItem(STORAGE_KEY_SERVICES)) {
    localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(DEFAULT_SERVICES));
  }
  if (!localStorage.getItem(STORAGE_KEY_COURTS)) {
    localStorage.setItem(STORAGE_KEY_COURTS, JSON.stringify(DEFAULT_COURTS));
  }
  if (!localStorage.getItem(STORAGE_KEY_SLOTS)) {
    const initialSlots = generateDefaultBadmintonSlots();
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(initialSlots));
    syncSlotsBatchToFirestore(initialSlots);
  }
  if (!localStorage.getItem(STORAGE_KEY_BOOKINGS)) {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEY_PROMOS)) {
    localStorage.setItem(STORAGE_KEY_PROMOS, JSON.stringify(DEFAULT_PROMOS));
  }
  if (!localStorage.getItem(STORAGE_KEY_SETTINGS)) {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    syncSettingsToFirestore(DEFAULT_SETTINGS);
  }
  if (!localStorage.getItem(STORAGE_KEY_USERS)) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
    if (DEFAULT_USERS[0]) syncUserToFirestore(DEFAULT_USERS[0]);
  }

  // FIRESTORE REALTIME LISTENERS (MULTIDEVICE REALTIME SYNC)
  if (!isFirestoreListenerActive) {
    isFirestoreListenerActive = true;

    // 1. Listen Bookings
    onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const remoteBookings = [];
      snapshot.forEach(docSnap => {
        remoteBookings.push(docSnap.data());
      });
      // Sort newest first
      remoteBookings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(remoteBookings));

      broadcastChannel.postMessage({
        type: 'REALTIME_BOOKING_SYNC_REMOTE',
        timestamp: Date.now()
      });
    }, (err) => console.warn('Firestore Bookings listener:', err));

    // 2. Listen Slots
    onSnapshot(collection(db, 'slots'), (snapshot) => {
      if (snapshot.empty) return;
      const localSlots = JSON.parse(localStorage.getItem(STORAGE_KEY_SLOTS) || '[]');
      const slotsMap = new Map();
      localSlots.forEach(s => slotsMap.set(s.id, s));

      snapshot.forEach(docSnap => {
        const slotData = docSnap.data();
        if (slotData && slotData.id) {
          slotsMap.set(slotData.id, slotData);
        }
      });

      const mergedSlots = Array.from(slotsMap.values());
      mergedSlots.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(mergedSlots));

      broadcastChannel.postMessage({
        type: 'REALTIME_SLOT_SYNC_REMOTE',
        timestamp: Date.now()
      });
    }, (err) => console.warn('Firestore Slots listener:', err));

    // 3. Listen Users
    onSnapshot(collection(db, 'users'), (snapshot) => {
      if (snapshot.empty) return;
      const remoteUsers = [];
      snapshot.forEach(docSnap => {
        remoteUsers.push(docSnap.data());
      });
      if (remoteUsers.length > 0) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(remoteUsers));
        broadcastChannel.postMessage({
          type: 'REALTIME_USER_SYNC_REMOTE',
          timestamp: Date.now()
        });
      }
    }, (err) => console.warn('Firestore Users listener:', err));

    // 4. Listen Settings
    onSnapshot(collection(db, 'settings'), (snapshot) => {
      snapshot.forEach(docSnap => {
        if (docSnap.id === 'admin_config') {
          const remoteSettings = docSnap.data();
          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(remoteSettings));
        }
      });
    }, (err) => console.warn('Firestore Settings listener:', err));
  }
};

// USER & ADMIN AUTH MANAGEMENT
export const getRegisteredUsers = () => {
  initRealtimeDatabase();
  return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
};

export const getActiveUser = () => {
  const data = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
  return data ? JSON.parse(data) : null;
};

export const registerNewUser = async ({ name, phone, password }) => {
  const users = getRegisteredUsers();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

  const exists = users.find(u => u.phone === cleanPhone || u.phone === phone.trim());
  if (exists) {
    return { success: false, error: 'Nomor WhatsApp ini sudah terdaftar! Silakan pindah ke tab Login.' };
  }

  const hashedPassword = await hashPassword(password.trim());

  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    phone: cleanPhone,
    password: hashedPassword,
    role: 'user',
    created_at: new Date().toISOString()
  };

  users.unshift(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(newUser));
  updateLastActivity();

  syncUserToFirestore(newUser);

  return { success: true, role: 'user', user: newUser };
};

export const createUserAdmin = async ({ name, phone, password, role = 'user' }) => {
  const users = getRegisteredUsers();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

  const exists = users.find(u => u.phone === cleanPhone || u.phone === phone.trim());
  if (exists) {
    return { success: false, error: 'Nomor WhatsApp / User ini sudah terdaftar!' };
  }

  const hashedPassword = await hashPassword(password.trim());

  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    phone: cleanPhone,
    password: hashedPassword,
    role: role || 'user',
    created_at: new Date().toISOString()
  };

  users.unshift(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  syncUserToFirestore(newUser);

  broadcastChannel.postMessage({
    type: 'REALTIME_USER_CREATED',
    user: newUser,
    timestamp: Date.now()
  });

  return { success: true, user: newUser };
};

export const updateUserAdmin = async (userId, { name, phone, password, role }) => {
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const cleanPhone = phone ? phone.trim().replace(/[^0-9]/g, '') : users[idx].phone;
    const hashedPassword = password ? await hashPassword(password.trim()) : users[idx].password;

    users[idx] = {
      ...users[idx],
      name: name ? name.trim() : users[idx].name,
      phone: cleanPhone,
      password: hashedPassword,
      role: role || users[idx].role || 'user'
    };

    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    syncUserToFirestore(users[idx]);

    broadcastChannel.postMessage({
      type: 'REALTIME_USER_UPDATED',
      user: users[idx],
      timestamp: Date.now()
    });

    return { success: true, user: users[idx] };
  }
  return { success: false, error: 'Akun user tidak ditemukan.' };
};

export const deleteUserAdmin = (userId) => {
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const deletedUser = users[idx];
    users.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    deleteUserFromFirestore(userId);

    broadcastChannel.postMessage({
      type: 'REALTIME_USER_DELETED',
      userId,
      timestamp: Date.now()
    });

    return { success: true, deletedUser };
  }
  return { success: false, error: 'Akun user tidak ditemukan.' };
};

export const authenticateAnyAccount = async ({ usernameOrPhone, password }) => {
  const inputClean = usernameOrPhone.trim();
  const passClean = password.trim();

  // 1. ADMIN
  if ((inputClean === 'admin' || inputClean === '08812176486' || inputClean === '0895349066544') && (passClean === 'gormbs23' || passClean === 'admin123' || passClean === 'admin')) {
    localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
    sessionStorage.setItem('rts_admin_authenticated', 'true');
    updateLastActivity();
    return { success: true, role: 'admin' };
  }

  // 2. USER
  const users = getRegisteredUsers();
  const cleanPhone = inputClean.replace(/[^0-9]/g, '');
  const hashedInputPass = await hashPassword(passClean);

  const user = users.find(
    u => (u.phone === cleanPhone || u.phone === inputClean || u.name.toLowerCase() === inputClean.toLowerCase()) &&
         (u.password === hashedInputPass || u.password === passClean)
  );

  if (user) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(user));
    updateLastActivity();
    return { success: true, role: user.role || 'user', user };
  }

  return {
    success: false,
    error: 'Username / No. WA atau Password tidak ditemukan / salah. Silakan daftar akun baru di tab Daftar.'
  };
};

export const logoutActiveUser = () => {
  localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
  localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
  localStorage.removeItem('rts_current_role');
  sessionStorage.removeItem('rts_admin_authenticated');
  sessionStorage.removeItem('rts_current_role');
};

export const getServices = () => JSON.parse(localStorage.getItem(STORAGE_KEY_SERVICES) || '[]');
export const getStaff = () => JSON.parse(localStorage.getItem(STORAGE_KEY_COURTS) || '[]');
export const getCourts = () => JSON.parse(localStorage.getItem(STORAGE_KEY_COURTS) || '[]');

export const getSlots = (dateStr) => {
  initRealtimeDatabase();
  if (dateStr) {
    ensureSlotsForDate(dateStr);
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEY_SLOTS) || '[]');
};

export const getBookings = () => JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKINGS) || '[]');
export const getPromos = () => JSON.parse(localStorage.getItem(STORAGE_KEY_PROMOS) || '[]');
export const getSettings = () => {
  initRealtimeDatabase();
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}');
  if (!settings.adminPhone || settings.adminPhone === '081234567890') {
    settings.adminPhone = '08812176486';
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }
  return settings;
};

export const subscribeRealtimeUpdates = (callback) => {
  const handler = (event) => {
    if (callback) callback(event.data);
  };
  broadcastChannel.addEventListener('message', handler);
  return () => broadcastChannel.removeEventListener('message', handler);
};

export const bookMultiHourSlotsAtomic = async (bookingPayload) => {
  initRealtimeDatabase();
  const {
    court_id,
    booking_date,
    start_time,
    duration_hours,
    player_count,
    customer_name,
    customer_phone,
    customer_email,
    notes
  } = bookingPayload;

  ensureSlotsForDate(booking_date);
  const currentSlots = getSlots(booking_date);
  const courts = getCourts();
  const courtObj = courts.find(c => c.id === court_id) || {};

  const startHour = parseInt(start_time.split(':')[0]);
  const duration = parseInt(duration_hours) || 1;
  const numPlayers = parseInt(player_count) || 4;
  const endHour = startHour + duration;

  const requiredTimes = [];
  for (let h = startHour; h < endHour; h++) {
    const formattedHour = h.toString().padStart(2, '0') + ':00';
    requiredTimes.push(formattedHour);
  }

  const targetSlots = [];
  for (const timeStr of requiredTimes) {
    const slotObj = currentSlots.find(
      s => s.court_id === court_id && s.slot_date === booking_date && s.start_time === timeStr
    );
    if (!slotObj) {
      return {
        success: false,
        error: `Jam ${timeStr} WIB melampaui jam operasional GOR (maksimal s/d 23:00 WIB).`
      };
    }
    if (slotObj.status !== 'available') {
      return {
        success: false,
        error: `⚠️ Slot jam ${timeStr} WIB di ${courtObj.name} sudah terisi / dibooking oleh pemain lain.`
      };
    }
    targetSlots.push(slotObj);
  }

  const updatedSlotsForCloud = [];
  targetSlots.forEach(slot => {
    const idx = currentSlots.findIndex(s => s.id === slot.id);
    if (idx !== -1) {
      currentSlots[idx].status = 'booked';
      updatedSlotsForCloud.push(currentSlots[idx]);
    }
  });

  localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));

  const bkgIsMember = (customer_name && customer_name.includes('(Member)')) || bookingPayload.is_member;
  const pricePerPerson = 5000;
  const totalAmount = bookingPayload.total_amount !== undefined
    ? bookingPayload.total_amount
    : (bkgIsMember ? 0 : numPlayers * pricePerPerson);

  const serviceName = bkgIsMember
    ? `Sewa Member Tetap (${duration} Jam Main)`
    : `Sewa ${duration} Jam (${numPlayers} Pemain @ Rp 5.000/orang)`;

  const endFormatted = endHour.toString().padStart(2, '0') + ':00';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const bookingCode = `BKG-${dateTag}-${randomSuffix}`;
  const qrToken = `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const cancelToken = `MNG-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

  const newBooking = {
    id: `bkg-${Date.now()}`,
    booking_code: bookingCode,
    service_id: 'srv-custom',
    service_name: serviceName,
    staff_id: court_id,
    staff_name: courtObj.name,
    court_name: courtObj.name,
    slot_id: targetSlots[0].id,
    slot_ids: targetSlots.map(s => s.id),
    booking_date,
    booking_time: `${start_time} - ${endFormatted}`,
    duration_hours: duration,
    player_count: bkgIsMember ? 4 : numPlayers,
    customer_name,
    customer_phone,
    customer_email,
    notes,
    group_id: bookingPayload.group_id || null,
    total_amount: totalAmount,
    status: 'confirmed',
    qr_code_token: qrToken,
    cancel_token: cancelToken,
    checked_in: false,
    created_at: new Date().toISOString()
  };

  const currentBookings = getBookings();
  currentBookings.unshift(newBooking);
  localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(currentBookings));

  // SYNC TO FIREBASE CLOUD REALTIME
  syncBookingToFirestore(newBooking);
  syncSlotsBatchToFirestore(updatedSlotsForCloud);

  broadcastChannel.postMessage({
    type: 'REALTIME_MULTI_BOOKING_CREATED',
    slot_ids: targetSlots.map(s => s.id),
    booking: newBooking,
    timestamp: Date.now()
  });

  return {
    success: true,
    booking: newBooking
  };
};

export const toggleSlotStatusByAdmin = (slot_id, newStatus) => {
  const currentSlots = getSlots();
  const idx = currentSlots.findIndex(s => s.id === slot_id);
  if (idx !== -1) {
    currentSlots[idx].status = newStatus;
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
    
    syncSlotToFirestore(currentSlots[idx]);

    broadcastChannel.postMessage({
      type: 'REALTIME_SLOT_TOGGLED',
      slot_id,
      newStatus,
      timestamp: Date.now()
    });
  }
};

export const updateBookingStatus = (booking_code_or_token, newStatus) => {
  const currentBookings = getBookings();
  const targetCode = (booking_code_or_token || '').trim().toUpperCase();

  const idx = currentBookings.findIndex(
    b => (b.booking_code && b.booking_code.toUpperCase() === targetCode) ||
         (b.qr_code_token && b.qr_code_token.toUpperCase() === targetCode) ||
         (b.cancel_token && b.cancel_token.toUpperCase() === targetCode)
  );

  if (idx !== -1) {
    const booking = currentBookings[idx];
    booking.status = newStatus;
    
    if (newStatus === 'playing' || newStatus === 'completed' || newStatus === 'cancelled') {
      booking.checked_in = true;
      if (!booking.checked_in_at) {
        booking.checked_in_at = new Date().toISOString();
      }
    }

    const modifiedSlots = [];
    if (newStatus === 'cancelled' || newStatus === 'completed') {
      const currentSlots = getSlots();
      const slotsToFree = booking.slot_ids || [booking.slot_id];
      slotsToFree.forEach(sId => {
        const slotIdx = currentSlots.findIndex(s => s.id === sId);
        if (slotIdx !== -1) {
          currentSlots[slotIdx].status = 'available';
          modifiedSlots.push(currentSlots[slotIdx]);
        }
      });
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
    } else {
      const currentSlots = getSlots();
      const slotsToLock = booking.slot_ids || [booking.slot_id];
      slotsToLock.forEach(sId => {
        const slotIdx = currentSlots.findIndex(s => s.id === sId);
        if (slotIdx !== -1) {
          currentSlots[slotIdx].status = 'booked';
          modifiedSlots.push(currentSlots[slotIdx]);
        }
      });
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
    }

    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(currentBookings));

    syncBookingToFirestore(booking);
    syncSlotsBatchToFirestore(modifiedSlots);

    broadcastChannel.postMessage({
      type: 'REALTIME_BOOKING_STATUS_UPDATED',
      booking_id: booking.id,
      newStatus,
      timestamp: Date.now()
    });

    return { success: true, booking };
  }

  return { success: false, error: 'Booking atau QR Token tidak ditemukan.' };
};

export const updateBookingDetails = (bookingId, updatedFields) => {
  const currentBookings = getBookings();
  const idx = currentBookings.findIndex(b => b.id === bookingId || b.booking_code === bookingId);
  if (idx !== -1) {
    const oldBooking = currentBookings[idx];
    const newStatus = updatedFields.status || oldBooking.status;
    const modifiedSlots = [];

    if ((newStatus === 'cancelled' || newStatus === 'completed') && oldBooking.status !== newStatus) {
      const currentSlots = getSlots();
      const slotsToFree = oldBooking.slot_ids || [oldBooking.slot_id];
      slotsToFree.forEach(sId => {
        const slotIdx = currentSlots.findIndex(s => s.id === sId);
        if (slotIdx !== -1) {
          currentSlots[slotIdx].status = 'available';
          modifiedSlots.push(currentSlots[slotIdx]);
        }
      });
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
    }

    const nextTotalAmount = updatedFields.total_amount !== undefined
      ? updatedFields.total_amount
      : (oldBooking.is_member || oldBooking.customer_name?.toLowerCase().includes('member')
        ? (oldBooking.total_amount || 0)
        : (updatedFields.player_count ? (parseInt(updatedFields.player_count) * 5000) : oldBooking.total_amount));

    currentBookings[idx] = {
      ...oldBooking,
      ...updatedFields,
      total_amount: nextTotalAmount
    };

    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(currentBookings));

    syncBookingToFirestore(currentBookings[idx]);
    if (modifiedSlots.length > 0) syncSlotsBatchToFirestore(modifiedSlots);

    broadcastChannel.postMessage({
      type: 'REALTIME_BOOKING_UPDATED',
      booking_id: oldBooking.id,
      timestamp: Date.now()
    });

    return { success: true, booking: currentBookings[idx] };
  }
  return { success: false, error: 'Booking tidak ditemukan.' };
};

export const deleteBookingAdmin = (bookingId) => {
  const currentBookings = getBookings();
  const idx = currentBookings.findIndex(b => b.id === bookingId || b.booking_code === bookingId);
  if (idx !== -1) {
    const bookingToDelete = currentBookings[idx];
    const modifiedSlots = [];

    const currentSlots = getSlots();
    const slotsToFree = bookingToDelete.slot_ids || [bookingToDelete.slot_id];
    slotsToFree.forEach(sId => {
      const slotIdx = currentSlots.findIndex(s => s.id === sId);
      if (slotIdx !== -1) {
        currentSlots[slotIdx].status = 'available';
        modifiedSlots.push(currentSlots[slotIdx]);
      }
    });
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));

    currentBookings.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(currentBookings));

    deleteBookingFromFirestore(bookingToDelete.id);
    syncSlotsBatchToFirestore(modifiedSlots);

    broadcastChannel.postMessage({
      type: 'REALTIME_BOOKING_DELETED',
      booking_id: bookingToDelete.id,
      timestamp: Date.now()
    });

    return { success: true };
  }
  return { success: false, error: 'Booking tidak ditemukan.' };
};

export const scanQRCodeCheckIn = (qrToken) => {
  return updateBookingStatus(qrToken, 'playing');
};

export const saveAdminSettings = (newSettings) => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
  syncSettingsToFirestore(newSettings);
};

export const deleteMultipleBookingsAdmin = (bookingIds = []) => {
  if (!bookingIds || bookingIds.length === 0) return { success: false, error: 'Tidak ada booking yang dipilih.' };
  initRealtimeDatabase();
  const currentBookings = getBookings();
  const currentSlots = getSlots();
  const modifiedSlots = [];

  const idsSet = new Set(bookingIds);
  const remainingBookings = [];

  currentBookings.forEach(b => {
    if (idsSet.has(b.id) || idsSet.has(b.booking_code)) {
      deleteBookingFromFirestore(b.id);
      const slotsToFree = b.slot_ids || (b.slot_id ? [b.slot_id] : []);
      slotsToFree.forEach(sId => {
        const slotIdx = currentSlots.findIndex(s => s.id === sId);
        if (slotIdx !== -1) {
          currentSlots[slotIdx].status = 'available';
          modifiedSlots.push(currentSlots[slotIdx]);
        }
      });
    } else {
      remainingBookings.push(b);
    }
  });

  localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(remainingBookings));
  localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));

  syncSlotsBatchToFirestore(modifiedSlots);

  broadcastChannel.postMessage({
    type: 'REALTIME_BOOKING_DELETED_BULK',
    booking_ids: bookingIds,
    timestamp: Date.now()
  });

  return { success: true, count: bookingIds.length };
};

export const deleteMultipleUsersAdmin = (userIds = []) => {
  if (!userIds || userIds.length === 0) return { success: false, error: 'Tidak ada akun user yang dipilih.' };
  initRealtimeDatabase();
  const users = getRegisteredUsers();
  const idsSet = new Set(userIds);
  const remainingUsers = users.filter(u => {
    if (idsSet.has(u.id)) {
      deleteUserFromFirestore(u.id);
      return false;
    }
    return true;
  });

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(remainingUsers));

  broadcastChannel.postMessage({
    type: 'REALTIME_USER_DELETED_BULK',
    user_ids: userIds,
    timestamp: Date.now()
  });

  return { success: true, count: userIds.length };
};
