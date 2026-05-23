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
        
        # Logika SQL: Menggabungkan (JOIN) 5 tabel untuk merangkum data pesanan secara utuh
        query = """
            SELECT r.*, t.nama_lengkap, t.email, k.nomor_kamar, tk.nama_tipe, d.harga_terkunci
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
            # PERBAIKAN: Mengecek tipe data tanggal sebelum diformat agar aman dari error
            if isinstance(pesanan['tanggal_masuk'], datetime):
                pesanan['tanggal_masuk'] = pesanan['tanggal_masuk'].strftime('%Y-%m-%d')
            if isinstance(pesanan['tanggal_keluar'], datetime):
                pesanan['tanggal_keluar'] = pesanan['tanggal_keluar'].strftime('%Y-%m-%d')
            return jsonify({"status": "success", "data": pesanan})
        else:
            return jsonify({"status": "not_found", "message": "Pesanan tidak ditemukan. Periksa kembali ID dan Email Anda."}), 404
            
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
            INSERT INTO reservasi (id_reservasi, id_tamu, tanggal_masuk, tanggal_keluar, status_pesanan) 
            VALUES (%s, %s, %s, %s, 'Dikonfirmasi')
        """, (id_reservasi, id_tamu, checkin_dt, checkout_dt))
        
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
# MENJALANKAN SERVER
# ==========================================
if __name__ == '__main__':
    # debug=True membuat server langsung memperbarui diri jika ada kode yang diubah
    app.run(debug=True, port=5000)