/**
 * Utility Service untuk Membuat, Mengunduh, dan Mencetak E-Tiket / Struk Reservasi Resmi GOR MBS
 */

export const generateETicketCanvas = (booking) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1150;
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient Modern Dark
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1150);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1150);

    // Outer Border Frame
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 1110);

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, 748, 1098);

    // Header Logo Circle & Icon
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(400, 90, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏸', 400, 102);

    // Title Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('GOR MBS (Mandiri Bengle Sejahtera)', 400, 165);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('E-TIKET & STRUK RESERVASI RESMI', 400, 195);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 215);
    ctx.lineTo(750, 215);
    ctx.stroke();

    // Kode Booking Box
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(150, 230, 500, 60, 12);
    } else {
      ctx.rect(150, 230, 500, 60);
    }
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.stroke();

    const code = booking.booking_code || booking.group_id || 'BKG-MBS';
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`KODE BOOKING: ${code}`, 400, 267);

    // Draw QR Code
    const qrValue = booking.qr_code_token || booking.booking_code || code;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}&color=000000&bgcolor=ffffff`;

    const qrImg = new Image();
    qrImg.crossOrigin = 'Anonymous';
    qrImg.onload = () => {
      // Draw QR Box Background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(290, 310, 220, 220, 16);
      } else {
        ctx.rect(290, 310, 220, 220);
      }
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.drawImage(qrImg, 300, 320, 200, 200);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`TOKEN QR: ${qrValue}`, 400, 550);

      // Section Detail Card
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(50, 570, 700, 380, 16);
      } else {
        ctx.rect(50, 570, 700, 380);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('RINCIAN RESERVASI', 80, 610);

      // Divider inside details
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(80, 625);
      ctx.lineTo(720, 625);
      ctx.stroke();

      const details = [
        { label: 'Nama Pemain / Member', val: booking.customer_name || booking.name || '-' },
        { label: 'No. WhatsApp', val: booking.customer_phone || booking.phone || '-' },
        { label: 'Tanggal Sewa', val: booking.booking_date || '-' },
        { label: 'Lapangan', val: booking.staff_name || booking.court_name || 'Lapangan A' },
        { label: 'Jam & Durasi Main', val: `${booking.booking_time || booking.start_time || ''} (${booking.duration_hours || 1} Jam)` },
        { label: 'Jumlah Pemain', val: `${booking.player_count || 4} Orang` },
        { label: 'Status Reservasi', val: (booking.status || 'TERKONFIRMASI').toUpperCase() },
        { label: 'Total Pembayaran', val: `Rp ${(booking.total_amount || 0).toLocaleString('id-ID')}` }
      ];

      let yPos = 660;
      details.forEach((d) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(d.label + ':', 80, yPos);

        if (d.label === 'Total Pembayaran') {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 16px sans-serif';
        } else if (d.label === 'Status Reservasi') {
          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 15px sans-serif';
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
        }

        ctx.textAlign = 'right';
        ctx.fillText(d.val, 720, yPos);
        ctx.textAlign = 'left';

        yPos += 36;
      });

      // Notice Box at Footer
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(50, 970, 700, 80, 12);
      } else {
        ctx.rect(50, 970, 700, 80);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('💡 PETUNJUK CHECK-IN GOR MBS:', 400, 1000);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      ctx.fillText('Tunjukkan QR Code E-Tiket ini kepada petugas kasir GOR MBS saat Anda tiba di lokasi.', 400, 1025);

      // Footer Watermark
      const printDate = new Date().toLocaleString('id-ID');
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText(`Dicetak otomatis dari Sistem Booking GOR MBS pada ${printDate}`, 400, 1090);

      resolve(canvas);
    };

    qrImg.onerror = () => {
      // Fallback jika QR image error (gambar text kode)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(290, 310, 220, 220, 16);
      } else {
        ctx.rect(290, 310, 220, 220);
      }
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(code, 400, 420);

      resolve(canvas);
    };

    qrImg.src = qrApiUrl;
  });
};

export const downloadETicketPNG = async (booking) => {
  try {
    const canvas = await generateETicketCanvas(booking);
    const imageURI = canvas.toDataURL('image/png');
    const code = booking.booking_code || booking.group_id || 'MBS';
    
    const link = document.createElement('a');
    link.download = `ETiket_GOR_MBS_${code}.png`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  } catch (error) {
    console.error('[Download ETicket Error]:', error);
    return { success: false, error: error.message };
  }
};

export const printETicket = async (booking) => {
  try {
    const canvas = await generateETicketCanvas(booking);
    const imageURI = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return { success: false, error: 'Popup diblokir oleh browser.' };

    const code = booking.booking_code || booking.group_id || 'MBS';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Struk E-Tiket GOR MBS - ${code}</title>
          <style>
            body { margin: 0; padding: 20px; background: #111; display: flex; justify-content: center; align-items: center; font-family: sans-serif; }
            img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            @media print {
              body { background: white; padding: 0; }
              img { max-width: 100%; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <img src="${imageURI}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
    return { success: true };
  } catch (error) {
    console.error('[Print ETicket Error]:', error);
    return { success: false, error: error.message };
  }
};
