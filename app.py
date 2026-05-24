from flask import Flask, jsonify, request
from datetime import datetime
import mysql.connector
from flask_cors import CORS

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
        
        # UPDATE QUERY: Menambahkan LEFT JOIN ke tabel pembayaran untuk mengambil referensi_transaksi
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
        
        # 1. Cek Ketersediaan Kamar (Cari 1 kamar kosong untuk tipe yang dipilih)
# UBAH QUERY: Tambahkan logika filter jeda 24 jam
        query_kamar = """
            SELECT k.id_kamar, k.nomor_kamar 
            FROM kamar k
            WHERE k.id_tipe = %s 
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
        # Kita masukkan parameter checkout_dt sebanyak 2 kali untuk filter ke-2
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

        # 4. Simpan ke Tabel reservasi (Data Utama)
        cursor.execute("""
            INSERT INTO reservasi (id_reservasi, id_tamu, tanggal_masuk, tanggal_keluar, status_pesanan, metode_pembayaran) 
            VALUES (%s, %s, %s, %s, 'Dikonfirmasi', %s)
        """, (id_reservasi, id_tamu, checkin_dt, checkout_dt, data['metode_pembayaran']))

        # 5. Simpan ke Tabel detail_reservasi (Kunci Harga & Kamar)
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
        cursor.execute("SELECT SUM(nominal) as total_pendapatan FROM pembayaran WHERE DATE(tanggal_bayar) = DATE(NOW())")
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
            SELECT r.id_reservasi, t.nama_lengkap, k.nomor_kamar, r.tanggal_masuk, r.tanggal_keluar, i.status_pembayaran 
            FROM reservasi r
            JOIN tamu t ON r.id_tamu = t.id_tamu
            JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
            JOIN kamar k ON d.id_kamar = k.id_kamar
            JOIN invoice i ON r.id_reservasi = i.id_reservasi
            ORDER BY r.tanggal_masuk DESC LIMIT 50
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
    # Menjalankan query untuk menarik staf spesifik kebersihan
    cursor.execute("SELECT id_staf, nama_staf, posisi FROM staf WHERE posisi LIKE '%Attendant%' OR posisi LIKE '%Housekeeping%'")
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
# MENJALANKAN SERVER
# ==========================================
if __name__ == '__main__':
    # debug=True membuat server langsung memperbarui diri jika ada kode yang diubah
    app.run(debug=True, port=5000)