from flask import Flask, jsonify, request
from datetime import datetime
import mysql.connector
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)
# Mengaktifkan CORS agar frontend (HTML/JS) diizinkan mengambil data dari backend Python
CORS(app)

# ==========================================
# KONFIGURASI KONEKSI DATABASE
# ==========================================
def get_db_connection():
    connection = mysql.connector.connect(
        host='localhost',
        user='root',       # Sesuaikan dengan username MySQL Anda
        password='',       # Kosongkan jika menggunakan XAMPP bawaan
        database='hotel_reservasi_db'
    )
    return connection


# ==========================================
# FUNGSI BANTUAN (HELPER)
# ==========================================
def generasi_kode_staf(id_posisi, cursor):
    # 1. Tarik kode_posisi dari tabel master 'posisi' berdasarkan ID
    cursor.execute("SELECT kode_posisi FROM posisi WHERE id_posisi = %s", (id_posisi,))
    hasil_posisi = cursor.fetchone()

    # Jika ID posisi tidak ditemukan, gunakan 'STF' sebagai cadangan
    prefix_posisi = hasil_posisi['kode_posisi'] if hasil_posisi else 'STF'
    prefix = f"{prefix_posisi}-"

    # 2. Cari kode_staf terakhir dengan prefix yang sama di tabel staf
    cursor.execute("""
        SELECT kode_staf FROM staf 
        WHERE kode_staf LIKE %s 
        ORDER BY LENGTH(kode_staf) DESC, kode_staf DESC LIMIT 1
    """, (prefix + '%',))
    
    last_staf = cursor.fetchone()

    # 3. Potong teks urutan belakang, lalu naikkan 1 angka dengan zero-padding
    if last_staf and last_staf['kode_staf']:
        last_num = int(last_staf['kode_staf'].split('-')[-1])
        next_kode = f"{prefix}{str(last_num + 1).zfill(3)}"
    else:
        next_kode = f"{prefix}001"

    return next_kode


# ==========================================
# ENDPOINT API
# ==========================================

# 1. Endpoint Uji Coba Server
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "success",
        "message": "Server Backend Hotel Reservasi Berjalan Normal!"
    })


# 2. Endpoint Mengambil Data Seluruh Tipe Kamar (Digunakan di Beranda & Detail)
@app.route('/api/tipe-kamar', methods=['GET'])
def get_tipe_kamar():
    conn = None
    cursor = None
    try:
        # Membuka koneksi
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        # Menarik data tipe kamar
        cursor.execute("SELECT * FROM tipe_kamar")
        data_kamar = cursor.fetchall()
        
        return jsonify(data_kamar)
        
    except Exception as e:
        # Menangkap dan menampilkan pesan jika terjadi kegagalan (misal: XAMPP mati)
        return jsonify({"status": "error", "message": str(e)}), 500
        
    finally:
        # Blok ini dipastikan akan berjalan untuk menutup jalan koneksi database
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# 3. Endpoint Pencarian Kamar Tersedia (Persiapan Fitur Booking Engine)
@app.route('/api/cari-kamar', methods=['GET'])
def cari_kamar():
    # 1. Ambil parameter dari URL
    checkin = request.args.get('checkin')
    checkout = request.args.get('checkout')
    kapasitas = request.args.get('kapasitas', 1)
    
    if not checkin or not checkout:
        return jsonify({"status": "error", "message": "Tanggal wajib diisi."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 2. Query mencari tipe kamar yang tersedia di rentang tanggal tersebut
        query = """
            SELECT DISTINCT tk.* FROM tipe_kamar tk
            JOIN kamar k ON tk.id_tipe = k.id_tipe
            WHERE tk.kapasitas >= %s
            AND k.id_kamar NOT IN (
                SELECT d.id_kamar 
                FROM detail_reservasi d
                JOIN reservasi r ON d.id_reservasi = r.id_reservasi
                WHERE NOT (r.tanggal_keluar <= %s OR r.tanggal_masuk >= %s)
            )
        """
        cursor.execute(query, (kapasitas, checkin, checkout))
        kamar_tersedia = cursor.fetchall()
        return jsonify(kamar_tersedia)
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# 4. Endpoint Cek Status Pesanan
@app.route('/api/cek-pesanan', methods=['GET'])
def cek_pesanan():
    id_res = request.args.get('id')
    email = request.args.get('email')

    if not id_res or not email:
        return jsonify({"status": "error", "message": "ID dan Email wajib diisi."}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT r.*, t.nama_lengkap, t.email, t.nomor_telepon, 
                   k.nomor_kamar, tk.nama_tipe, i.total_bersih as harga_terkunci, i.status_pembayaran,
                   p.referensi_transaksi
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
            JOIN kamar k ON d.id_kamar = k.id_kamar
            JOIN tipe_kamar tk ON k.id_tipe = tk.id_tipe
            JOIN invoice i ON r.id_reservasi = i.id_reservasi
            LEFT JOIN pembayaran p ON i.id_invoice = p.id_invoice
            WHERE r.id_reservasi = %s AND t.email = %s
            ORDER BY p.id_pembayaran DESC LIMIT 1
        """
        cursor.execute(query, (id_res, email))
        pesanan = cursor.fetchone()
        
        if pesanan:
            if isinstance(pesanan['tanggal_masuk'], datetime):
                pesanan['tanggal_masuk'] = pesanan['tanggal_masuk'].strftime('%Y-%m-%dT%H:%M:%S')
            if isinstance(pesanan['tanggal_keluar'], datetime):
                pesanan['tanggal_keluar'] = pesanan['tanggal_keluar'].strftime('%Y-%m-%dT%H:%M:%S')
            
            # =======================================================
            # KODE PENGAMAN: Mencegah ID Transaksi Kosong (Null)
            # =======================================================
            if pesanan.get('status_pembayaran') == 'Lunas' and not pesanan.get('referensi_transaksi'):
                pesanan['referensi_transaksi'] = f"PAY-{pesanan['id_reservasi']}"

            return jsonify({"status": "success", "data": pesanan})
        else:
            return jsonify({"status": "not_found", "message": "Pesanan tidak ditemukan."}), 404
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 5. Endpoint Membuat Pesanan Baru (Booking)
@app.route('/api/buat-pesanan', methods=['POST'])
def buat_pesanan():
    data = request.json
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        checkin_dt = datetime.strptime(data['checkin'], '%Y-%m-%dT%H:%M')
        checkout_dt = datetime.strptime(data['checkout'], '%Y-%m-%dT%H:%M')
        
        # 1. Cek Ketersediaan Kamar (Cari 1 kamar kosong dan tidak diperbaiki untuk tipe yang dipilih)
        query_kamar = """
            SELECT k.id_kamar, k.nomor_kamar 
            FROM kamar k
            WHERE k.id_tipe = %s 
            AND k.status != 'Perbaikan' -- PERBAIKAN: Mengubah status_kondisi = 'Baik' menjadi status != 'Perbaikan'
            AND k.id_kamar NOT IN (
                -- 1. Kamar yang sudah dipesan untuk tanggal yang diminta
                SELECT dr.id_kamar FROM detail_reservasi dr
                JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
                WHERE r.status_pesanan != 'Batal' 
                AND (r.tanggal_masuk < %s AND r.tanggal_keluar > %s)
                
                UNION
                
                -- 2. Kamar yang baru saja check-out (Jeda 24 jam)
                SELECT dr.id_kamar FROM detail_reservasi dr
                JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
                WHERE r.status_pesanan != 'Batal' 
                AND r.tanggal_keluar <= %s 
                AND r.tanggal_keluar > DATE_SUB(%s, INTERVAL 24 HOUR)
            ) LIMIT 1
        """
        
        cursor.execute(query_kamar, (data['id_tipe'], checkout_dt, checkin_dt, checkin_dt, checkin_dt))
        kamar_tersedia = cursor.fetchone()

        if not kamar_tersedia:
            return jsonify({"status": "full", "message": "Maaf, tipe kamar ini sudah penuh pada tanggal tersebut."})

        id_kamar_terpilih = kamar_tersedia['id_kamar']
        nomor_kamar_terpilih = kamar_tersedia['nomor_kamar']

        # 2. Cek atau Buat Tamu Baru
        cursor.execute("SELECT id_tamu FROM tamu WHERE email = %s", (data['email'],))
        tamu = cursor.fetchone()
        if tamu:
            id_tamu = tamu['id_tamu']
            cursor.execute("UPDATE tamu SET nama_lengkap=%s, nomor_telepon=%s WHERE id_tamu=%s",
                           (data['nama'], data['telepon'], id_tamu))
        else:
            cursor.execute("INSERT INTO tamu (nama_lengkap, email, nomor_telepon) VALUES (%s, %s, %s)",
                           (data['nama'], data['email'], data['telepon']))
            id_tamu = cursor.lastrowid

        # 3. Buat ID Reservasi Cerdas (Format: NOMORKAMAR-DDMMYY-INCREMENT)
        now = datetime.now()
        ddmmyy = now.strftime('%d%m%y')
        
        # Gabungkan nomor kamar yang ditarik dari database ke dalam prefix
        prefix = f"{nomor_kamar_terpilih}-{ddmmyy}-" 
        
        # Cari pesanan terakhir dengan prefix kamar dan tanggal yang sama
        cursor.execute(
            "SELECT id_reservasi FROM reservasi WHERE id_reservasi LIKE %s ORDER BY LENGTH(id_reservasi) DESC, id_reservasi DESC LIMIT 1", 
            (prefix + '%',)
        )
        last_res = cursor.fetchone()
        
        if last_res:
            # Memotong teks berdasarkan tanda strip (-) dan mengambil angka urutan paling belakang
            last_id_num = int(last_res['id_reservasi'].split('-')[-1])
            id_reservasi = f"{prefix}{last_id_num + 1}"
        else:
            id_reservasi = f"{prefix}1"

        # Ambil data metode pembayaran dari frontend, jika kosong jadikan Pay at Hotel
        metode_bayar = data.get('metode_pembayaran', 'Pay at Hotel')

        # 4. Simpan ke Tabel reservasi (Data Utama)
        cursor.execute("""
            INSERT INTO reservasi (id_reservasi, id_tamu, tanggal_masuk, tanggal_keluar, status_pesanan, metode_pembayaran) 
            VALUES (%s, %s, %s, %s, %s, %s) 
        """, (id_reservasi, id_tamu, checkin_dt, checkout_dt, 'Menunggu', metode_bayar))
        
        cursor.execute("""
            INSERT INTO detail_reservasi (id_reservasi, id_kamar, harga_terkunci) 
            VALUES (%s, %s, %s)
        """, (id_reservasi, id_kamar_terpilih, data['total_harga']))

        # 6. Buat Tagihan di Tabel invoice
        cursor.execute("""
            INSERT INTO invoice (id_reservasi, total_kamar, total_bersih, status_pembayaran) 
            VALUES (%s, %s, %s, 'Belum Dibayar')
        """, (id_reservasi, data['total_harga'], data['total_harga']))

        conn.commit()
        return jsonify({"status": "success", "id_reservasi": id_reservasi})

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@app.route('/api/selesai-reservasi', methods=['POST'])
def selesai_reservasi():
    data = request.json
    id_reservasi = data['id_reservasi']
    id_kamar = data['id_kamar']
    
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update status reservasi jadi 'Selesai'
        cursor.execute("UPDATE reservasi SET status_pesanan = 'Selesai' WHERE id_reservasi = %s", (id_reservasi,))
        # Kembalikan status kamar jadi 'Tersedia'
        cursor.execute("UPDATE kamar SET status = 'Tersedia' WHERE id_kamar = %s", (id_kamar,))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Kamar sudah tersedia kembali."})
        
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT KHUSUS FASILITAS
# ==========================================

# Endpoint untuk mengambil data fasilitas
@app.route('/api/fasilitas', methods=['GET'])
def get_fasilitas():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM fasilitas")
    fasilitas = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(fasilitas)

# Endpoint untuk memproses pemesanan fasilitas
@app.route('/api/buat-pesanan-fasilitas', methods=['POST'])
def buat_pesanan_fasilitas():
    data = request.json
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Identifikasi Tamu
        cursor.execute("SELECT id_tamu FROM tamu WHERE email = %s", (data['email'],))
        tamu = cursor.fetchone()
        if tamu:
            id_tamu = tamu['id_tamu']
            cursor.execute("UPDATE tamu SET nama_lengkap=%s, nomor_telepon=%s WHERE id_tamu=%s",
                           (data['nama'], data['telepon'], id_tamu))
        else:
            cursor.execute("INSERT INTO tamu (nama_lengkap, email, nomor_telepon) VALUES (%s, %s, %s)",
                           (data['nama'], data['email'], data['telepon']))
            id_tamu = cursor.lastrowid

        # 2. Ekstraksi Info Fasilitas (Ambil nama dan kategori)
        cursor.execute("SELECT nama_fasilitas, kategori FROM fasilitas WHERE id_fasilitas = %s", (data['id_fasilitas'],))
        fasilitas_info = cursor.fetchone()
        
        # Ubah nama jadi huruf kecil semua agar mudah dideteksi
        nama_fas = fasilitas_info['nama_fasilitas'].lower() if fasilitas_info else ''
        kategori_terpilih = fasilitas_info['kategori'] if fasilitas_info else 'Event'

        # 3. Pembentukan ID Modular (Berdasarkan Kata Kunci Nama)
        if 'ballroom' in nama_fas:
            prefiks = 'BL'
        elif 'wedding' in nama_fas or 'pernikahan' in nama_fas:  # <-- Ini dia jalur khusus Wedding
            prefiks = 'WD'
        elif 'meeting' in nama_fas or 'rapat' in nama_fas:
            prefiks = 'MR'
        elif 'spa' in nama_fas or 'pijat' in nama_fas:
            prefiks = 'SP'
        elif 'kebugaran' in nama_fas or 'fitness' in nama_fas or 'gym' in nama_fas:
            prefiks = 'FT'
        else:
            # Jika tidak ada yang cocok, gunakan default bawaan kategori
            prefiks_map = {'Event': 'EV', 'Wellness': 'SP', 'F&B': 'FB'}
            prefiks = prefiks_map.get(kategori_terpilih, 'FS')
        
        # Konversi format penanggalan
        tgl_obj = datetime.strptime(data['tanggal'], '%Y-%m-%d')
        tgl_dmy = tgl_obj.strftime("%d%m%y")
        pola_cari = f"{prefiks}-{tgl_dmy}%"

        # Pencarian urutan data terakhir
        kueri_urut = """
            SELECT IFNULL(MAX(CAST(RIGHT(id_res_fasilitas, 2) AS UNSIGNED)), 0) + 1 AS urut_baru 
            FROM reservasi_fasilitas 
            WHERE id_res_fasilitas LIKE %s
        """
        cursor.execute(kueri_urut, (pola_cari,))
        hasil_urut = cursor.fetchone()
        urutan_baru = int(hasil_urut['urut_baru']) if hasil_urut and hasil_urut['urut_baru'] is not None else 1

        # Penggabungan string ID final
        new_id = f"{prefiks}-{tgl_dmy}{urutan_baru:02d}"

        # 4. Penyimpanan Data Reservasi
        query = """
            INSERT INTO reservasi_fasilitas 
            (id_res_fasilitas, id_tamu, id_fasilitas, tanggal_acara, waktu_mulai, jumlah_tamu, total_harga, status_pesanan, metode_pembayaran, catatan_khusus) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Dikonfirmasi', %s, %s)
        """
        cursor.execute(query, (
            new_id, id_tamu, data['id_fasilitas'], data['tanggal'], data['waktu'], 
            data['pax'], data['total_harga'], data['metode_pembayaran'], data['catatan']
        ))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Reservasi fasilitas berhasil!", "id_reservasi": new_id})

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT SIMULASI PEMBAYARAN
# ==========================================
@app.route('/api/bayar-pesanan', methods=['POST'])
def bayar_pesanan():
    data = request.json
    id_res = data.get('id_reservasi')
    nominal = data.get('nominal')
    metode = data.get('metode')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Cari ID Invoice dari Nomor Reservasi ini
        cursor.execute("SELECT id_invoice FROM invoice WHERE id_reservasi = %s", (id_res,))
        inv = cursor.fetchone()
        
        if not inv:
            return jsonify({"status": "error", "message": "Tagihan tidak ditemukan."}), 404

        id_invoice = inv['id_invoice']

        # 2. Catat Uang Masuk ke Tabel 'pembayaran'
        referensi = f"PAY-{id_res}-{datetime.now().strftime('%H%M%S')}"
        cursor.execute("""
            INSERT INTO pembayaran (id_invoice, nominal, metode_pembayaran, referensi_transaksi)
            VALUES (%s, %s, %s, %s)
        """, (id_invoice, nominal, metode, referensi))

        # 3. Ubah Status di Tabel 'invoice' menjadi Lunas!
        cursor.execute("UPDATE invoice SET status_pembayaran = 'Lunas' WHERE id_reservasi = %s", (id_res,))

        conn.commit()
        return jsonify({"status": "success", "message": "Pembayaran Berhasil!"})

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT DASHBOARD ADMIN
# ==========================================
@app.route('/api/admin-dashboard', methods=['GET'])
def admin_dashboard():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Hitung Okupansi & Kamar Terisi (Tamu In-House)
        cursor.execute("SELECT COUNT(*) as total_kamar FROM kamar")
        total_kamar = cursor.fetchone()['total_kamar']

        cursor.execute("""
            SELECT COUNT(DISTINCT d.id_kamar) as kamar_terisi 
            FROM detail_reservasi d
            JOIN reservasi r ON d.id_reservasi = r.id_reservasi
            WHERE r.status_pesanan != 'Batal' 
            AND DATE(NOW()) >= DATE(r.tanggal_masuk) 
            AND DATE(NOW()) < DATE(r.tanggal_keluar)
        """)
        kamar_terisi = cursor.fetchone()['kamar_terisi']
        okupansi = int((kamar_terisi / total_kamar) * 100) if total_kamar > 0 else 0

        # 2. Arus Kedatangan & Keberangkatan Hari Ini
        cursor.execute("SELECT COUNT(*) as checkin FROM reservasi WHERE DATE(tanggal_masuk) = DATE(NOW()) AND status_pesanan != 'Batal'")
        checkin_hari_ini = cursor.fetchone()['checkin']

        cursor.execute("SELECT COUNT(*) as checkout FROM reservasi WHERE DATE(tanggal_keluar) = DATE(NOW()) AND status_pesanan != 'Batal'")
        checkout_hari_ini = cursor.fetchone()['checkout']

        # 3. Pendapatan Hari Ini
        cursor.execute("""
            SELECT SUM(total_bersih) as total_pendapatan 
            FROM invoice 
            WHERE status_pembayaran = 'Lunas'
        """)
        pend_hari_ini = cursor.fetchone()['total_pendapatan']
        pendapatan_hari_ini = pend_hari_ini if pend_hari_ini else 0

        # 4. Rasio Status Invoice
        cursor.execute("SELECT status_pembayaran, COUNT(*) as jumlah FROM invoice GROUP BY status_pembayaran")
        status_invoice = cursor.fetchall()
        inv_stats = {'Lunas': 0, 'DP Dibayar': 0, 'Belum Dibayar': 0}
        for stat in status_invoice:
            inv_stats[stat['status_pembayaran']] = stat['jumlah']

        # 5. Daftar Reservasi (Untuk Tabel Meja Kerja)
        cursor.execute("""
            SELECT r.id_reservasi, 
                   t.nama_lengkap,    # <--- HAPUS tulisan 'as nama_tamu' di sini
                   k.nomor_kamar, 
                   r.tanggal_masuk, 
                   r.tanggal_keluar, 
                   IFNULL(i.status_pembayaran, 'Belum Dibayar') as status_pembayaran, 
                   r.status_pesanan
            FROM reservasi r
            LEFT JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN detail_reservasi dr ON r.id_reservasi = dr.id_reservasi
            LEFT JOIN kamar k ON dr.id_kamar = k.id_kamar
            LEFT JOIN invoice i ON r.id_reservasi = i.id_reservasi
            ORDER BY r.tanggal_masuk DESC
        """)
        daftar_reservasi = cursor.fetchall()

        for res in daftar_reservasi:
            res['tanggal_masuk'] = res['tanggal_masuk'].strftime('%d %b %Y')
            res['tanggal_keluar'] = res['tanggal_keluar'].strftime('%d %b %Y')

        return jsonify({
            "status": "success",
            "okupansi": okupansi,
            "checkin": checkin_hari_ini,
            "checkout": checkout_hari_ini,
            "pendapatan": pendapatan_hari_ini,
            "invoice": inv_stats,
            "reservasi": daftar_reservasi
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ==========================================
# ENDPOINT HOUSEKEEPING & PENUGASAN STAF
# ==========================================
@app.route('/api/staf-housekeeping', methods=['GET'])
def get_staf_housekeeping():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id_staf, nama_staf, id_posisi FROM staf WHERE id_posisi = 4")
    staf = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "data": staf})

@app.route('/api/tugaskan-staf', methods=['POST'])
def tugaskan_staf():
    data = request.json
    no_kamar = data.get('nomor_kamar')
    id_staf = data.get('id_staf')
    jenis_tugas = data.get('jenis_tugas')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Cari id_kamar fisik dari nomor kamar visual
        cursor.execute("SELECT id_kamar FROM kamar WHERE nomor_kamar = %s", (no_kamar,))
        kamar = cursor.fetchone()
        
        if not kamar:
            return jsonify({"status": "error", "message": "Kamar tidak ditemukan"}), 404
            
        cursor.execute("""
            INSERT INTO jadwal_kebersihan (id_kamar, id_staf, tanggal_tugas, jenis_tugas, status_tugas)
            VALUES (%s, %s, CURDATE(), %s, 'Menunggu')
        """, (kamar['id_kamar'], id_staf, jenis_tugas))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Surat tugas kebersihan resmi diterbitkan!"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# ENDPOINT LOGIN ADMIN
# ==========================================
@app.route('/api/login-admin', methods=['POST'])
def login_admin():
    data = request.json
    username_input = data.get('username')
    password_input = data.get('password')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Cari data admin berdasarkan username dan password
        cursor.execute("SELECT nama_lengkap, role FROM akun_admin WHERE username = %s AND password = %s", (username_input, password_input))
        admin = cursor.fetchone()
        
        if admin:
            # Jika cocok, izinkan masuk
            return jsonify({
                "status": "success", 
                "message": "Akses Diberikan",
                "nama": admin['nama_lengkap'],
                "role": admin['role']
            })
        else:
            # Jika tidak ada yang cocok, tolak
            return jsonify({"status": "error", "message": "Username atau Password salah!"}), 401
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        

@app.route('/api/status-kamar', methods=['GET'])
def get_status_kamar():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query cerdas untuk mengklasifikasikan status visual kamar secara real-time
        query = """
            SELECT 
                k.id_kamar, 
                k.nomor_kamar,
                CASE 
                    -- Ubah k.status_kondisi menjadi k.status
                    WHEN k.status = 'Perbaikan' THEN 'rm-repair'
                    
                    WHEN EXISTS (
                        SELECT 1 FROM detail_reservasi dr
                        JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
                        WHERE dr.id_kamar = k.id_kamar 
                        AND r.status_pesanan = 'Aktif'
                    ) THEN 'rm-occupied'

                    WHEN EXISTS (
                        SELECT 1 FROM detail_reservasi dr
                        JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
                        WHERE dr.id_kamar = k.id_kamar 
                        AND r.status_pesanan = 'Menunggu'
                    ) THEN 'rm-booked'
                    
                    WHEN EXISTS (
                        SELECT 1 FROM detail_reservasi dr
                        JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
                        WHERE dr.id_kamar = k.id_kamar 
                        AND r.status_pesanan = 'Selesai' 
                        AND r.tanggal_keluar > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    ) THEN 'rm-dirty'
                    
                    ELSE 'rm-clean'
                END as status_visual
            FROM kamar k
            ORDER BY k.nomor_kamar ASC
        """
        cursor.execute(query)
        kamar_list = cursor.fetchall()
        return jsonify({"status": "success", "data": kamar_list})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# ENDPOINT UPDATE STATUS RESERVASI
# ==========================================
@app.route('/api/update-reservasi', methods=['POST'])
def update_reservasi():
    data = request.json
    id_res = data.get('id_reservasi')
    status_baru = data.get('status_baru')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Perbarui status di tabel reservasi
        cursor.execute("UPDATE reservasi SET status_pesanan = %s WHERE id_reservasi = %s", (status_baru, id_res))
        conn.commit()
        
        return jsonify({"status": "success", "message": f"Status berhasil diubah menjadi {status_baru}"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT PEMBATALAN OLEH TAMU
# ==========================================
@app.route('/api/user-batal', methods=['POST'])
def user_batal():
    data = request.json
    id_res = data.get('id_reservasi')
    email = data.get('email')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Cari reservasi berdasarkan ID dan Email untuk keamanan
        cursor.execute("""
            SELECT r.status_pesanan, r.tanggal_masuk 
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            WHERE r.id_reservasi = %s AND t.email = %s
        """, (id_res, email))
        
        pesanan = cursor.fetchone()
        
        if not pesanan:
            return jsonify({"status": "error", "message": "Pesanan tidak valid atau email tidak cocok."}), 404
            
        if pesanan['status_pesanan'] == 'Batal':
            return jsonify({"status": "error", "message": "Pesanan ini sudah dibatalkan sebelumnya."}), 400
            
        # Cek Aturan 24 Jam sebelum waktu Check-in (asumsi jam 14:00)
        waktu_sekarang = datetime.now()
        waktu_checkin = pesanan['tanggal_masuk'] # ini format datetime dari MySQL
        
        # Hitung batas maksimal batal (H-1 jam 14:00)
        batas_batal = waktu_checkin - timedelta(hours=6)
        
        if waktu_sekarang > batas_batal:
            return jsonify({"status": "error", "message": "Batas waktu pembatalan gratis telah lewat (maksimal 6 jam sebelum check-in)."}), 400
            
        # Jika lolos syarat, batalkan pesanan
        cursor.execute("UPDATE reservasi SET status_pesanan = 'Batal' WHERE id_reservasi = %s", (id_res,))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Pesanan berhasil dibatalkan. Jika Anda sudah melakukan pembayaran, hubungi Resepsionis untuk proses Refund."})
        
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT PROSES PEMBAYARAN TAMU
# ==========================================
@app.route('/api/proses-bayar', methods=['POST'])
def proses_bayar():
    data = request.json
    id_res = data.get('id_reservasi')
    status_bayar = data.get('status_pembayaran') 
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        # 1. Update status di tabel invoice
        cursor.execute("UPDATE invoice SET status_pembayaran = %s WHERE id_reservasi = %s", (status_bayar, id_res))
        
        # 2. JIKA LUNAS: Otomatis cetak resi ke tabel pembayaran
        if status_bayar == 'Lunas':
            # Tarik data tagihan
            cursor.execute("SELECT id_invoice, total_bersih FROM invoice WHERE id_reservasi = %s", (id_res,))
            inv = cursor.fetchone()
            
            if inv:
                id_invoice = inv['id_invoice']
                nominal = inv['total_bersih']
                
                referensi = f"PAY-{id_res}"
                
                # Cek dulu agar tidak dobel jika sudah pernah dibayar
                cursor.execute("SELECT id_pembayaran FROM pembayaran WHERE id_invoice = %s", (id_invoice,))
                cek_bayar = cursor.fetchone()
                
                if not cek_bayar:
                    cursor.execute("""
                        INSERT INTO pembayaran (id_invoice, nominal, metode_pembayaran, referensi_transaksi)
                        VALUES (%s, %s, 'Terverifikasi Sistem', %s)
                    """, (id_invoice, nominal, referensi))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Pembayaran berhasil diverifikasi dan dicatat!"})
        
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
    
    
# ==========================================
# ENDPOINT: TAMBAH TUGAS HOUSEKEEPING (HK)
# ==========================================
@app.route('/api/tambah-housekeeping', methods=['POST'])
def tambah_housekeeping():
    data = request.json
    id_kamar = data.get('id_kamar')
    id_staf = data.get('id_staf')
    tanggal_tugas = data.get('tanggal_tugas')
    # id_reservasi bisa NULL jika pembersihan rutin, jadi kita amankan
    id_reservasi = data.get('id_reservasi') 

    # Validasi dasar: pastikan data penting tidak kosong
    if not id_kamar or not id_staf or not tanggal_tugas:
        return jsonify({"status": "error", "message": "Data Kamar, Staf, atau Tanggal tidak boleh kosong."}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Perhatikan Gambar 2: Struktur tabel memiliki id_reservasi yang bisa kosong.
        # Kita gunakan query INSERT: status_kerja otomatis di-set default 'Menunggu'
        query = """
            INSERT INTO housekeeping (id_kamar, id_staf, id_reservasi, tanggal_tugas, status_kerja)
            VALUES (%s, %s, %s, %s, 'Menunggu')
        """
        # Execute query dengan parameter yang aman
        cursor.execute(query, (id_kamar, id_staf, id_reservasi, tanggal_tugas))
        
        # Simpan perubahan permanen ke database
        conn.commit()
        
        return jsonify({"status": "success", "message": "Tugas Housekeeping berhasil ditambahkan!"})
    except Exception as e:
        if conn: conn.rollback() # Batalkan jika gagal
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT DETAIL KAMAR AKTIF (POP-UP HOUSEKEEPING)
# ==========================================
@app.route('/api/detail-kamar-aktif', methods=['GET'])
def detail_kamar_aktif():
    no_kamar = request.args.get('nomor_kamar')
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Mengambil data lengkap tamu yang statusnya 'Aktif' di kamar tersebut
        query = """
            SELECT r.id_reservasi, t.nama_lengkap, t.email, t.nomor_telepon, 
                   k.nomor_kamar, r.tanggal_masuk, r.tanggal_keluar, 
                   IFNULL(i.status_pembayaran, 'Belum Dibayar') as status_pembayaran,
                   p.referensi_transaksi
            FROM kamar k
            JOIN detail_reservasi dr ON k.id_kamar = dr.id_kamar
            JOIN reservasi r ON dr.id_reservasi = r.id_reservasi
            JOIN tamu t ON r.id_tamu = t.id_tamu
            LEFT JOIN invoice i ON r.id_reservasi = i.id_reservasi
            LEFT JOIN pembayaran p ON i.id_invoice = p.id_invoice
            WHERE k.nomor_kamar = %s AND r.status_pesanan IN ('Aktif', 'Menunggu')
            ORDER BY p.id_pembayaran DESC LIMIT 1
        """
        cursor.execute(query, (no_kamar,))
        detail = cursor.fetchone()

        if detail:
            # Rapihkan format tanggal agar mudah dibaca
            detail['tanggal_masuk'] = detail['tanggal_masuk'].strftime('%d %b %Y, %H:%M')
            detail['tanggal_keluar'] = detail['tanggal_keluar'].strftime('%d %b %Y, %H:%M')
            
            if detail['status_pembayaran'] == 'Lunas' and not detail['referensi_transaksi']:
                detail['referensi_transaksi'] = f"PAY-{detail['id_reservasi']}"
                
            return jsonify({"status": "success", "data": detail})
        else:
            return jsonify({"status": "error", "message": "Data tamu tidak ditemukan."}), 404

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        

# ==========================================
# ENDPOINT LOGIN TERPUSAT (AUTO-ROUTING)
# ==========================================
@app.route('/api/login', methods=['POST'])
def proses_login():
    data = request.json
    user = data.get('username')
    pw = data.get('password')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Tarik semua data termasuk id_posisi untuk menentukan arah lemparan halaman
        cursor.execute("""
            SELECT s.id_staf, s.nama_staf, p.nama_posisi AS posisi, s.id_posisi 
            FROM staf s
            JOIN posisi p ON s.id_posisi = p.id_posisi
            WHERE s.username = %s AND s.password = %s
        """, (user, pw))
        
        staf = cursor.fetchone()

        if staf:
            return jsonify({
                "status": "success",
                "id_staf": staf['id_staf'],
                "nama": staf['nama_staf'],
                "posisi": staf['posisi'],
                "id_posisi": staf['id_posisi'] # Kirim ID Posisi ke JavaScript
            })
        else:
            return jsonify({"status": "error", "message": "Username atau password tidak ditemukan."})
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# ENDPOINT PORTAL STAF (HOUSEKEEPING)
# ==========================================

# 1. Mengambil daftar tugas berdasarkan ID Staf yang sedang login
@app.route('/api/tugas-staf/<int:id_staf>', methods=['GET'])
def get_tugas_staf(id_staf):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Ambil tugas yang statusnya belum selesai
        cursor.execute("""
            SELECT j.id_jadwal, j.id_kamar, k.nomor_kamar, j.jenis_tugas, j.status_tugas 
            FROM jadwal_kebersihan j
            JOIN kamar k ON j.id_kamar = k.id_kamar
            WHERE j.id_staf = %s AND j.status_tugas != 'Selesai'
        """, (id_staf,))
        
        tugas = cursor.fetchall()
        return jsonify({"status": "success", "data": tugas})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 2. Menyelesaikan tugas dan mengubah warna kamar jadi Hijau
@app.route('/api/selesai-tugas', methods=['POST'])
def selesai_tugas():
    data = request.json
    id_jadwal = data.get('id_jadwal')
    id_kamar = data.get('id_kamar')

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update status jadwal menjadi Selesai
        cursor.execute("UPDATE jadwal_kebersihan SET status_tugas = 'Selesai' WHERE id_jadwal = %s", (id_jadwal,))
        
        # Update status kamar kembali menjadi Tersedia (Hijau di layar Admin)
        cursor.execute("UPDATE kamar SET status = 'Tersedia' WHERE id_kamar = %s", (id_kamar,))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Kamar berhasil dibersihkan dan siap digunakan!"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
       

# ==========================================
# ENDPOINT PRESENSI STAF
# ==========================================

# 1. Mencatat Clock-In dan Clock-Out
@app.route('/api/presensi', methods=['POST'])
def catat_presensi():
    data = request.json
    id_staf = data.get('id_staf')
    
    # PERBAIKAN 1: Tangkap 'jenis' ATAU 'tipe_absen' agar cocok dengan versi JS manapun
    jenis = data.get('jenis') or data.get('tipe_absen') 
    
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Cek apakah hari ini staf sudah absen
        cursor.execute("SELECT * FROM presensi WHERE id_staf = %s AND tanggal = CURDATE()", (id_staf,))
        absen_hari_ini = cursor.fetchone()
        
        if jenis == 'Masuk':
            if absen_hari_ini:
                return jsonify({"status": "error", "message": "Anda sudah Clock-In hari ini!"})
            
            # PERBAIKAN 2: Tambahkan kolom status = 'Hadir' agar Heatmap Admin berfungsi
            cursor.execute("""
                INSERT INTO presensi (id_staf, tanggal, waktu_masuk, status) 
                VALUES (%s, CURDATE(), CURTIME(), 'Hadir')
            """, (id_staf,))
            
        elif jenis == 'Pulang':
            if not absen_hari_ini:
                return jsonify({"status": "error", "message": "Anda belum Clock-In hari ini!"})
            if absen_hari_ini.get('waktu_pulang'):
                return jsonify({"status": "error", "message": "Anda sudah Clock-Out hari ini!"})
            
            # Update jam pulang untuk hari ini
            cursor.execute("""
                UPDATE presensi 
                SET waktu_pulang = CURTIME() 
                WHERE id_staf = %s AND tanggal = CURDATE()
            """, (id_staf,))
            
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 2. Mengambil Riwayat Presensi (Bulan Ini / 30 Hari Terakhir)
@app.route('/api/presensi/<int:id_staf>', methods=['GET'])
def get_riwayat_presensi(id_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Mengambil data dan menghitung durasi kerja langsung dari MySQL
        cursor.execute("""
            SELECT 
                DATE_FORMAT(tanggal, '%d %b %Y') as tanggal_format,
                TIME_FORMAT(waktu_masuk, '%H:%i') as waktu_masuk,
                TIME_FORMAT(waktu_pulang, '%H:%i') as waktu_pulang,
                status,
                CASE 
                    WHEN waktu_pulang IS NOT NULL THEN CONCAT(HOUR(TIMEDIFF(waktu_pulang, waktu_masuk)), ' Jam ', MINUTE(TIMEDIFF(waktu_pulang, waktu_masuk)), ' Menit')
                    ELSE 'Belum Selesai'
                END as durasi
            FROM presensi 
            WHERE id_staf = %s 
            ORDER BY tanggal DESC LIMIT 30
        """, (id_staf,))
        
        data = cursor.fetchall()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
 
# ==========================================
# ENDPOINT PROFIL KARYAWAN
# ==========================================

# 1. Mengambil detail biodata karyawan
@app.route('/api/profil/<int:id_staf>', methods=['GET'])
def get_profil_staf(id_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT s.kode_staf, s.nama_staf, s.nomor_telepon, s.username, p.nama_posisi 
            FROM staf s
            JOIN posisi p ON s.id_posisi = p.id_posisi
            WHERE s.id_staf = %s
        """, (id_staf,))
        
        profil = cursor.fetchone()
        if profil:
            return jsonify({"status": "success", "data": profil})
        return jsonify({"status": "error", "message": "Data tidak ditemukan"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 2. Mengubah Password Akun
@app.route('/api/ubah-password', methods=['POST'])
def ubah_password():
    data = request.json
    id_staf = data.get('id_staf')
    pass_lama = data.get('pass_lama')
    pass_baru = data.get('pass_baru')
    
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Cek apakah password lama benar
        cursor.execute("SELECT password FROM staf WHERE id_staf = %s", (id_staf,))
        staf = cursor.fetchone()
        
        if staf['password'] != pass_lama:
            return jsonify({"status": "error", "message": "Kata sandi lama yang Anda masukkan SALAH."})
            
        # Jika benar, update ke password baru
        cursor.execute("UPDATE staf SET password = %s WHERE id_staf = %s", (pass_baru, id_staf))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Kata sandi berhasil diperbarui!"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
        
# ==========================================
# ENDPOINT SLIP GAJI
# ==========================================

@app.route('/api/gaji/<int:id_staf>', methods=['GET'])
def get_slip_gaji(id_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id_gaji, periode_bulan, gaji_pokok, tunjangan, potongan, total_bersih,
                   DATE_FORMAT(tanggal_cair, '%d %b %Y') as tanggal_cair, status_pembayaran
            FROM slip_gaji
            WHERE id_staf = %s
            ORDER BY id_gaji DESC
        """, (id_staf,))
        
        gaji = cursor.fetchall()
        return jsonify({"status": "success", "data": gaji})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close() 
        

# ==========================================
# ENDPOINT MANAJEMEN STAF (ADMIN PORTAL)
# ==========================================
@app.route('/api/staf', methods=['GET'])
def get_semua_staf():
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Tarik data staf sekaligus data kehadiran mereka HARI INI
        cursor.execute("""
            SELECT 
                s.kode_staf, 
                s.nama_staf, 
                s.username, 
                p.nama_posisi, 
                TIME_FORMAT(pr.waktu_masuk, '%H:%i') as waktu_masuk, 
                TIME_FORMAT(pr.waktu_pulang, '%H:%i') as waktu_pulang, 
                pr.status
            FROM staf s
            JOIN posisi p ON s.id_posisi = p.id_posisi
            LEFT JOIN presensi pr ON s.id_staf = pr.id_staf AND pr.tanggal = CURDATE()
            ORDER BY p.id_posisi ASC, s.nama_staf ASC
        """)
        
        staf_list = cursor.fetchall()
        return jsonify({"status": "success", "data": staf_list})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()     



# ==========================================
# ENDPOINT PENGAJUAN IZIN / SAKIT
# ==========================================
@app.route('/api/izin', methods=['POST'])
def ajukan_izin():
    data = request.json
    id_staf = data.get('id_staf')
    status_izin = data.get('status') # Berisi 'Izin' atau 'Sakit'
    
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Cek apakah staf sudah terlanjur Clock-In atau sudah lapor hari ini
        cursor.execute("SELECT * FROM presensi WHERE id_staf = %s AND tanggal = CURDATE()", (id_staf,))
        absen_hari_ini = cursor.fetchone()
        
        if absen_hari_ini:
            return jsonify({"status": "error", "message": "Anda sudah memiliki catatan kehadiran/izin hari ini."})
            
        # Masukkan data ke database dengan status Izin/Sakit
        cursor.execute("""
            INSERT INTO presensi (id_staf, tanggal, status) 
            VALUES (%s, CURDATE(), %s)
        """, (id_staf, status_izin))
        
        conn.commit()
        return jsonify({"status": "success", "message": f"Status {status_izin} Anda berhasil dicatat."})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# ENDPOINT ANALITIK PRESENSI (HISTORIS)
# ==========================================
@app.route('/api/presensi/rekap', methods=['GET'])
def get_rekap_heatmap():
    bulan_req = request.args.get('bulan', default=datetime.now().month, type=int)
    tahun_req = request.args.get('tahun', default=datetime.now().year, type=int)
    
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) as total FROM staf")
        total_staf = cursor.fetchone()['total']
        
        # 1. Total absen per hari (Untuk warna Heatmap)
        cursor.execute("""
            SELECT DAY(tanggal) as hari, COUNT(*) as total_absen 
            FROM presensi 
            WHERE MONTH(tanggal) = %s AND YEAR(tanggal) = %s AND status != 'Hadir'
            GROUP BY DAY(tanggal)
        """, (bulan_req, tahun_req))
        rekap_harian = cursor.fetchall()
        
        # 2. Total distribusi bulanan (Untuk Pie Chart awal)
        cursor.execute("""
            SELECT status, COUNT(*) as jumlah 
            FROM presensi 
            WHERE MONTH(tanggal) = %s AND YEAR(tanggal) = %s AND status != 'Hadir'
            GROUP BY status
        """, (bulan_req, tahun_req))
        rekap_status = cursor.fetchall()

        # 3. BARU: Rincian status spesifik PER HARI (Untuk Pie Chart saat diklik)
        cursor.execute("""
            SELECT DAY(tanggal) as hari, status, COUNT(*) as jumlah 
            FROM presensi 
            WHERE MONTH(tanggal) = %s AND YEAR(tanggal) = %s AND status != 'Hadir'
            GROUP BY DAY(tanggal), status
        """, (bulan_req, tahun_req))
        rekap_harian_detail = cursor.fetchall()

        return jsonify({
            "status": "success", 
            "total_staf": total_staf, 
            "data_harian": rekap_harian,
            "data_status": rekap_status,
            "data_harian_detail": rekap_harian_detail
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
                                                                                         

# ==========================================
# ENDPOINT HOUSEKEEPING (PETA KAMAR)
# ==========================================
@app.route('/api/kamar', methods=['GET'])
def get_semua_kamar():
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Mengambil semua kamar diurutkan dari nomor terkecil
        cursor.execute("SELECT * FROM kamar ORDER BY nomor_kamar ASC")
        kamar_list = cursor.fetchall()
        
        return jsonify({"status": "success", "data": kamar_list})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# ENDPOINT DROPDOWN STAF HOUSEKEEPING
# ==========================================
@app.route('/api/staf-housekeeping', methods=['GET'])
def get_staf_hk():
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Menggunakan SELECT * agar tidak terbentur masalah nama kolom (nama_staf vs nama_lengkap)
        cursor.execute("SELECT * FROM staf WHERE id_posisi = 1")
        staf_hk = cursor.fetchall()
        
        return jsonify({"status": "success", "data": staf_hk})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        

# ==========================================
# ENDPOINT RIWAYAT PRESENSI STAF (PORTAL)
# ==========================================
@app.route('/api/presensi/riwayat/<int:id_staf>', methods=['GET'])
def get_riwayat_presensi_portal(id_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Ambil data presensi dari yang terbaru
        cursor.execute("""
            SELECT 
                DATE_FORMAT(tanggal, '%d %M %Y') as tanggal, 
                waktu_masuk, 
                waktu_pulang, 
                status 
            FROM presensi 
            WHERE id_staf = %s 
            ORDER BY tanggal DESC
        """, (id_staf,))
        riwayat = cursor.fetchall()
        
        # Format tipe data 'waktu' agar aman dibaca oleh JSON/JavaScript
        for baris in riwayat:
            if baris['waktu_masuk']:
                baris['waktu_masuk'] = str(baris['waktu_masuk'])
            if baris['waktu_pulang']:
                baris['waktu_pulang'] = str(baris['waktu_pulang'])
                
        return jsonify({"status": "success", "data": riwayat})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# ==========================================
# 1. API AMBIL 1 DATA STAF (Pakai kode_staf)
# ==========================================
@app.route('/api/staf/<kode_staf>', methods=['GET'])
def get_staf_detail(kode_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Cari berdasarkan kode_staf (Misal: HK-004)
        cursor.execute("SELECT * FROM staf WHERE kode_staf = %s", (kode_staf,))
        staf = cursor.fetchone()
        if staf: return jsonify(staf)
        else: return jsonify({"status": "error", "message": "Data staf tidak ditemukan."}), 404
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ==========================================
# 2. API EDIT DATA STAF (Pakai kode_staf)
# ==========================================
@app.route('/api/staf/<kode_staf>', methods=['PUT'])
def edit_staf(kode_staf):
    data = request.json
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Update berdasarkan kode_staf
        cursor.execute("""
            UPDATE staf 
            SET nama_staf = %s, id_posisi = %s, nomor_telepon = %s, username = %s 
            WHERE kode_staf = %s
        """, (data.get('nama_staf'), data.get('id_posisi'), data.get('nomor_telepon'), data.get('username'), kode_staf))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Data staf berhasil diperbarui!'})
    except Exception as e: return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ==========================================
# 3. API HAPUS STAF (Pakai kode_staf)
# ==========================================
@app.route('/api/staf/<kode_staf>', methods=['DELETE'])
def hapus_staf(kode_staf):
    conn = None; cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Hapus berdasarkan kode_staf
        cursor.execute("DELETE FROM staf WHERE kode_staf = %s", (kode_staf,))
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Data staf berhasil dihapus'})
    except Exception as e: return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
                               
# ==========================================
# MENJALANKAN SERVER
# ==========================================
if __name__ == '__main__':
    # debug=True membuat server langsung memperbarui diri jika ada kode yang diubah
    app.run(debug=True, port=5000)