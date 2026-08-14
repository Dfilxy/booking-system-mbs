/**
 * MODUL INTEGRASI WHATSAPP API & TEMPLATE PESAN RESMI - GOR MBS
 * Template Notifikasi Bersih, Informatif, & Profesional Tanpa Emoji Berlebihan
 */

import { getSettings } from './realtimeStore';

export const formatPhoneForWA = (phone) => {
  if (!phone) return '628812176486';
  let clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
};

// 1. FORMAT NOTIFIKASI RESERVASI BARU UNTUK ADMIN (DARI PEMAIN -> WA ADMIN)
export const formatAdminWAMessage = (bookingData) => {
  const {
    booking_code,
    customer_name,
    customer_phone,
    staff_name,
    booking_date,
    booking_time,
    duration_hours,
    player_count,
    total_amount,
    qr_code_token,
    notes
  } = bookingData;

  const formattedAmount = Number(total_amount).toLocaleString('id-ID');
  const duration = duration_hours || 1;

  return `*NOTIFIKASI RESERVASI BARU - GOR MBS*

Yth. Admin GOR MBS,
Berikut adalah rincian reservasi sewa lapangan badminton baru yang baru saja didaftarkan melalui website:

*INFORMASI PEMESAN:*
- Nama Pemain: ${customer_name}
- No. WhatsApp: ${customer_phone}

*RINCIAN SEWA LAPANGAN:*
- Kode Booking: ${booking_code}
- Lapangan: ${staff_name}
- Tanggal Main: ${booking_date}
- Jam Main: ${booking_time} WIB (${duration} Jam)
- Jumlah Pemain: ${player_count} Orang
- Total Tarif: Rp ${formattedAmount}
- Token QR Check-In: ${qr_code_token}
${notes ? `- Catatan Tambahan: ${notes}\n` : ''}
Mohon konfirmasi dan verifikasi reservasi ini pada sistem Admin. Terima kasih.`;
};

// 2. FORMAT BUKTI KONFIRMASI TIKET UNTUK PEMAIN (BALASAN ADMIN -> WA PEMAIN)
export const formatCustomerVerifiedWAMessage = (bookingData) => {
  const {
    booking_code,
    customer_name,
    customer_phone,
    staff_name,
    booking_date,
    booking_time,
    duration_hours,
    player_count,
    total_amount,
    qr_code_token
  } = bookingData;

  const formattedAmount = Number(total_amount).toLocaleString('id-ID');
  const duration = duration_hours || 1;

  return `*BUKTI KONFIRMASI RESERVASI - GOR MBS*

Yth. Sdr/i *${customer_name}*,
Terima kasih telah melakukan pemesanan sewa lapangan di GOR MBS (Mandiri Bengle Sejahtera). Tiket reservasi Anda telah berhasil terverifikasi.

*RINCIAN TIKET AN DARA:*
- Kode Booking: ${booking_code}
- Nama Pemesan: ${customer_name}
- No. WhatsApp: ${customer_phone || '-'}
- Lapangan: ${staff_name}
- Tanggal Main: ${booking_date}
- Jam Main: ${booking_time} WIB (${duration} Jam)
- Jumlah Pemain: ${player_count} Orang
- Total Bayar: Rp ${formattedAmount}
- Status Tiket: Terverifikasi (Siap Bermain)
- Token QR Check-In: ${qr_code_token || booking_code}

*PETUNJUK CHEK-IN DI LOKASI:*
Silakan tunjukkan Kode Booking atau Token QR di atas kepada kasir saat Anda tiba di GOR MBS.

- Lokasi GOR: Citra Kebun Mas Blok B, Bengle, Kec. Majalaya, Karawang, Jawa Barat 41371.
- Jam Operasional: 08.00 - 23.00 WIB.

Selamat bermain dan nikmati pertandingan Anda!`;
};

export const sendWhatsAppFonnte = async ({ target, message, apiKey }) => {
  if (!apiKey) {
    return { success: false, error: 'Fonnte API Token tidak dikonfigurasi.' };
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: target,
        message: message,
        countryCode: '62'
      })
    });

    const data = await response.json();
    return { success: data.status === true, response: data };
  } catch (error) {
    console.error('[WA Service Fonnte Error]:', error);
    return { success: false, error: error.message };
  }
};

export const dispatchAdminWhatsAppNotification = async (bookingData, customConfig = {}) => {
  const savedSettings = getSettings() || {};
  
  const rawAdminPhone = customConfig.adminPhone || savedSettings.adminPhone || '08812176486';
  const apiKey = customConfig.apiKey || savedSettings.fonnteApiKey || '';

  const adminPhone = formatPhoneForWA(rawAdminPhone);
  const adminMsg = formatAdminWAMessage(bookingData);
  const adminWaUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMsg)}`;

  let adminResult = { success: false };

  if (apiKey) {
    adminResult = await sendWhatsAppFonnte({
      target: adminPhone,
      message: adminMsg,
      apiKey
    });
  }

  return {
    adminResult,
    adminMsg,
    adminPhone,
    adminWaUrl
  };
};
