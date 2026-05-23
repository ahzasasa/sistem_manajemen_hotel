import mysql.connector
import random

# Hubungkan ke database
conn = mysql.connector.connect(host='localhost', user='root', password='', database='hotel_reservasi_db')
cursor = conn.cursor()

def generate_kamar():
    # Daftar [id_tipe, jumlah] sesuai spesifikasimu
    konfigurasi = [
        [1, 70], [2, 50], [3, 90], [4, 60], [5, 30], [6, 20], 
        [7, 10], [8, 10], [9, 10], [10, 40], [11, 24], [12, 18], [13, 4]
    ]
    
    for id_tipe, jml in konfigurasi:
        for i in range(1, jml + 1):
            # Logika 15% smoking random
            is_smoking = 1 if random.random() < 0.15 else 0
            # Kita masukkan langsung ke database
            cursor.execute("INSERT INTO kamar (id_tipe, is_smoking) VALUES (%s, %s)", (id_tipe, is_smoking))
    
    conn.commit()
    print("Database berhasil diisi dengan 436 kamar!")

# Jalankan fungsinya
generate_kamar()
cursor.close()
conn.close()