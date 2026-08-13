/**
 * MODUL INTEGRASI WHATSAPP API - GOR BULU TANGKIS (3 LAPANGAN)
 * Pesan Berperspektif Pemain (User) -> Admin GOR
 */

import { getSettings } from './realtimeStore';

export const formatPhoneForWA = (phone) => {
  if (!phone) return '62895349066544';
  let clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
};

// FORMAT PESAN DARI PERSPEKTIF PEMAIN / USER SANGAT SOPAN -> WA ADMIN
export const formatAdminWAMessage = (bookingData) => {
  const {
    booking_code,
    customer_name,
    customer_phone,
    staff_name,
    booking_date,
    booking_time,
    player_count,
    total_amount,
    qr_code_token,
    notes
  } = bookingData;

  const formattedAmount = Number(total_amount).toLocaleString('id-ID');

  return `Halo Admin GOR Bulu Tangkis 🏸,

Saya baru saja melakukan booking sewa lapangan melalui website. Berikut rincian reservasi saya:

• Nama Pemain: *${customer_name}*
• No. WhatsApp: *${customer_phone}*
• Kode Booking: *${booking_code}*
• Lapangan: *${staff_name}*
• Jumlah Pemain: *${player_count} Orang*
• Jadwal Main: *${booking_date}* (${booking_time} WIB)
• Total Tarif: *Rp ${formattedAmount}*
• Token QR Tiket: *${qr_code_token}*
${notes ? `• Catatan: *${notes}*\n` : ''}
Mohon konfirmasi dan verifikasinya ya Admin. Terima kasih! 🙏`;
};

// FORMAT PESAN BALASAN DARI ADMIN -> PEMAIN / USER (SAAT VERIFIKASI QR)
export const formatCustomerVerifiedWAMessage = (bookingData) => {
  const {
    booking_code,
    customer_name,
    staff_name,
    booking_date,
    booking_time,
    player_count,
    total_amount
  } = bookingData;

  const formattedAmount = Number(total_amount).toLocaleString('id-ID');

  return `Halo *${customer_name}* 👋,

Tiket reservasi lapangan bulu tangkis Anda telah kami verifikasi!

• Kode Booking: *${booking_code}*
• Lapangan: *${staff_name}*
• Jumlah Pemain: *${player_count} Orang*
• Jadwal Main: *${booking_date}* (${booking_time} WIB)
• Total Bayar: *Rp ${formattedAmount}*

Status: *VERIFIED & READY TO PLAY* ✅

Selamat bertanding dan selamat bermain! 🏸🔥`;
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
