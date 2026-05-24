# SISTEM MANAJEMEN HOTEL

## Tentang Website
Website "Hotel Reservasi" adalah platform digital berbasis web yang dirancang untuk mengotomatisasi alur operasional perhotelan, mulai dari pemesanan kamar (room booking), reservasi fasilitas tambahan (seperti restoran, ballroom, hingga spa), hingga sistem pengelolaan tamu dan keuangan. Website ini bertujuan untuk memberikan pengalaman pemesanan yang mulus (seamless) bagi tamu serta menyediakan alat kontrol operasional yang kuat bagi pihak manajemen hotel.

## Stack Teknologi
1. Frontend (Antarmuka): Menggunakan HTML5, CSS3, dan JavaScript (Vanilla). Fokus pada desain User Interface (UI) yang elegan, responsif, dan menggunakan color palette profesional (Dark Green, Maroon, Gold, dan Beige) untuk menciptakan kesan mewah dan terpercaya.
2. Backend (Logika Pemrosesan): Menggunakan Python dengan framework Flask. Framework ini dipilih karena ringkas dan sangat efisien untuk menangani endpoint API dan komunikasi antara database dengan browser.
3. Database (Penyimpanan Data): Menggunakan MySQL dengan mesin penyimpanan InnoDB. Database ini dirancang dengan skema relasional yang kompleks untuk mendukung integritas data, termasuk penguncian harga (locked price), transaksi pembayaran, dan manajemen operasional staf.
4. Komunikasi: Menggunakan Fetch API untuk komunikasi data secara asynchronous antara frontend dan backend tanpa perlu refresh halaman secara berlebihan.

## Fitur Utama
1. Sistem Reservasi Cerdas: Mendukung pemesanan multi-kamar dan fasilitas dengan ID reservasi unik berbasis format Kamar-Tanggal-Urutan (contoh: 1401-240526-1).
2. Manajemen Keuangan: Memisahkan data tagihan (invoice) dan pembayaran, memungkinkan transaksi yang tercatat dengan nomor referensi unik.
3. Sistem Operasional (Housekeeping): Mengelola siklus kebersihan kamar dengan buffer waktu 24 jam setelah check-out untuk pemeliharaan, serta memiliki database staf hotel yang komprehensif.
4. Sistem E-Voucher: Menghasilkan bukti transaksi otomatis yang bisa dicetak menjadi PDF, menampilkan status pembayaran (PAID/UNPAID) secara real-time.

## Tujuan Pengembangan
Proyek ini dibuat untuk menjawab tantangan dalam mengelola hotel berskala besar (436 kamar) dengan mengintegrasikan berbagai departemen menjadi satu ekosistem digital. Fokus utamanya adalah meminimalisir kesalahan manusia (human error) dalam pencatatan pesanan, memastikan ketersediaan kamar terpantau secara akurat, dan mempercepat alur administrasi dari tamu saat melakukan check-in hingga check-out.
