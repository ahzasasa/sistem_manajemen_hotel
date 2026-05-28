-- ==========================================
-- 1. SETUP DATABASE
-- ==========================================
DROP DATABASE IF EXISTS hotel_reservasi_db;
CREATE DATABASE hotel_reservasi_db;
USE hotel_reservasi_db;

-- ==========================================
-- 2. TABEL MASTER
-- ==========================================

-- Data Tamu
CREATE TABLE tamu (
    id_tamu INT AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    nomor_telepon VARCHAR(15) NOT NULL
) ENGINE=InnoDB;

-- Data Tipe Kamar
CREATE TABLE tipe_kamar (
    id_tipe INT PRIMARY KEY,
    nama_tipe VARCHAR(50) NOT NULL,
    kapasitas INT NOT NULL DEFAULT 2,
    lantai_min INT,
    lantai_max INT,
    harga_per_malam DECIMAL(12, 2) NOT NULL
) ENGINE=InnoDB;

-- Data Fasilitas Tambahan
CREATE TABLE fasilitas (
    id_fasilitas INT AUTO_INCREMENT PRIMARY KEY,
    nama_fasilitas VARCHAR(100) NOT NULL,
    kategori ENUM('F&B', 'Event', 'Wellness') NOT NULL,
    harga_dasar DECIMAL(12,2) NOT NULL,
    satuan_harga VARCHAR(20) NOT NULL,
    deskripsi TEXT
) ENGINE=InnoDB;

-- Data Master Posisi (Sudah dilengkapi kolom counter untuk generator ID)
CREATE TABLE posisi (
    id_posisi INT AUTO_INCREMENT PRIMARY KEY,
    kode_posisi VARCHAR(10) NOT NULL UNIQUE,
    nama_posisi VARCHAR(50) NOT NULL,
    gaji_pokok DECIMAL(12,2) DEFAULT 0.00,
    tunjangan DECIMAL(12,2) DEFAULT 0.00,
    counter INT DEFAULT 0
) ENGINE=InnoDB;

-- Data Staf/Karyawan Hotel
CREATE TABLE staf (
    id_staf INT AUTO_INCREMENT PRIMARY KEY,
    kode_staf VARCHAR(20) UNIQUE,
    nama_staf VARCHAR(100) NOT NULL,
    id_posisi INT,
    nomor_telepon VARCHAR(15),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    FOREIGN KEY (id_posisi) REFERENCES posisi(id_posisi) ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE TABLE presensi (
    id_presensi INT AUTO_INCREMENT PRIMARY KEY,
    id_staf INT,
    tanggal DATE NOT NULL,
    waktu_masuk TIME,
    waktu_pulang TIME,
    status ENUM('Hadir', 'Izin', 'Sakit', 'Mangkir') DEFAULT 'Hadir',
    FOREIGN KEY (id_staf) REFERENCES staf(id_staf) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE slip_gaji (
    id_gaji INT AUTO_INCREMENT PRIMARY KEY,
    id_staf INT,
    periode_bulan VARCHAR(20) NOT NULL,
    gaji_pokok DECIMAL(12,2) NOT NULL,
    tunjangan DECIMAL(12,2) DEFAULT 0,
    potongan DECIMAL(12,2) DEFAULT 0,
    total_bersih DECIMAL(12,2) NOT NULL,
    tanggal_cair DATE,
    status_pembayaran ENUM('Pending', 'Terbayar') DEFAULT 'Pending',
    FOREIGN KEY (id_staf) REFERENCES staf(id_staf) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==========================================
-- 3. TRIGGERS UNTUK KODE STAF OTOMATIS
-- ==========================================

DELIMITER //

-- Trigger 1: Otomatis membuat ID saat mendaftarkan staf baru
CREATE TRIGGER trg_staf_insert
BEFORE INSERT ON staf
FOR EACH ROW
BEGIN
    DECLARE v_kode VARCHAR(10);
    DECLARE v_seq INT;

    -- Ambil kode (contoh: HK) dan naikkan angka counternya
    SELECT kode_posisi, counter + 1 INTO v_kode, v_seq
    FROM posisi WHERE id_posisi = NEW.id_posisi;

    -- Simpan urutan terbaru kembali ke tabel posisi
    UPDATE posisi SET counter = v_seq WHERE id_posisi = NEW.id_posisi;

    -- Gabungkan menjadi kode_staf (Contoh: HK-001)
    SET NEW.kode_staf = CONCAT(v_kode, '-', LPAD(v_seq, 3, '0'));
END //

-- Trigger 2: Otomatis mengubah ID jika staf dipindahtugaskan
CREATE TRIGGER trg_staf_update
BEFORE UPDATE ON staf
FOR EACH ROW
BEGIN
    DECLARE v_kode VARCHAR(10);
    DECLARE v_seq INT;

    -- Hanya ganti ID JIKA posisinya benar-benar diubah!
    IF NEW.id_posisi != OLD.id_posisi THEN
        
        -- Ambil kode dari posisi yang BARU
        SELECT kode_posisi, counter + 1 INTO v_kode, v_seq
        FROM posisi WHERE id_posisi = NEW.id_posisi;

        -- Simpan urutan terbaru ke tabel posisi
        UPDATE posisi SET counter = v_seq WHERE id_posisi = NEW.id_posisi;

        -- Timpa kode_staf lama dengan kode posisi yang baru!
        SET NEW.kode_staf = CONCAT(v_kode, '-', LPAD(v_seq, 3, '0'));
        
    END IF;
END //

DELIMITER ;


-- ==========================================
-- 4. TABEL FISIK & OPERASIONAL 
-- ==========================================

-- Data Fisik Kamar
CREATE TABLE kamar (
    id_kamar INT AUTO_INCREMENT PRIMARY KEY,
    id_tipe INT,
    nomor_kamar VARCHAR(10) UNIQUE NOT NULL,
    lantai INT,
    is_smoking BOOLEAN DEFAULT FALSE,
    status ENUM('Tersedia', 'Terisi', 'Kotor', 'Perbaikan') DEFAULT 'Tersedia',
    FOREIGN KEY (id_tipe) REFERENCES tipe_kamar(id_tipe) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Jadwal Pembersihan Kamar (Housekeeping)
CREATE TABLE jadwal_kebersihan (
    id_jadwal INT AUTO_INCREMENT PRIMARY KEY,
    id_kamar INT,
    id_staf INT,
    tanggal_tugas DATE NOT NULL,
    jenis_tugas ENUM('Pembersihan Rutin', 'Pembersihan Total', 'Perbaikan') DEFAULT 'Pembersihan Rutin',
    status_tugas ENUM('Menunggu', 'Sedang Dikerjakan', 'Selesai') DEFAULT 'Menunggu',
    FOREIGN KEY (id_kamar) REFERENCES kamar(id_kamar) ON DELETE CASCADE,
    FOREIGN KEY (id_staf) REFERENCES staf(id_staf) ON DELETE SET NULL
) ENGINE=InnoDB;


-- ==========================================
-- 5. TABEL RESERVASI (Inti Sistem)
-- ==========================================

-- Reservasi Utama (Kamar)
CREATE TABLE reservasi (
    id_reservasi VARCHAR(20) PRIMARY KEY, 
    id_tamu INT,
    tanggal_masuk DATETIME NOT NULL,
    tanggal_keluar DATETIME NOT NULL,
    status_pesanan ENUM('Menunggu', 'Aktif', 'Selesai', 'Batal') DEFAULT 'Menunggu',
    metode_pembayaran VARCHAR(50) DEFAULT 'Pay at Hotel', 
    FOREIGN KEY (id_tamu) REFERENCES tamu(id_tamu) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Detail Reservasi Kamar (Mendukung Multi-Kamar & Kunci Harga)
CREATE TABLE detail_reservasi (
    id_detail INT AUTO_INCREMENT PRIMARY KEY,
    id_reservasi VARCHAR(20),
    id_kamar INT,
    harga_terkunci DECIMAL(12, 2),
    FOREIGN KEY (id_reservasi) REFERENCES reservasi(id_reservasi) ON DELETE CASCADE,
    FOREIGN KEY (id_kamar) REFERENCES kamar(id_kamar) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Reservasi Fasilitas (Restoran, Spa, Event)
CREATE TABLE reservasi_fasilitas (
    id_res_fasilitas VARCHAR(20) PRIMARY KEY, 
    id_tamu INT,
    id_fasilitas INT,
    tanggal_acara DATE NOT NULL,
    waktu_mulai TIME NOT NULL,
    jumlah_tamu INT NOT NULL, 
    total_harga DECIMAL(12, 2) NOT NULL,
    status_pesanan ENUM('Menunggu', 'Dikonfirmasi', 'Batal', 'Selesai') DEFAULT 'Menunggu',
    metode_pembayaran VARCHAR(50),
    catatan_khusus TEXT, 
    FOREIGN KEY (id_tamu) REFERENCES tamu(id_tamu) ON DELETE CASCADE,
    FOREIGN KEY (id_fasilitas) REFERENCES fasilitas(id_fasilitas) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==========================================
-- 6. TABEL KEUANGAN (Billing & Payment)
-- ==========================================

-- Tagihan Komprehensif
CREATE TABLE invoice (
    id_invoice INT AUTO_INCREMENT PRIMARY KEY,
    id_reservasi VARCHAR(20) UNIQUE,
    total_kamar DECIMAL(12, 2) DEFAULT 0,
    total_fasilitas DECIMAL(12, 2) DEFAULT 0,
    pajak DECIMAL(12, 2) DEFAULT 0,
    diskon DECIMAL(12, 2) DEFAULT 0,
    total_bersih DECIMAL(12, 2) NOT NULL,
    status_pembayaran ENUM('Belum Dibayar', 'DP Dibayar', 'Lunas') DEFAULT 'Belum Dibayar',
    FOREIGN KEY (id_reservasi) REFERENCES reservasi(id_reservasi) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Riwayat Pembayaran / Cicilan
CREATE TABLE pembayaran (
    id_pembayaran INT AUTO_INCREMENT PRIMARY KEY,
    id_invoice INT,
    tanggal_bayar TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nominal DECIMAL(12, 2) NOT NULL,
    metode_pembayaran VARCHAR(50),
    referensi_transaksi VARCHAR(100),
    FOREIGN KEY (id_invoice) REFERENCES invoice(id_invoice) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==========================================
-- 7. DATA DEFAULT (Seed Data)
-- ==========================================

-- Masukkan Master Posisi
INSERT INTO posisi (kode_posisi, nama_posisi, gaji_pokok, tunjangan) VALUES
('MG', 'Manager', 8500000.00, 1500000.00),
('BO', 'Back Office', 5000000.00, 750000.00),
('FO', 'Front Office', 4800000.00, 600000.00),
('HK', 'Housekeeping', 4200000.00, 400000.00),
('FB', 'Food & Beverage', 4300000.00, 450000.00),
('WS', 'Wellness & SPA', 4400000.00, 500000.00),
('EN', 'Engineering', 4600000.00, 550000.00),
('SM', 'Sales & Marketing', 4700000.00, 800000.00);



-- ==========================================
-- 3. GENERATE SLIP GAJI OTOMATIS (BULAN INI)
-- ==========================================
-- Ubah format bulan ke Bahasa Indonesia
SET lc_time_names = 'id_ID';

-- Tarik data gaji berdasarkan posisi staf dan buatkan slipnya otomatis
INSERT INTO slip_gaji (id_staf, periode_bulan, gaji_pokok, tunjangan, potongan, total_bersih, tanggal_cair, status_pembayaran)
SELECT 
    s.id_staf, 
    DATE_FORMAT(CURDATE(), '%M %Y'),
    p.gaji_pokok,  
    p.tunjangan,   
    150000.00,
    (p.gaji_pokok + p.tunjangan - 150000.00), 
    DATE_FORMAT(CURDATE(), '%Y-%m-01'),
    'Terbayar'
FROM staf s
JOIN posisi p ON s.id_posisi = p.id_posisi;


-- ==========================================
-- MASUKKAN AKUN MASTER & STAF (K-UNIVERSE EDITION)
-- ==========================================
INSERT INTO staf (nama_staf, id_posisi, nomor_telepon, username, password) VALUES

-- 1. Manager (id_posisi = 1)
('Kim Do Hyun', 1, '081100000001', 'kim.dohyun', 'hotel123'),
('Lee Min Seok', 1, '081112223333', 'lee.minseok', 'hotel123'),
('Park Seo Jin', 1, '081100000003', 'park.seojin', 'hotel123'),

-- 2. Back Office (id_posisi = 2)
('Choi Yu Jin', 2, '081100000002', 'choi.yujin', 'hotel123'),
('Kang Seul Ha', 2, '081100000004', 'kang.seulha', 'hotel123'),
('Cha Eun Woo', 2, '081100000005', 'cha.eunwoo', 'hotel123'),
('Im Ju Kyung', 2, '081100000006', 'im.jukyung', 'hotel123'),

-- 3. Front Office (id_posisi = 3)
('Hwang Hyun Woo', 3, '081400003001', 'hwang.hyunwoo', 'hotel123'),
('Bae Su Jin', 3, '081400003002', 'bae.sujin', 'hotel123'),
('Kwon Eun Ah', 3, '081400003003', 'kwon.eunah', 'hotel123'),
('Yoon San Ha', 3, '081400003004', 'yoon.sanha', 'hotel123'),
('Ahn Yu Rim', 3, '081400003005', 'ahn.yurim', 'hotel123'),
('Song Ji Woo', 3, '081400003006', 'song.jiwoo', 'hotel123'),
('Lim Na Hee', 3, '081400003007', 'lim.nahee', 'hotel123'),
('Han So Yoon', 3, '081400003008', 'han.soyoon', 'hotel123'),

-- 4. Housekeeping (id_posisi = 4)
('Jung Eun Chae', 4, '081234567890', 'jung.eunchae', 'hotel123'),
('Kim Ji Hoon', 4, '081298765432', 'kim.jihoon', 'hotel123'),
('Lee Soo Jin', 4, '081311223344', 'lee.soojin', 'hotel123'),
('Park Min Ho', 4, '081200001001', 'park.minho', 'hotel123'),
('Choi Eun Ji', 4, '081200001002', 'choi.eunji', 'hotel123'),
('Kang Seung Ho', 4, '081200001003', 'kang.seungho', 'hotel123'),
('Jung Yoo Jin', 4, '081200001004', 'jung.yoojin', 'hotel123'),
('Shin Dong Woo', 4, '081200001005', 'shin.dongwoo', 'hotel123'),
('Jeon Ha Eun', 4, '081200001006', 'jeon.haeun', 'hotel123'),
('Min Ji Won', 4, '081200001007', 'min.jiwon', 'hotel123'),
('Song Jae Hyun', 4, '081200001008', 'song.jaehyun', 'hotel123'),
('Hwang Bo Ra', 4, '081200001009', 'hwang.bora', 'hotel123'),
('Bae Do Hoon', 4, '081200001010', 'bae.dohoon', 'hotel123'),
('Kwon Ji Hoon', 4, '081200001011', 'kwon.jihoon', 'hotel123'),
('Yoon Seo Yeon', 4, '081200001012', 'yoon.seoyeon', 'hotel123'),
('Ahn Sung Min', 4, '081200001013', 'ahn.sungmin', 'hotel123'),
('Oh Se Jin', 4, '081200001014', 'oh.sejin', 'hotel123'),
('Seo Ye Rin', 4, '081200001015', 'seo.yerin', 'hotel123'),
('Han Hyo Jin', 4, '081200001016', 'han.hyojin', 'hotel123'),
('Yoo Jae Min', 4, '081200001017', 'yoo.jaemin', 'hotel123'),
('Moon Dong Eun', 4, '081200001018', 'moon.dongeun', 'hotel123'),
('Go Yoon Ha', 4, '081200001019', 'go.yoonha', 'hotel123'),
('Baek Hyun Woo', 4, '081200001020', 'baek.hyunwoo', 'hotel123'),
('Hong Hae In', 4, '081200001021', 'hong.haein', 'hotel123'),
('Na Hee Do', 4, '081200001022', 'na.heedo', 'hotel123'),
('Baek Yi Jin', 4, '081200001023', 'baek.yijin', 'hotel123'),
('Sung Deok Sun', 4, '081200001024', 'sung.deoksun', 'hotel123'),
('Choi Taek', 4, '081200001025', 'choi.taek', 'hotel123'),
('Kim Jung Hwan', 4, '081200001026', 'kim.junghwan', 'hotel123'),
('Sung Sun Woo', 4, '081200001027', 'sung.sunwoo', 'hotel123'),
('Ryu Dong Ryong', 4, '081200001028', 'ryu.dongryong', 'hotel123'),
('Jang Geu Rae', 4, '081200001029', 'jang.geurae', 'hotel123'),
('Ahn Young Yi', 4, '081200001030', 'ahn.youngyi', 'hotel123'),

-- 5. Food & Beverage (id_posisi = 5)
('Kim Shin', 5, '081500004001', 'kim.shin', 'hotel123'),
('Ji Eun Tak', 5, '081500004002', 'ji.euntak', 'hotel123'),
('Wang Yeo', 5, '081500004003', 'wang.yeo', 'hotel123'),
('Lee Dam', 5, '081500004004', 'lee.dam', 'hotel123'),
('Shin Woo Yeo', 5, '081500004005', 'shin.wooyeo', 'hotel123'),
('Gye Sun Woo', 5, '081500004006', 'gye.sunwoo', 'hotel123'),
('Jo Yi Seo', 5, '081500004007', 'jo.yiseo', 'hotel123'),
('Park Sae Ro Yi', 5, '081500004008', 'park.saeroyi', 'hotel123'),

-- 6. Wellness & SPA (id_posisi = 6)
('Yoon Se Ri', 6, '081600005001', 'yoon.seri', 'hotel123'),
('Ri Jeong Hyeok', 6, '081600005002', 'ri.jeonghyeok', 'hotel123'),
('Seo Dan', 6, '081600005003', 'seo.dan', 'hotel123'),
('Gu Seung Joon', 6, '081600005004', 'gu.seungjoon', 'hotel123'),

-- 7. Engineering (id_posisi = 7)
('Lee Ik Jun', 7, '081555666777', 'lee.ikjun', 'hotel123'),
('Ahn Jeong Won', 7, '081300002001', 'ahn.jeongwon', 'hotel123'),
('Kim Jun Wan', 7, '081300002002', 'kim.junwan', 'hotel123'),
('Yang Seok Hyeong', 7, '081300002003', 'yang.seokhyeong', 'hotel123'),
('Chae Song Hwa', 7, '081300002004', 'chae.songhwa', 'hotel123'),
('Jang Gyeo Ul', 7, '081300002005', 'jang.gyeoul', 'hotel123'),
('Chu Min Ha', 7, '081300002006', 'chu.minha', 'hotel123'),
('Do Jae Hak', 7, '081300002007', 'do.jaehak', 'hotel123'),
('Hong Cha Young', 7, '081300002008', 'hong.chayoung', 'hotel123'),
('Jang Jun Woo', 7, '081300002009', 'jang.junwoo', 'hotel123'),
('Park Bin Ho', 7, '081300002010', 'park.binho', 'hotel123'),

-- 8. Sales & Marketing (id_posisi = 8)
('Oh Soo Ah', 8, '081700006001', 'oh.sooah', 'hotel123'),
('Jang Geun Won', 8, '081700006002', 'jang.geunwon', 'hotel123'),
('Kang Tae Moo', 8, '081700006003', 'kang.taemoo', 'hotel123'),
('Shin Ha Ri', 8, '081700006004', 'shin.hari', 'hotel123');



-- ==========================================
-- 6. INPUT DATA AWAL (Tipe Kamar, Fasilitas, Kamar Fisik)
-- ==========================================


-- Input Data Tipe Kamar (Dengan Kapasitas yang Benar)
INSERT INTO tipe_kamar VALUES 
(1, 'Standard King', 2, 3, 5, 500000),
(2, 'Standard Twin', 2, 3, 5, 500000),
(3, 'Superior Room', 2, 6, 8, 700000),
(4, 'Deluxe King', 2, 9, 14, 1200000),
(5, 'Deluxe Twin', 2, 9, 14, 1200000),
(6, 'Deluxe City View', 2, 9, 14, 1400000),
(7, 'Family King', 4, 15, 16, 1800000),
(8, 'Family Twin', 4, 15, 16, 1800000),
(9, 'Family Connecting', 4, 15, 16, 2000000),
(10, 'Connecting Room', 4, 17, 18, 2000000),
(11, 'Junior Suite', 2, 19, 21, 2500000),
(12, 'Suite Room', 2, 22, 24, 4000000),
(13, 'Presidential Suite', 4, 25, 25, 10000000);



INSERT INTO fasilitas (nama_fasilitas, kategori, harga_dasar, satuan_harga, deskripsi) VALUES
('Restaurant Reservation', 'F&B', 250000, 'per orang', 'Reservasi meja makan VIP dengan set menu eksklusif.'),
('Rooftop Bar', 'F&B', 150000, 'per orang', 'Akses ke rooftop bar dengan pemandangan kota, termasuk 1 welcome drink.'),
('Ballroom', 'Event', 35000000, 'per hari', 'Sewa ballroom utama berkapasitas besar untuk berbagai acara elegan.'),
('Meeting Room', 'Event', 550000, 'per orang', 'Paket Pertemuan Sehari Penuh (8 Jam) termasuk sewa ruangan, 2x Coffee Break & 1x Makan Siang/Malam.'),
('Wedding Package', 'Event', 85000000, 'per paket', 'Paket pernikahan komprehensif termasuk katering, dekorasi standar, dan kamar pengantin.'),
('Spa & Wellness', 'Wellness', 450000, 'per sesi', 'Sesi relaksasi pijat tradisional selama 90 menit oleh terapis profesional.');


INSERT INTO kamar (id_tipe, nomor_kamar, status) VALUES 

-- STANDARD

-- Lantai 3: 25 king, 15 twin
(1, '0301', 'Tersedia'),
(1, '0302', 'Tersedia'),
(1, '0303', 'Tersedia'),
(1, '0304', 'Tersedia'),
(1, '0305', 'Tersedia'),
(1, '0306', 'Tersedia'),
(1, '0307', 'Tersedia'),
(1, '0308', 'Tersedia'),
(1, '0309', 'Tersedia'),
(1, '0310', 'Tersedia'),
(1, '0311', 'Tersedia'),
(1, '0312', 'Tersedia'),
(1, '0313', 'Tersedia'),
(1, '0314', 'Tersedia'),
(1, '0315', 'Tersedia'),
(1, '0316', 'Tersedia'),
(1, '0317', 'Tersedia'),
(1, '0318', 'Tersedia'),
(1, '0319', 'Tersedia'),
(1, '0320', 'Tersedia'),
(1, '0321', 'Tersedia'),
(1, '0322', 'Tersedia'),
(1, '0323', 'Tersedia'),
(1, '0324', 'Tersedia'),
(2, '0325', 'Tersedia'),
(2, '0326', 'Tersedia'),
(2, '0327', 'Tersedia'),
(2, '0328', 'Tersedia'),
(2, '0329', 'Tersedia'),
(2, '0330', 'Tersedia'),
(2, '0331', 'Tersedia'),
(2, '0332', 'Tersedia'),
(2, '0333', 'Tersedia'),
(2, '0334', 'Tersedia'),
(2, '0335', 'Tersedia'),
(2, '0336', 'Tersedia'),
(2, '0337', 'Tersedia'),
(2, '0338', 'Tersedia'),
(2, '0339', 'Tersedia'),
(2, '0340', 'Tersedia'),


-- lantai 4: 25 king, 15 twin
(1, '0401', 'Tersedia'),
(1, '0402', 'Tersedia'),
(1, '0403', 'Tersedia'),
(1, '0404', 'Tersedia'),
(1, '0405', 'Tersedia'),
(1, '0406', 'Tersedia'),
(1, '0407', 'Tersedia'),
(1, '0408', 'Tersedia'),
(1, '0409', 'Tersedia'),
(1, '0410', 'Tersedia'),
(1, '0411', 'Tersedia'),
(1, '0412', 'Tersedia'),
(1, '0413', 'Tersedia'),
(1, '0414', 'Tersedia'),
(1, '0415', 'Tersedia'),
(1, '0416', 'Tersedia'),
(1, '0417', 'Tersedia'),
(1, '0418', 'Tersedia'),
(1, '0419', 'Tersedia'),
(1, '0420', 'Tersedia'),
(1, '0421', 'Tersedia'),
(1, '0422', 'Tersedia'),
(1, '0423', 'Tersedia'),
(1, '0424', 'Tersedia'),
(2, '0425', 'Tersedia'),
(2, '0426', 'Tersedia'),
(2, '0427', 'Tersedia'),
(2, '0428', 'Tersedia'),
(2, '0429', 'Tersedia'),
(2, '0430', 'Tersedia'),
(2, '0431', 'Tersedia'),
(2, '0432', 'Tersedia'),
(2, '0433', 'Tersedia'),
(2, '0434', 'Tersedia'),
(2, '0435', 'Tersedia'),
(2, '0436', 'Tersedia'),
(2, '0437', 'Tersedia'),
(2, '0438', 'Tersedia'),
(2, '0439', 'Tersedia'),
(2, '0440', 'Tersedia'),


-- lantai 5: 20 king, 20 twin
(1, '0501', 'Tersedia'),
(1, '0502', 'Tersedia'),
(1, '0503', 'Tersedia'),
(1, '0504', 'Tersedia'),
(1, '0505', 'Tersedia'),
(1, '0506', 'Tersedia'),
(1, '0507', 'Tersedia'),
(1, '0508', 'Tersedia'),
(1, '0509', 'Tersedia'),
(1, '0510', 'Tersedia'),
(1, '0511', 'Tersedia'),
(1, '0512', 'Tersedia'),
(1, '0513', 'Tersedia'),
(1, '0514', 'Tersedia'),
(1, '0515', 'Tersedia'),
(1, '0516', 'Tersedia'),
(1, '0517', 'Tersedia'),
(1, '0518', 'Tersedia'),
(1, '0519', 'Tersedia'),
(1, '0520', 'Tersedia'),
(2, '0521', 'Tersedia'),
(2, '0522', 'Tersedia'),
(2, '0523', 'Tersedia'),
(2, '0524', 'Tersedia'),
(2, '0525', 'Tersedia'),
(2, '0526', 'Tersedia'),
(2, '0527', 'Tersedia'),
(2, '0528', 'Tersedia'),
(2, '0529', 'Tersedia'),
(2, '0530', 'Tersedia'),
(2, '0531', 'Tersedia'),
(2, '0532', 'Tersedia'),
(2, '0533', 'Tersedia'),
(2, '0534', 'Tersedia'),
(2, '0535', 'Tersedia'),
(2, '0536', 'Tersedia'),
(2, '0537', 'Tersedia'),
(2, '0538', 'Tersedia'),
(2, '0539', 'Tersedia'),
(2, '0540', 'Tersedia'),



-- SUPERIOR

-- lantai 6: 30 superior
(3, '0601', 'Tersedia'),
(3, '0602', 'Tersedia'),
(3, '0603', 'Tersedia'),
(3, '0604', 'Tersedia'),
(3, '0605', 'Tersedia'),
(3, '0606', 'Tersedia'),
(3, '0607', 'Tersedia'),
(3, '0608', 'Tersedia'),
(3, '0609', 'Tersedia'),
(3, '0610', 'Tersedia'),
(3, '0611', 'Tersedia'),
(3, '0612', 'Tersedia'),
(3, '0613', 'Tersedia'),
(3, '0614', 'Tersedia'),
(3, '0615', 'Tersedia'),
(3, '0616', 'Tersedia'),
(3, '0617', 'Tersedia'),
(3, '0618', 'Tersedia'),
(3, '0619', 'Tersedia'),
(3, '0620', 'Tersedia'),
(3, '0621', 'Tersedia'),
(3, '0622', 'Tersedia'),
(3, '0623', 'Tersedia'),
(3, '0624', 'Tersedia'),
(3, '0625', 'Tersedia'),
(3, '0626', 'Tersedia'),
(3, '0627', 'Tersedia'),
(3, '0628', 'Tersedia'),
(3, '0629', 'Tersedia'),
(3, '0630', 'Tersedia'),


-- lantai 7: 30 superior
(3, '0701', 'Tersedia'),
(3, '0702', 'Tersedia'),
(3, '0703', 'Tersedia'),
(3, '0704', 'Tersedia'),
(3, '0705', 'Tersedia'),
(3, '0706', 'Tersedia'),
(3, '0707', 'Tersedia'),
(3, '0708', 'Tersedia'),
(3, '0709', 'Tersedia'),
(3, '0710', 'Tersedia'),
(3, '0711', 'Tersedia'),
(3, '0712', 'Tersedia'),
(3, '0713', 'Tersedia'),
(3, '0714', 'Tersedia'),
(3, '0715', 'Tersedia'),
(3, '0716', 'Tersedia'),
(3, '0717', 'Tersedia'),
(3, '0718', 'Tersedia'),
(3, '0719', 'Tersedia'),
(3, '0720', 'Tersedia'),
(3, '0721', 'Tersedia'),
(3, '0722', 'Tersedia'),
(3, '0723', 'Tersedia'),
(3, '0724', 'Tersedia'),
(3, '0725', 'Tersedia'),
(3, '0726', 'Tersedia'),
(3, '0727', 'Tersedia'),
(3, '0728', 'Tersedia'),
(3, '0729', 'Tersedia'),
(3, '0730', 'Tersedia'),


-- lantai 8: 30 superior
(3, '0801', 'Tersedia'),
(3, '0802', 'Tersedia'),
(3, '0803', 'Tersedia'),
(3, '0804', 'Tersedia'),
(3, '0805', 'Tersedia'),
(3, '0806', 'Tersedia'),
(3, '0807', 'Tersedia'),
(3, '0808', 'Tersedia'),
(3, '0809', 'Tersedia'),
(3, '0810', 'Tersedia'),
(3, '0811', 'Tersedia'),
(3, '0812', 'Tersedia'),
(3, '0813', 'Tersedia'),
(3, '0814', 'Tersedia'),
(3, '0815', 'Tersedia'),
(3, '0816', 'Tersedia'),
(3, '0817', 'Tersedia'),
(3, '0818', 'Tersedia'),
(3, '0819', 'Tersedia'),
(3, '0820', 'Tersedia'),
(3, '0821', 'Tersedia'),
(3, '0822', 'Tersedia'),
(3, '0823', 'Tersedia'),
(3, '0824', 'Tersedia'),
(3, '0825', 'Tersedia'),
(3, '0826', 'Tersedia'),
(3, '0827', 'Tersedia'),
(3, '0828', 'Tersedia'),
(3, '0829', 'Tersedia'),
(3, '0830', 'Tersedia'),


-- DELUXE

-- lantai 9: 12 king, 5 twin
(4, '0901', 'Tersedia'),
(4, '0902', 'Tersedia'),
(4, '0903', 'Tersedia'),
(4, '0904', 'Tersedia'),
(4, '0905', 'Tersedia'),
(4, '0906', 'Tersedia'),
(4, '0907', 'Tersedia'),
(4, '0908', 'Tersedia'),
(4, '0909', 'Tersedia'),
(4, '0910', 'Tersedia'),
(4, '0911', 'Tersedia'),
(4, '0912', 'Tersedia'),
(5, '0913', 'Tersedia'),
(5, '0914', 'Tersedia'),
(5, '0915', 'Tersedia'),
(5, '0916', 'Tersedia'),
(5, '0917', 'Tersedia'),


-- lantai 10: 12 king, 5 twin
(4, '1001', 'Tersedia'),
(4, '1002', 'Tersedia'),
(4, '1003', 'Tersedia'),
(4, '1004', 'Tersedia'),
(4, '1005', 'Tersedia'),
(4, '1006', 'Tersedia'),
(4, '1007', 'Tersedia'),
(4, '1008', 'Tersedia'),
(4, '1009', 'Tersedia'),
(4, '1010', 'Tersedia'),
(4, '1011', 'Tersedia'),
(4, '1012', 'Tersedia'),
(5, '1013', 'Tersedia'),
(5, '1014', 'Tersedia'),
(5, '1015', 'Tersedia'),
(5, '1016', 'Tersedia'),
(5, '1017', 'Tersedia'),


-- lantai 11: 12 king, 5 twin
(4, '1101', 'Tersedia'),
(4, '1102', 'Tersedia'),
(4, '1103', 'Tersedia'),
(4, '1104', 'Tersedia'),
(4, '1105', 'Tersedia'),
(4, '1106', 'Tersedia'),
(4, '1107', 'Tersedia'),
(4, '1108', 'Tersedia'),
(4, '1109', 'Tersedia'),
(4, '1110', 'Tersedia'),
(4, '1111', 'Tersedia'),
(4, '1112', 'Tersedia'),
(5, '1113', 'Tersedia'),
(5, '1114', 'Tersedia'),
(5, '1115', 'Tersedia'),
(5, '1116', 'Tersedia'),
(5, '1117', 'Tersedia'),


-- lantai 12: 12 king, 5 twin
(4, '1201', 'Tersedia'),
(4, '1202', 'Tersedia'),
(4, '1203', 'Tersedia'),
(4, '1204', 'Tersedia'),
(4, '1205', 'Tersedia'),
(4, '1206', 'Tersedia'),
(4, '1207', 'Tersedia'),
(4, '1208', 'Tersedia'),
(4, '1209', 'Tersedia'),
(4, '1210', 'Tersedia'),
(4, '1211', 'Tersedia'),
(4, '1212', 'Tersedia'),
(5, '1213', 'Tersedia'),
(5, '1214', 'Tersedia'),
(5, '1215', 'Tersedia'),
(5, '1216', 'Tersedia'),
(5, '1217', 'Tersedia'),


-- lantai 13: 12 king, 5 twin
(4, '1301', 'Tersedia'),
(4, '1302', 'Tersedia'),
(4, '1303', 'Tersedia'),
(4, '1304', 'Tersedia'),
(4, '1305', 'Tersedia'),
(4, '1306', 'Tersedia'),
(4, '1307', 'Tersedia'),
(4, '1308', 'Tersedia'),
(4, '1309', 'Tersedia'),
(4, '1310', 'Tersedia'),
(4, '1311', 'Tersedia'),
(4, '1312', 'Tersedia'),
(5, '1313', 'Tersedia'),
(5, '1314', 'Tersedia'),
(5, '1315', 'Tersedia'),
(5, '1316', 'Tersedia'),
(5, '1317', 'Tersedia'),


-- lantai 14: 20 city
(6, '1401', 'Tersedia'),
(6, '1402', 'Tersedia'),
(6, '1403', 'Tersedia'),
(6, '1404', 'Tersedia'),
(6, '1405', 'Tersedia'),
(6, '1406', 'Tersedia'),
(6, '1407', 'Tersedia'),
(6, '1408', 'Tersedia'),
(6, '1409', 'Tersedia'),
(6, '1410', 'Tersedia'),
(6, '1411', 'Tersedia'),
(6, '1412', 'Tersedia'),
(6, '1413', 'Tersedia'),
(6, '1414', 'Tersedia'),
(6, '1415', 'Tersedia'),
(6, '1416', 'Tersedia'),
(6, '1417', 'Tersedia'),
(6, '1418', 'Tersedia'),
(6, '1419', 'Tersedia'),
(6, '1420', 'Tersedia'),


-- FAMILY

-- lantai 15: 10 king, 5 connect
(7, '1501', 'Tersedia'),
(7, '1502', 'Tersedia'),
(7, '1503', 'Tersedia'),
(7, '1504', 'Tersedia'),
(7, '1505', 'Tersedia'),
(7, '1506', 'Tersedia'),
(7, '1507', 'Tersedia'),
(7, '1508', 'Tersedia'),
(7, '1509', 'Tersedia'),
(7, '1510', 'Tersedia'),
(9, '1511', 'Tersedia'),
(9, '1512', 'Tersedia'),
(9, '1513', 'Tersedia'),
(9, '1514', 'Tersedia'),
(9, '1515', 'Tersedia'),


-- lantai 16: 10 twin, 5 connect
(8, '1601', 'Tersedia'),
(8, '1602', 'Tersedia'),
(8, '1603', 'Tersedia'),
(8, '1604', 'Tersedia'),
(8, '1605', 'Tersedia'),
(8, '1606', 'Tersedia'),
(8, '1607', 'Tersedia'),
(8, '1608', 'Tersedia'),
(8, '1609', 'Tersedia'),
(8, '1610', 'Tersedia'),
(9, '1611', 'Tersedia'),
(9, '1612', 'Tersedia'),
(9, '1613', 'Tersedia'),
(9, '1614', 'Tersedia'),
(9, '1615', 'Tersedia'),


-- CONNECTING

-- lantai 17: 10 kamar
(10, '1701', 'Tersedia'),
(10, '1702', 'Tersedia'),
(10, '1703', 'Tersedia'),
(10, '1704', 'Tersedia'),
(10, '1705', 'Tersedia'),
(10, '1706', 'Tersedia'),
(10, '1707', 'Tersedia'),
(10, '1708', 'Tersedia'),
(10, '1709', 'Tersedia'),
(10, '1710', 'Tersedia'),

-- lantai 18: 10 kamar
(10, '1801', 'Tersedia'),
(10, '1802', 'Tersedia'),
(10, '1803', 'Tersedia'),
(10, '1804', 'Tersedia'),
(10, '1805', 'Tersedia'),
(10, '1806', 'Tersedia'),
(10, '1807', 'Tersedia'),
(10, '1808', 'Tersedia'),
(10, '1809', 'Tersedia'),
(10, '1810', 'Tersedia'),


-- JUNIOR SUITE

-- lantai 19: 8 kamar
(11, '1901', 'Tersedia'),
(11, '1902', 'Tersedia'),
(11, '1903', 'Tersedia'),
(11, '1904', 'Tersedia'),
(11, '1905', 'Tersedia'),
(11, '1906', 'Tersedia'),
(11, '1907', 'Tersedia'),
(11, '1908', 'Tersedia'),

-- lantai 20: 8 kamar
(11, '2001', 'Tersedia'),
(11, '2002', 'Tersedia'),
(11, '2003', 'Tersedia'),
(11, '2004', 'Tersedia'),
(11, '2005', 'Tersedia'),
(11, '2006', 'Tersedia'),
(11, '2007', 'Tersedia'),
(11, '2008', 'Tersedia'),

-- lantai 21: 8 kamar
(11, '2101', 'Tersedia'),
(11, '2102', 'Tersedia'),
(11, '2103', 'Tersedia'),
(11, '2104', 'Tersedia'),
(11, '2105', 'Tersedia'),
(11, '2106', 'Tersedia'),
(11, '2107', 'Tersedia'),
(11, '2108', 'Tersedia'),


-- SUITE

-- lantai 22: 6 kamar
(12, '2201', 'Tersedia'),
(12, '2202', 'Tersedia'),
(12, '2203', 'Tersedia'),
(12, '2204', 'Tersedia'),
(12, '2205', 'Tersedia'),
(12, '2206', 'Tersedia'),

-- lantai 23: 6 kamar
(12, '2301', 'Tersedia'),
(12, '2302', 'Tersedia'),
(12, '2303', 'Tersedia'),
(12, '2304', 'Tersedia'),
(12, '2305', 'Tersedia'),
(12, '2306', 'Tersedia'),

-- lantai 24: 6 kamar
(12, '2401', 'Tersedia'),
(12, '2402', 'Tersedia'),
(12, '2403', 'Tersedia'),
(12, '2404', 'Tersedia'),
(12, '2405', 'Tersedia'),
(12, '2406', 'Tersedia'),

-- PRESIDENTIAL SUITE
(13, '2501', 'Tersedia'),
(13, '2502', 'Tersedia'),
(13, '2503', 'Tersedia'),
(13, '2504', 'Tersedia');
