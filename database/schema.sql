-- ============================================================================
-- SKEMA DATABASE SYSTEM BOOKING REAL-TIME (PostgreSQL / Supabase Compatible)
-- ============================================================================
-- Fitur: Multi-layanan, Multi-staf, Slot Jadwal, Prevent Double-Booking Transaction,
--        Kode Promo, Notifikasi WhatsApp, QR Ticket Check-In.
-- ============================================================================

-- Extension untuk UUID & Kriptografi (jika diperlukan)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL LAYANAN (SERVICES)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 60,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    category VARCHAR(50) DEFAULT 'Umum',
    icon_name VARCHAR(50) DEFAULT 'calendar',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL STAF / RESOURCE (STAFF)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) DEFAULT 'Spesialis',
    email VARCHAR(100),
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Relasi Staf & Layanan (Many-to-Many)
CREATE TABLE IF NOT EXISTS staff_services (
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- 3. TABEL SLOT JADWAL (SCHEDULE_SLOTS)
CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Status: 'available' (Tersedia), 'booked' (Sudah Dibooking), 'blocked' (Ditutup Admin)
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_staff_time_slot UNIQUE (staff_id, slot_date, start_time)
);

-- Index untuk percepatan query pencarian slot realtime
CREATE INDEX IF NOT EXISTS idx_slots_date_status ON schedule_slots(slot_date, status);

-- 4. TABEL PROMO CODES (KUPON DISKON)
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    max_uses INT DEFAULT 100,
    current_uses INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. TABEL BOOKING (BOOKINGS)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) UNIQUE NOT NULL, -- Contoh: BKG-20260813-89F1
    service_id UUID REFERENCES services(id),
    staff_id UUID REFERENCES staff(id),
    slot_id UUID REFERENCES schedule_slots(id),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    
    -- Data Diri Pelanggan
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(100),
    notes TEXT,
    
    -- Status & Financial
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    promo_code_used VARCHAR(30),
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    -- Status: 'confirmed', 'cancelled', 'completed', 'no_show'
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- E-Ticket QR Code & Verification
    qr_code_token VARCHAR(100) UNIQUE NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- WhatsApp Log Status
    wa_sent_user BOOLEAN DEFAULT FALSE,
    wa_sent_admin BOOLEAN DEFAULT FALSE,
    
    cancel_token VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian pesanan pelanggan
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);

-- 6. TABEL ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STORED PROCEDURE: TRANSACTION LOCKING (ANTI DOUBLE BOOKING)
-- ============================================================================
-- Fungsi ini mengeksekusi operasi booking secara atomic menggunakan `FOR UPDATE` lock.
-- Jika dua user secara bersamaan mencoba memilih slot yang sama, hanya satu transaction
-- yang berhasil, user kedua akan menerima error "Slot sudah terisi".
-- ============================================================================

CREATE OR REPLACE FUNCTION book_slot_atomic(
    p_service_id UUID,
    p_staff_id UUID,
    p_slot_id UUID,
    p_customer_name VARCHAR(100),
    p_customer_phone VARCHAR(30),
    p_customer_email VARCHAR(100),
    p_notes TEXT,
    p_promo_code VARCHAR(30)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_slot_record RECORD;
    v_service_record RECORD;
    v_booking_code VARCHAR(20);
    v_qr_token VARCHAR(100);
    v_cancel_token VARCHAR(100);
    v_final_price DECIMAL(12, 2);
    v_discount_percent INT := 0;
    v_discount_val DECIMAL(12, 2) := 0.00;
    v_new_booking_id UUID;
BEGIN
    -- 1. Lock baris slot yang bersangkutan dengan FOR UPDATE untuk pencegahan race condition
    SELECT * INTO v_slot_record
    FROM schedule_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    -- Validasi ketersediaan slot
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot waktu tidak ditemukan.';
    END IF;

    IF v_slot_record.status != 'available' THEN
        RAISE EXCEPTION 'Slot waktu ini baru saja dibooking oleh pengguna lain. Silakan pilih slot jam lain.';
    END IF;

    -- 2. Ambil detail harga layanan
    SELECT * INTO v_service_record FROM services WHERE id = p_service_id;
    v_final_price := v_service_record.price;

    -- 3. Hitung Diskon Kupon jika ada
    IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
        SELECT discount_percent INTO v_discount_percent
        FROM promo_codes
        WHERE code = p_promo_code AND is_active = TRUE AND current_uses < max_uses;
        
        IF FOUND THEN
            v_discount_val := (v_final_price * v_discount_percent / 100.0);
            v_final_price := v_final_price - v_discount_val;
            
            -- Update kupon
            UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = p_promo_code;
        END IF;
    END IF;

    -- 4. Ubah status slot menjadi 'booked'
    UPDATE schedule_slots
    SET status = 'booked'
    WHERE id = p_slot_id;

    -- 5. Generate Kode Unik
    v_booking_code := 'BKG-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    v_qr_token := 'QR-' || MD5(RANDOM()::TEXT);
    v_cancel_token := 'MNG-' || MD5(RANDOM()::TEXT);

    -- 6. Insert data booking
    INSERT INTO bookings (
        booking_code, service_id, staff_id, slot_id, booking_date, booking_time,
        customer_name, customer_phone, customer_email, notes,
        total_amount, promo_code_used, discount_amount, status, qr_code_token, cancel_token
    ) VALUES (
        v_booking_code, p_service_id, p_staff_id, p_slot_id, v_slot_record.slot_date, v_slot_record.start_time,
        p_customer_name, p_customer_phone, p_customer_email, p_notes,
        v_final_price, p_promo_code, v_discount_val, 'confirmed', v_qr_token, v_cancel_token
    )
    RETURNING id INTO v_new_booking_id;

    -- 7. Return object JSON sukses
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_booking_id,
        'booking_code', v_booking_code,
        'qr_token', v_qr_token,
        'cancel_token', v_cancel_token,
        'message', 'Booking berhasil dikonfirmasi!'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
