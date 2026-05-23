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
        
        # --- LOGIKA BARU: DETEKSI FASILITAS ---
        # Jika ID mengandung huruf awalan modul fasilitas (EV, SP, FB, FS, dll)
        if id_res.startswith(('EV', 'SP', 'FB', 'FS', 'BL', 'MR', 'WD', 'F')):
            query = """
                SELECT rf.id_res_fasilitas AS id_reservasi, t.nama_lengkap, t.email, t.nomor_telepon,
                       f.nama_fasilitas AS layanan, rf.tanggal_acara, rf.waktu_mulai,
                       rf.status_pesanan, rf.total_harga
                FROM reservasi_fasilitas rf
                JOIN tamu t ON rf.id_tamu = t.id_tamu
                JOIN fasilitas f ON rf.id_fasilitas = f.id_fasilitas
                WHERE rf.id_res_fasilitas = %s AND t.email = %s
            """
            cursor.execute(query, (id_res, email))
            pesanan = cursor.fetchone()
            
            if pesanan:
                # Format penanggalan dan waktu agar bisa dibaca JSON
                if hasattr(pesanan['tanggal_acara'], 'strftime'):
                    pesanan['tanggal_acara'] = pesanan['tanggal_acara'].strftime('%Y-%m-%d')
                if hasattr(pesanan['waktu_mulai'], 'total_seconds'):
                    hours, remainder = divmod(pesanan['waktu_mulai'].seconds, 3600)
                    minutes, _ = divmod(remainder, 60)
                    pesanan['waktu_mulai'] = f"{hours:02d}:{minutes:02d}"
                    
                return jsonify({"status": "success", "kategori": "fasilitas", "data": pesanan})

        # --- LOGIKA LAMA: DETEKSI KAMAR ---
        else:
            query = """
                SELECT r.*, t.nama_lengkap, t.email, t.nomor_telepon, k.nomor_kamar, tk.nama_tipe, d.harga_terkunci
                FROM reservasi r
                JOIN tamu t ON r.id_tamu = t.id_tamu
                JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
                JOIN kamar k ON d.id_kamar = k.id_kamar
                JOIN tipe_kamar tk ON k.id_tipe = tk.id_tipe
                WHERE r.id_reservasi = %s AND t.email = %s
            """
            cursor.execute(query, (id_res, email))
            pesanan = cursor.fetchone()
            
            if pesanan:
                if hasattr(pesanan['tanggal_masuk'], 'strftime'):
                    pesanan['tanggal_masuk'] = pesanan['tanggal_masuk'].strftime('%Y-%m-%dT%H:%M:%S')
                if hasattr(pesanan['tanggal_keluar'], 'strftime'):
                    pesanan['tanggal_keluar'] = pesanan['tanggal_keluar'].strftime('%Y-%m-%dT%H:%M:%S')
                    
                return jsonify({"status": "success", "kategori": "kamar", "data": pesanan})
        
        # Jika tidak masuk di kedua kondisi atau data kosong
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
        conn.start_transaction()
        
        # 1. Konversi ISO string dari datetime-local menjadi objek datetime
        # Format: '2026-05-23T12:43'
        checkin_dt = datetime.fromisoformat(data['checkin'])
        checkout_dt = datetime.fromisoformat(data['checkout'])
        
        # 2. Cek apakah ada unit fisik kamar yang tersedia
        # Kita ambil id_kamar yang id_tipe nya sesuai
        cursor.execute("""
            SELECT id_kamar, nomor_kamar 
            FROM kamar 
            WHERE id_tipe = %s AND status = 'Tersedia' 
            LIMIT 1
        """, (data['id_tipe'],))
        kamar = cursor.fetchone()
        
        if not kamar:
            return jsonify({"status": "error", "message": "Maaf, unit kamar tipe ini sedang tidak tersedia."}), 400
            
        id_kamar = kamar['id_kamar']
        nomor_kamar = kamar['nomor_kamar']
        
        # 3. Handle data tamu
        cursor.execute("SELECT id_tamu FROM tamu WHERE email = %s", (data['email'],))
        tamu = cursor.fetchone()
        if tamu:
            id_tamu = tamu['id_tamu']
        else:
            cursor.execute("INSERT INTO tamu (nama_lengkap, email, nomor_telepon) VALUES (%s, %s, %s)", 
                           (data['nama'], data['email'], data['telepon']))
            id_tamu = cursor.lastrowid
            
        # 4. Generate ID Reservasi Cerdas (NomorKamar-Urutan)
        cursor.execute("SELECT COUNT(*) as count FROM reservasi WHERE id_reservasi LIKE %s", (f"{nomor_kamar}-%",))
        urutan = cursor.fetchone()['count'] + 1
        id_reservasi = f"{nomor_kamar}-{urutan}"
        
        # 5. Insert Reservasi
        cursor.execute("""
            INSERT INTO reservasi (id_reservasi, id_tamu, tanggal_masuk, tanggal_keluar, status_pesanan, metode_pembayaran) 
            VALUES (%s, %s, %s, %s, 'Dikonfirmasi', %s)
        """, (id_reservasi, id_tamu, checkin_dt, checkout_dt, data['metode_pembayaran']))
        
        # 6. Insert Detail & Update Status Kamar
        cursor.execute("INSERT INTO detail_reservasi (id_reservasi, id_kamar, harga_terkunci) VALUES (%s, %s, %s)",
                       (id_reservasi, id_kamar, data['total_harga']))
        
        cursor.execute("UPDATE kamar SET status = 'Terisi' WHERE id_kamar = %s", (id_kamar,))
        
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
# MENJALANKAN SERVER
# ==========================================
if __name__ == '__main__':
    # debug=True membuat server langsung memperbarui diri jika ada kode yang diubah
    app.run(debug=True, port=5000)