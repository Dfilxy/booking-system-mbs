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
const realtimeSubscribers = new Set();

export const subscribeRealtimeUpdates = (callback) => {
  if (callback) realtimeSubscribers.add(callback);

  const handler = (event) => {
    if (callback) callback(event.data);
  };
  broadcastChannel.addEventListener('message', handler);

  return () => {
    if (callback) realtimeSubscribers.delete(callback);
    broadcastChannel.removeEventListener('message', handler);
  };
};

export const notifyAllSubscribers = (data = {}) => {
  realtimeSubscribers.forEach((cb) => {
    try {
      cb(data);
    } catch (err) {
      console.error('Error notifying subscriber:', err);
    }
  });
};

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

// FIRESTORE CLOUD REALTIME SYNC HELPERS (SAFE NO-OP IF OFF-LINE OR ERROR)
export const syncBookingToFirestore = async (booking) => {
  if (!db || !booking?.id) return;
  try {
    const docRef = doc(db, 'bookings', booking.id.toString());
    await setDoc(docRef, booking, { merge: true });
  } catch (err) {
    console.warn('[Firestore Sync Booking Warning]:', err);
  }
};

export const syncSlotToFirestore = async (slot) => {
  if (!db || !slot?.id) return;
  try {
    const docRef = doc(db, 'slots', slot.id.toString());
    await setDoc(docRef, slot, { merge: true });
  } catch (err) {
    console.warn('[Firestore Sync Slot Warning]:', err);
  }
};

export const syncSlotsBatchToFirestore = async (slots = []) => {
  if (!db || !slots || slots.length === 0) return;
  try {
    const batch = writeBatch(db);
    slots.forEach(s => {
      if (s?.id) {
        const docRef = doc(db, 'slots', s.id.toString());
        batch.set(docRef, s, { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore Sync Slots Batch Warning]:', err);
  }
};

export const deleteBookingFromFirestore = async (bookingId) => {
  if (!db || !bookingId) return;
  try {
    const docRef = doc(db, 'bookings', bookingId.toString());
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firestore Delete Booking Warning]:', err);
  }
};

export const syncUserToFirestore = async (user) => {
  if (!db || !user?.id) return;
  try {
    const docRef = doc(db, 'users', user.id.toString());
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.warn('[Firestore Sync User Warning]:', err);
  }
};

export const deleteUserFromFirestore = async (userId) => {
  if (!db || !userId) return;
  try {
    const docRef = doc(db, 'users', userId.toString());
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firestore Delete User Warning]:', err);
  }
};

export const syncSettingsToFirestore = async (settings) => {
  if (!db || !settings) return;
  try {
    const docRef = doc(db, 'settings', 'config');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.warn('[Firestore Sync Settings Warning]:', err);
  }
};

export const getActiveUser = () => {
  const data = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
  return data ? JSON.parse(data) : null;
};

export const logoutActiveUser = () => {
  localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
  localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
  localStorage.removeItem('rts_current_role');
  localStorage.removeItem('rts_admin_authenticated_v14');
  sessionStorage.removeItem('rts_admin_authenticated');
  sessionStorage.removeItem('rts_current_role');
  sessionStorage.removeItem('rts_tab_role');
  sessionStorage.removeItem('admin_authenticated');
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
  const hasActiveUser = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
  const hasAdminAuth = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true' || 
                       localStorage.getItem('rts_admin_authenticated_v14') === 'true' || 
                       sessionStorage.getItem('rts_admin_authenticated') === 'true';

  // Jika tidak ada user atau admin yang sedang login, sesi dianggap tidak kadaluwarsa
  if ((!hasActiveUser && !hasAdminAuth) || !lastActivity) return false;

  const now = Date.now();
  const elapsed = now - parseInt(lastActivity, 10);
  return elapsed > ONE_HOUR_MS;
};

// -------------------------------------------------------------
// VALIDASI STRICT NOMOR WA INDONESIA & ANTI-SPAM RATE LIMITING
// -------------------------------------------------------------
export const validateIndonesianPhone = (phoneStr) => {
  if (!phoneStr || !phoneStr.trim()) {
    return { isValid: false, error: 'Nomor WhatsApp wajib diisi.' };
  }

  const clean = phoneStr.trim().replace(/[^0-9]/g, '');

  if (clean.startsWith('08')) {
    if (clean.length < 10 || clean.length > 14) {
      return { isValid: false, error: 'Nomor WhatsApp Indonesia (08...) harus terdiri dari 10 hingga 14 digit.' };
    }
  } else if (clean.startsWith('628')) {
    if (clean.length < 11 || clean.length > 15) {
      return { isValid: false, error: 'Nomor WhatsApp Indonesia (+628...) harus terdiri dari 11 hingga 15 digit.' };
    }
  } else {
    return { isValid: false, error: 'Format Nomor WhatsApp tidak valid. Nomor Indonesia harus diawali 08... atau 628...' };
  }

  const validPrefixes = [
    '0811', '0812', '0813', '0814', '0815', '0816', '0817', '0818', '0819',
    '0821', '0822', '0823', '0831', '0832', '0833', '0838',
    '0851', '0852', '0853', '0855', '0856', '0857', '0858', '0859',
    '0877', '0878', '0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889',
    '0895', '0896', '0897', '0898', '0899',
    '6281', '6282', '6283', '6285', '6287', '6288', '6289'
  ];

  const isValidPrefix = validPrefixes.some(p => clean.startsWith(p));
  if (!isValidPrefix) {
    return {
      isValid: false,
      error: 'Nomor WhatsApp yang Anda masukkan tidak terdeteksi sebagai nomor provider seluler Indonesia yang aktif (Telkomsel, Indosat, XL, Tri, Smartfren, Axis).'
    };
  }

  return { isValid: true, cleanPhone: clean };
};

const LAST_BOOKING_TIMESTAMP_KEY = 'rts_last_booking_submission_ts';
const BOOKING_COOLDOWN_MS = 30000; // 30 Detik Cooldown Anti-Spam

export const checkBookingRateLimit = () => {
  const lastTs = localStorage.getItem(LAST_BOOKING_TIMESTAMP_KEY);
  if (!lastTs) return { isAllowed: true };

  const elapsed = Date.now() - parseInt(lastTs, 10);
  if (elapsed < BOOKING_COOLDOWN_MS) {
    const remainingSec = Math.ceil((BOOKING_COOLDOWN_MS - elapsed) / 1000);
    return {
      isAllowed: false,
      remainingSec,
      error: `⚠️ Proteksi Anti-Spam Aktif: Mohon tunggu ${remainingSec} detik lagi sebelum membuat reservasi berikutnya.`
    };
  }

  return { isAllowed: true };
};

export const updateBookingRateLimit = () => {
  localStorage.setItem(LAST_BOOKING_TIMESTAMP_KEY, Date.now().toString());
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
        slots.push({
          id: `slot-${dateStr}-${court.id}-${time.replace(':', '')}`,
          court_id: court.id,
          court_name: court.name,
          slot_date: dateStr,
          start_time: time,
          status: 'available'
        });
      });
    });
  });

  return slots;
};

export const cleanupOrphanSlots = () => {
  try {
    const currentSlots = JSON.parse(localStorage.getItem(STORAGE_KEY_SLOTS) || '[]');
    const currentBookings = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKINGS) || '[]');

    const validBookedSlotIds = new Set();
    currentBookings.forEach(b => {
      if (b && (b.status === 'confirmed' || b.status === 'playing')) {
        const sIds = b.slot_ids || (b.slot_id ? [b.slot_id] : []);
        sIds.forEach(id => validBookedSlotIds.add(id));
      }
    });

    let hasChanges = false;
    const modifiedSlots = [];
    currentSlots.forEach(s => {
      if (s.status === 'booked' && !validBookedSlotIds.has(s.id)) {
        s.status = 'available';
        modifiedSlots.push(s);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(currentSlots));
      syncSlotsBatchToFirestore(modifiedSlots);
      notifyAllSubscribers({ type: 'ORPHAN_SLOTS_CLEANED' });
    }
  } catch (e) {
    console.error('Error cleaning up orphan slots:', e);
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

  // Auto clean dummy booked slots
  cleanupOrphanSlots();

  // FIRESTORE REALTIME LISTENERS (MULTIDEVICE REALTIME SYNC)
  if (!isFirestoreListenerActive) {
    isFirestoreListenerActive = true;

    // Fetch initial documents immediately from Cloud
    getDocs(collection(db, 'bookings')).then(snapshot => {
      if (!snapshot.empty) {
        const remoteBookings = [];
        snapshot.forEach(docSnap => remoteBookings.push(docSnap.data()));
        remoteBookings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(remoteBookings));
        notifyAllSubscribers({ type: 'FIREBASE_BOOKING_INIT' });
      }
    }).catch(err => console.warn('Initial bookings getDocs err:', err));

    getDocs(collection(db, 'users')).then(snapshot => {
      if (!snapshot.empty) {
        const remoteUsers = [];
        snapshot.forEach(docSnap => remoteUsers.push(docSnap.data()));
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(remoteUsers));
        notifyAllSubscribers({ type: 'FIREBASE_USER_INIT' });
      }
    }).catch(err => console.warn('Initial users getDocs err:', err));

    // 1. Listen Bookings
    onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const remoteBookings = [];
      snapshot.forEach(docSnap => {
        remoteBookings.push(docSnap.data());
      });
      remoteBookings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(remoteBookings));

      cleanupOrphanSlots();
      notifyAllSubscribers({ type: 'FIREBASE_BOOKING_SYNC', timestamp: Date.now() });
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

      notifyAllSubscribers({ type: 'FIREBASE_SLOT_SYNC', timestamp: Date.now() });
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
        notifyAllSubscribers({ type: 'FIREBASE_USER_SYNC', timestamp: Date.now() });
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
          notifyAllSubscribers({ type: 'FIREBASE_SETTINGS_SYNC', timestamp: Date.now() });
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

export const registerNewUser = async ({ name, phone, password }) => {
  const phoneValidation = validateIndonesianPhone(phone);
  if (!phoneValidation.isValid) {
    return { success: false, error: phoneValidation.error };
  }

  const cleanPhone = phoneValidation.cleanPhone;
  const users = getRegisteredUsers();

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
  notifyAllSubscribers({ type: 'USER_REGISTERED', user: newUser });

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
  notifyAllSubscribers({ type: 'USER_CREATED_ADMIN', user: newUser });

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
    notifyAllSubscribers({ type: 'USER_UPDATED_ADMIN', user: users[idx] });

    broadcastChannel.postMessage({
      type: 'REALTIME_USER_UPDATED',
      user: users[idx],
      timestamp: Date.now()
    });

    return { success: true, user: users[idx] };
  }
  return { success: false, error: 'Akun user tidak ditemukan.' };
};

export const updateUserProfile = async (userId, { name, phone }) => {
  const phoneValidation = validateIndonesianPhone(phone);
  if (!phoneValidation.isValid) {
    return { success: false, error: phoneValidation.error };
  }

  const cleanPhone = phoneValidation.cleanPhone;
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.id === userId);

  const conflict = users.find(u => u.id !== userId && u.phone === cleanPhone);
  if (conflict) {
    return { success: false, error: 'Nomor WhatsApp ini sudah digunakan oleh akun pemain lain!' };
  }

  if (idx !== -1) {
    const updatedUser = {
      ...users[idx],
      name: name.trim(),
      phone: cleanPhone
    };

    users[idx] = updatedUser;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    const activeUser = getActiveUser();
    if (activeUser && activeUser.id === userId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(updatedUser));
    }

    syncUserToFirestore(updatedUser);
    notifyAllSubscribers({ type: 'USER_PROFILE_UPDATED', user: updatedUser });

    broadcastChannel.postMessage({
      type: 'REALTIME_USER_UPDATED',
      user: updatedUser,
      timestamp: Date.now()
    });

    return { success: true, user: updatedUser };
  }

  return { success: false, error: 'Akun pemain tidak ditemukan.' };
};

export const deleteUserAdmin = (userId) => {
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const deletedUser = users[idx];
    users.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    deleteUserFromFirestore(userId);
    notifyAllSubscribers({ type: 'USER_DELETED_ADMIN', userId });

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
    if (user.role === 'admin') {
      localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      sessionStorage.setItem('rts_admin_authenticated', 'true');
      localStorage.setItem('rts_admin_authenticated_v14', 'true');
      return { success: true, role: 'admin', user };
    }
    return { success: true, role: 'user', user };
  }

  return {
    success: false,
    error: 'Username / No. WA atau Password tidak ditemukan / salah. Silakan daftar akun baru di tab Daftar.'
  };
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

  notifyAllSubscribers({ type: 'BOOKING_CREATED', booking: newBooking });

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
    notifyAllSubscribers({ type: 'SLOT_TOGGLED', slot_id, newStatus });

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
    notifyAllSubscribers({ type: 'BOOKING_STATUS_UPDATED', booking_id: booking.id, newStatus });

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
    notifyAllSubscribers({ type: 'BOOKING_UPDATED', booking_id: oldBooking.id });

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
    notifyAllSubscribers({ type: 'BOOKING_DELETED', booking_id: bookingToDelete.id });

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
  notifyAllSubscribers({ type: 'SETTINGS_SAVED', settings: newSettings });
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
  notifyAllSubscribers({ type: 'BOOKINGS_DELETED_BULK', booking_ids: bookingIds });

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

  notifyAllSubscribers({ type: 'USERS_DELETED_BULK', user_ids: userIds });

  broadcastChannel.postMessage({
    type: 'REALTIME_USER_DELETED_BULK',
    user_ids: userIds,
    timestamp: Date.now()
  });

  return { success: true, count: userIds.length };
};
