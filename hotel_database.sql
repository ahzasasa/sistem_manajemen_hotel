-- 1. Reset Database
DROP DATABASE IF EXISTS hotel_reservasi_db;
CREATE DATABASE hotel_reservasi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_reservasi_db;

-- 2. Tabel Master
CREATE TABLE tamu (
    id_tamu INT AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    nomor_telepon VARCHAR(15) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tipe_kamar (
    id_tipe INT PRIMARY KEY,
    nama_tipe VARCHAR(50) NOT NULL,
    kapasitas INT NOT NULL DEFAULT 2,
    lantai_min INT,
    lantai_max INT,
    harga_per_malam DECIMAL(12, 2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE kamar (
    id_kamar INT AUTO_INCREMENT PRIMARY KEY,
    id_tipe INT,
    nomor_kamar VARCHAR(10),
    lantai INT,
    is_smoking BOOLEAN DEFAULT FALSE,
    status ENUM('Tersedia', 'Terisi') DEFAULT 'Tersedia',
    FOREIGN KEY (id_tipe) REFERENCES tipe_kamar(id_tipe) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reservasi (
    id_reservasi VARCHAR(20) PRIMARY KEY, -- Mendukung ID Cerdas: 2501-1
    id_tamu INT,
    tanggal_masuk DATETIME NOT NULL,
    tanggal_keluar DATETIME NOT NULL,
    status_pesanan ENUM('Menunggu', 'Dikonfirmasi', 'Selesai') DEFAULT 'Menunggu',
    metode_pembayaran VARCHAR(50) DEFAULT 'Pay at Hotel', -- FITUR BARU: Menyimpan metode bayar E-Voucher
    FOREIGN KEY (id_tamu) REFERENCES tamu(id_tamu) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE detail_reservasi (
    id_detail INT AUTO_INCREMENT PRIMARY KEY,
    id_reservasi VARCHAR(20),
    id_kamar INT,
    harga_terkunci DECIMAL(12, 2),
    FOREIGN KEY (id_reservasi) REFERENCES reservasi(id_reservasi) ON DELETE CASCADE,
    FOREIGN KEY (id_kamar) REFERENCES kamar(id_kamar) ON DELETE CASCADE
) ENGINE=InnoDB;


-- 1. Tabel Master Fasilitas
CREATE TABLE fasilitas (
    id_fasilitas INT AUTO_INCREMENT PRIMARY KEY,
    nama_fasilitas VARCHAR(100) NOT NULL,
    kategori ENUM('F&B', 'Event', 'Wellness') NOT NULL,
    harga_dasar DECIMAL(12,2) NOT NULL,
    satuan_harga VARCHAR(20) NOT NULL,
    deskripsi TEXT
) ENGINE=InnoDB;

-- 2. Tabel Transaksi Reservasi Fasilitas (INI YANG ADA ID-NYA)
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


-- 3. Input Data Tipe Kamar (Dengan Kapasitas yang Benar)
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


INSERT INTO fasilitas (nama_fasilitas, kategori, harga_dasar, satuan_harga, deskripsi) VALUES
('Restaurant Reservation', 'F&B', 250000, 'per orang', 'Reservasi meja makan VIP dengan set menu eksklusif.'),
('Rooftop Bar', 'F&B', 150000, 'per orang', 'Akses ke rooftop bar dengan pemandangan kota, termasuk 1 welcome drink.'),
('Ballroom', 'Event', 35000000, 'per hari', 'Sewa ballroom utama berkapasitas besar untuk berbagai acara elegan.'),
('Meeting Room', 'Event', 550000, 'per orang', 'Paket Pertemuan Sehari Penuh (8 Jam) termasuk sewa ruangan, 2x Coffee Break & 1x Makan Siang/Malam.'),
('Wedding Package', 'Event', 85000000, 'per paket', 'Paket pernikahan komprehensif termasuk katering, dekorasi standar, dan kamar pengantin.'),
('Spa & Wellness', 'Wellness', 450000, 'per sesi', 'Sesi relaksasi pijat tradisional selama 90 menit oleh terapis profesional.');