// ==========================================
// DATA PELENGKAP (Gambar & Deskripsi)
// ==========================================
const dataPelengkap = {
    'Standard': { img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', desc: 'Kamar nyaman seluas 25 meter persegi, dilengkapi dengan tempat tidur nyaman dan fasilitas modern. Pilihan ekonomis terbaik untuk pengalaman menginap yang efisien.' },
    'Deluxe': { img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', desc: 'Ruangan yang lebih luas dengan pemandangan kota. Dilengkapi dengan area duduk kecil, minibar, dan dekorasi premium untuk kenyamanan ekstra Anda.' },
    'Family Room': { img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80', desc: 'Dirancang khusus untuk keluarga. Memiliki ruang yang sangat lega dengan tempat tidur tambahan, memastikan kenyamanan seluruh anggota keluarga selama liburan.' },
    'Suite': { img: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', desc: 'Kemewahan puncak hotel kami. Suite luas ini dilengkapi dengan ruang tamu terpisah, dapur kecil, perabotan mewah, dan kamar mandi marmer kelas satu.' }
};

// ==========================================
// VARIABEL GLOBAL 
// ==========================================
let globalRoomData = []; 
let currentPage = 1;     
const itemsPerPage = 4;
let hargaKamarGlobal = 0; // Variabel penting untuk kalkulator harga

const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// FUNGSI CERDAS: Mengambil nama dasar kamar untuk mencocokkan gambar
function getBaseRoomName(namaTipe) {
    if (namaTipe.includes('Presidential')) return 'Presidential';
    if (namaTipe.includes('Suite Room')) return 'Suite';
    if (namaTipe.includes('Junior')) return 'Junior Suite';
    if (namaTipe.includes('Connecting')) return 'Connecting';
    if (namaTipe.includes('Family')) return 'Family';
    if (namaTipe.includes('Deluxe City')) return 'Deluxe City';
    if (namaTipe.includes('Deluxe')) return 'Deluxe';
    if (namaTipe.includes('Superior')) return 'Superior';
    if (namaTipe.includes('Standard')) return 'Standard';
    return 'Standard'; // Default fallback
}

// ==========================================
// INISIALISASI SAAT HALAMAN DIMUAT
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('detail.html')) { loadDetailKamar(); }
    else if (currentPath.includes('kamar.html')) { loadDataKamarGrid(); }
    else if (currentPath.includes('cek-pesanan.html')) { initCekPesanan(); }
    else if (currentPath.includes('voucher.html')) { initVoucher(); } 
    else { loadDataBeranda(); initSearchEngine(); }
});

// ==========================================
// FUNGSI 1 & 2: BERANDA & PENCARIAN
// ==========================================
function loadDataBeranda() {
    fetch('http://127.0.0.1:5000/api/tipe-kamar')
        .then(response => response.json())
        .then(data => { globalRoomData = data; currentPage = 1; renderKamarCards(); })
        .catch(error => document.getElementById('kamar-container').innerHTML = '<h3 style="color:red; text-align:center;">Gagal terhubung ke Database.</h3>');
}

function initSearchEngine() {
    const searchForm = document.querySelector('.search-engine-container');
    if (!searchForm) return;

    searchForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        const checkin = document.getElementById('checkin').value;
        const checkout = document.getElementById('checkout').value;
        const kapasitas = document.getElementById('kapasitas').value;

        if (!checkin || !checkout) return alert('Silakan pilih tanggal Check-In dan Check-Out terlebih dahulu.');
        if (new Date(checkout) <= new Date(checkin)) return alert('Kesalahan: Tanggal Check-Out harus setelah tanggal Check-In!');

        document.getElementById('kamar-container').innerHTML = '<p style="text-align: center; padding: 50px;">Mencari kamar yang tersedia...</p>';
        fetch(`http://127.0.0.1:5000/api/cari-kamar?checkin=${checkin}&checkout=${checkout}&kapasitas=${kapasitas}`)
            .then(response => response.json())
            .then(data => { globalRoomData = data; currentPage = 1; renderKamarCards(); })
            .catch(error => document.getElementById('kamar-container').innerHTML = '<h3 style="color:red; text-align:center;">Terjadi kesalahan sistem.</h3>');
    });
}

// ==========================================
// FUNGSI BANTUAN: MERENDER KARTU KAMAR (PAGINATION)
// ==========================================
function renderKamarCards() {
    const kamarContainer = document.getElementById('kamar-container');
    if (!kamarContainer) return;
    kamarContainer.innerHTML = ''; 

    if (globalRoomData.length === 0) {
        kamarContainer.innerHTML = '<h3 style="text-align:center; padding: 50px 20px; color: #5D1E21;">Maaf, tidak ada kamar yang sesuai dengan pencarian Anda.</h3>';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = globalRoomData.slice(start, end);

    paginatedData.forEach(kamar => {
        const baseName = getBaseRoomName(kamar.nama_tipe);
        const infoTambahan = dataPelengkap[baseName] || { img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', desc: 'Kamar eksklusif persembahan Hotel Reservasi.' };
        
        let fasilitasSingkat = `Luas ${kamar.kapasitas * 15} sqm<br>AC & TV LED 40"<br>Wi-Fi Gratis<br>Pembuat Kopi & Teh`;
        
        if(kamar.nama_tipe.includes('Breakfast')) fasilitasSingkat += `<br><span style="color: #154230; font-weight: bold; display: block; margin-top: 5px;">🍳 Termasuk Sarapan Pagi</span>`;
        if(kamar.nama_tipe.includes('Free Cancellation')) fasilitasSingkat += `<br><span style="color: #0D47A1; font-weight: bold; display: block; margin-top: 5px;">🛡️ Pembatalan Gratis (Fleksibel)</span>`;
        if(kamar.nama_tipe.includes('Jacuzzi')) fasilitasSingkat += `<br><span style="color: #D81B60; font-weight: bold; display: block; margin-top: 5px;">🛁 Private Jacuzzi Dalam Kamar</span>`;
        if(kamar.nama_tipe.includes('Extra Bed')) fasilitasSingkat += `<br><span style="color: #E65100; font-weight: bold; display: block; margin-top: 5px;">🛏️ Termasuk 1 Kasur Tambahan</span>`;

        const cardHTML = `
            <div class="horizontal-card">
                <img src="${infoTambahan.img}" alt="${kamar.nama_tipe}" class="horizontal-img">
                <div class="horizontal-body">
                    <div class="horizontal-header">
                        <h3>${kamar.nama_tipe}</h3>
                        <span style="color: #154230; font-weight: bold;">👥 ${kamar.kapasitas} Guest</span>
                    </div>
                    <div class="room-features">${fasilitasSingkat}</div>
                    <div class="horizontal-footer">
                        <a href="detail.html?id=${kamar.id_tipe}" class="link-more">More Info ↗</a>
                        <div class="price-section">
                            <span class="price-val">${formatRupiah(kamar.harga_per_malam)}</span>
                            <span class="price-tax">Rate for 1 Night • Tax Inclusive</span>
                            <button class="btn-book-now" onclick="window.location.href='detail.html?id=${kamar.id_tipe}'">Book</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        kamarContainer.innerHTML += cardHTML;
    });
    renderPaginationControls();
}

function renderPaginationControls() {
    const totalPages = Math.ceil(globalRoomData.length / itemsPerPage) || 1; 
    const kamarContainer = document.getElementById('kamar-container');
    let paginationHTML = `<div class="pagination-container">`;

    if (currentPage > 1) paginationHTML += `<button onclick="changePage(${currentPage - 1})" class="btn-page">❮ PREV</button>`;
    else paginationHTML += `<button class="btn-page disabled" disabled>❮ PREV</button>`;

    paginationHTML += `<span class="page-indicator">Halaman ${currentPage} dari ${totalPages}</span>`;

    if (currentPage < totalPages) paginationHTML += `<button onclick="changePage(${currentPage + 1})" class="btn-page">NEXT ❯</button>`;
    else paginationHTML += `<button class="btn-page disabled" disabled>NEXT ❯</button>`;

    paginationHTML += `</div>`;
    kamarContainer.innerHTML += paginationHTML;
}

window.changePage = function(page) {
    currentPage = page;
    renderKamarCards();
    const targetScroll = document.querySelector('.engine-layout');
    if(targetScroll) {
        const y = targetScroll.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

// ==========================================
// FUNGSI HALAMAN DETAIL & PEMESANAN (SUDAH DIGABUNG & DIRAPIKAN)
// ==========================================
function loadDetailKamar() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');
    
    if (!roomId) {
        document.querySelector('.detail-content').innerHTML = '<h2>Kamar tidak ditemukan!</h2>';
        return;
    }

    fetch('http://127.0.0.1:5000/api/tipe-kamar')
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengambil data dari server");
            return res.json();
        })
        .then(data => {
            const kamar = data.find(k => k.id_tipe == roomId);
            
            if (kamar) {
                // 1. SIMPAN HARGA KE VARIABEL GLOBAL (Ini kunci agar total tidak 0)
                hargaKamarGlobal = kamar.harga_per_malam; 
                
                // 2. SET TAMPILAN GAMBAR & TEKS
                const baseName = getBaseRoomName(kamar.nama_tipe);
                const infoTambahan = dataPelengkap[baseName] || { img: '', desc: '-' };
                
                document.getElementById('detail-nama').textContent = kamar.nama_tipe;
                document.getElementById('detail-img').src = infoTambahan.img;
                document.getElementById('detail-kapasitas').textContent = `${kamar.kapasitas} Guest Maximum`;
                document.getElementById('detail-deskripsi').textContent = infoTambahan.desc;
                document.getElementById('detail-harga').textContent = formatRupiah(kamar.harga_per_malam) + ' / Malam';

                // 3. PANGGIL KALKULATOR
                hitungTotal(); 

                // 4. PROSES SUBMIT FORM
                const formBooking = document.getElementById('form-booking');
                if (formBooking) {
                    formBooking.addEventListener('submit', async function(e) {
                        e.preventDefault(); 
                        const btnSubmit = formBooking.querySelector('button');
                        btnSubmit.textContent = 'MEMPROSES...'; btnSubmit.disabled = true;
                        
                        const checkin = document.getElementById('book-in').value;
                        const checkout = document.getElementById('book-out').value;
                        const totalHarga = document.getElementById('total-harga-value').value;
                        
                        // Validasi
                        if (new Date(checkout) <= new Date(checkin)) {
                            alert("Tanggal Check-Out harus setelah Check-In!");
                            btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                            return; 
                        }

                        if (totalHarga == 0 || totalHarga === "") {
                            alert("Total harga tidak valid. Periksa kembali tanggal Anda.");
                            btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                            return; 
                        }

                        const payload = {
                            id_tipe: kamar.id_tipe,
                            nama: document.getElementById('book-nama').value,
                            email: document.getElementById('book-email').value,
                            telepon: document.getElementById('book-tlp').value,
                            checkin: checkin,
                            checkout: checkout,
                            total_harga: totalHarga,
                            metode_pembayaran: document.getElementById('metode-bayar').value
                        };

                        try {
                            const res = await fetch('http://127.0.0.1:5000/api/buat-pesanan', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify(payload)
                            });
                            
                            const result = await res.json();
                            
                            if (result.status === 'success') {
                                // Tampilan Berhasil yang Keren
                                const detailContainer = document.querySelector('.detail-container');
                                if (detailContainer) {
                                    detailContainer.innerHTML = `
                                        <div style="grid-column: span 2; text-align: center; background: white; padding: 50px; border-radius: 8px; border: 1px solid #A6824A;">
                                            <h2 style="color: #154230; margin-bottom: 20px;">🎉 PESANAN BERHASIL DIBUAT!</h2>
                                            <div style="background: #E6E2DA; padding: 20px; display: inline-block; border-radius: 4px; margin-bottom: 30px;"><span style="font-size: 0.85rem; color: #666; display: block; text-transform: uppercase;">ID Reservasi Anda</span><strong style="font-size: 2.2rem; color: #5D1E21;">${result.id_reservasi}</strong></div>
                                            <br><a href="cek-pesanan.html" class="btn-book-now" style="text-decoration: none; padding: 12px 30px; display: inline-block;">PERGI KE CEK PESANAN ❯</a>
                                        </div>`;
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            } else {
                                alert("Pemesanan Gagal: " + result.message);
                                btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                            }
                        } catch (err) {
                            console.error("Terjadi masalah jaringan:", err);
                            alert("Gagal terhubung ke server. Pastikan Flask menyala.");
                            btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                        }
                    });
                }
            } else {
                document.querySelector('.detail-content').innerHTML = '<h2>Kamar tidak ditemukan di database.</h2>';
            }
        })
        .catch(error => {
            console.error("Koneksi terputus:", error);
            alert("Gagal memuat data. Pastikan server Flask sudah berjalan.");
        });
}

// ==========================================
// FUNGSI KALKULATOR TOTAL HARGA (HANYA ADA 1 SEKARANG!)
// ==========================================
function hitungTotal() {
    const inputIn = document.getElementById('book-in');
    const inputOut = document.getElementById('book-out');
    const totalDisplay = document.getElementById('total-display');
    const totalValue = document.getElementById('total-harga-value'); 

    if (!inputIn || !inputOut || !totalDisplay) return;

    const valIn = inputIn.value;
    const valOut = inputOut.value;

    if (valIn && valOut) {
        const dateIn = new Date(valIn);
        const dateOut = new Date(valOut);

        if (dateOut > dateIn) {
            const diffTime = Math.abs(dateOut - dateIn);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const total = diffDays * hargaKamarGlobal;
            
            totalDisplay.value = new Intl.NumberFormat('id-ID', { 
                style: 'currency', currency: 'IDR', maximumFractionDigits: 0
            }).format(total);
            
            if (totalValue) totalValue.value = total;
        } else {
            totalDisplay.value = "Tanggal Tidak Valid";
            if (totalValue) totalValue.value = 0;
        }
    }
}

// ==========================================
// EVENT LISTENER UNTUK KALKULATOR TANGGAL
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const bookInEl = document.getElementById('book-in');
    const bookOutEl = document.getElementById('book-out');

    if (bookInEl && bookOutEl) {
        bookInEl.addEventListener('input', hitungTotal);
        bookInEl.addEventListener('change', hitungTotal);
        bookOutEl.addEventListener('input', hitungTotal);
        bookOutEl.addEventListener('change', hitungTotal);
    }
});

// ==========================================
// FUNGSI HALAMAN KAMAR GRID
// ==========================================
function loadDataKamarGrid() {
    fetch('http://127.0.0.1:5000/api/tipe-kamar').then(res => res.json()).then(data => {
        const gridContainer = document.getElementById('kamar-grid-container');
        if (!gridContainer) return;
        gridContainer.innerHTML = ''; 
        data.forEach(kamar => {
            const baseName = getBaseRoomName(kamar.nama_tipe);
            const infoTambahan = dataPelengkap[baseName] || { img: '', desc: '' };
            gridContainer.innerHTML += `
                <div class="room-card-grid" onclick="window.location.href='detail.html?id=${kamar.id_tipe}'" style="cursor: pointer;">
                    <div class="img-wrapper">
                        <img src="${infoTambahan.img}" alt="${kamar.nama_tipe}">
                        <div class="img-overlay"><span class="overlay-btn">PERIKSA DETAILNYA ❯</span></div>
                    </div>
                    <div class="room-info-grid">
                        <h3>${kamar.nama_tipe}</h3>
                        <p>${infoTambahan.desc} Kapasitas maksimal ${kamar.kapasitas} orang.</p>
                        <span class="btn-detail-grid">PERIKSA DETAILNYA ❯</span>
                    </div>
                </div>`;
        });
    }).catch(err => console.log("Gagal muat grid kamar", err));
}

// ==========================================
// FUNGSI HALAMAN CEK PESANAN (VERSI MENUJU E-VOUCHER)
// ==========================================
function initCekPesanan() {
    const form = document.getElementById('form-cek-pesanan');
    const resultBox = document.getElementById('hasil-pesanan');
    if(!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const idInput = document.getElementById('input-id').value;
        const emailInput = document.getElementById('input-email').value;
        const btnSubmit = form.querySelector('button');

        btnSubmit.textContent = "MENCARI..."; btnSubmit.disabled = true;
        
        fetch(`http://127.0.0.1:5000/api/cek-pesanan?id=${idInput}&email=${emailInput}`)
            .then(res => res.json())
            .then(data => {
                btnSubmit.textContent = "CARI PESANAN"; btnSubmit.disabled = false;
                
                if (data.status === 'success') {
                    // BARIS INI YANG MENGHUBUNGKAN KE VOUCHER BARU KITA!
                    window.location.href = `voucher.html?id=${idInput}&email=${emailInput}`;
                } else { 
                    alert(data.message); 
                    if (resultBox) resultBox.style.display = 'none'; 
                }
            })
            .catch(err => { 
                alert("Kesalahan server."); 
                btnSubmit.textContent = "CARI PESANAN"; 
                btnSubmit.disabled = false; 
            });
    });
}

// ==========================================
// FITUR RESERVASI FASILITAS BARU
// ==========================================
let hargaFasilitasGlobal = 0;

// Gambar pelengkap untuk fasilitas (karena di database tidak ada kolom gambar)
const gambarFasilitas = {
    1: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', // Restoran
    2: 'https://images.unsplash.com/photo-1574096079513-d8259312b78a?w=800&q=80', // Rooftop
    3: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80', // Ballroom
    4: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', // Meeting Room
    5: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', // Wedding
    6: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'  // Spa
};

document.addEventListener('DOMContentLoaded', function() {
    // Jika sedang di halaman detail fasilitas
    if (window.location.pathname.includes('detail-fasilitas.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const fasId = urlParams.get('id');
        
        if (!fasId) return document.querySelector('.detail-content').innerHTML = '<h2>Fasilitas tidak ditemukan!</h2>';

        // Ambil data fasilitas dari backend
        fetch('http://127.0.0.1:5000/api/fasilitas')
            .then(res => res.json())
            .then(data => {
                const fas = data.find(f => f.id_fasilitas == fasId);
                if (fas) {
                    hargaFasilitasGlobal = fas.harga_dasar;
                    
                    document.getElementById('fas-nama').textContent = fas.nama_fasilitas;
                    document.getElementById('fas-kategori').textContent = fas.kategori;
                    document.getElementById('fas-deskripsi').textContent = fas.deskripsi;
                    document.getElementById('fas-harga').textContent = formatRupiah(fas.harga_dasar) + ' / ' + fas.satuan_harga;
                    
                    if (gambarFasilitas[fasId]) {
                        document.getElementById('fas-img').src = gambarFasilitas[fasId];
                    }

                    hitungTotalFasilitas(); // Panggil pertama kali
                }
            });

        // Trigger hitung total saat jumlah pax diubah
        const paxInput = document.getElementById('fas-book-pax');
        if(paxInput) {
            paxInput.addEventListener('input', hitungTotalFasilitas);
            paxInput.addEventListener('change', hitungTotalFasilitas);
        }

        // Handle Submit Form
        const formFasilitas = document.getElementById('form-fasilitas');
        if (formFasilitas) {
            formFasilitas.addEventListener('submit', async function(e) {
                e.preventDefault();
                const btn = formFasilitas.querySelector('button');
                btn.textContent = 'MEMPROSES...'; btn.disabled = true;

                const payload = {
                    id_fasilitas: fasId,
                    nama: document.getElementById('fas-book-nama').value,
                    email: document.getElementById('fas-book-email').value,
                    telepon: document.getElementById('fas-book-tlp').value,
                    tanggal: document.getElementById('fas-book-tanggal').value,
                    waktu: document.getElementById('fas-book-waktu').value,
                    pax: document.getElementById('fas-book-pax').value,
                    catatan: document.getElementById('fas-book-catatan').value,
                    total_harga: document.getElementById('fas-total-value').value,
                    metode_pembayaran: document.getElementById('fas-metode-bayar').value
                };

                try {
                    const res = await fetch('http://127.0.0.1:5000/api/buat-pesanan-fasilitas', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const result = await res.json();
                    
                    if (result.status === 'success') {
                        // 1. Sembunyikan area konten form dan gambar
                        document.getElementById('konten-utama-fasilitas').style.display = 'none';

                        // 2. Tampilkan kartu sukses
                        document.getElementById('success-message-container').style.display = 'block';

                        // 3. Masukkan teks ID Reservasi dari backend
                        document.getElementById('id-reservasi-tampil').innerText = result.id_reservasi;

                        // 4. Scroll layar otomatis ke bagian atas
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        alert("Gagal: " + result.message);
                        btn.textContent = 'KONFIRMASI RESERVASI'; btn.disabled = false;
                    }
                } catch (err) {
                    alert("Kesalahan jaringan.");
                    btn.textContent = 'KONFIRMASI RESERVASI'; btn.disabled = false;
                }
            });
        }
    }
});

function hitungTotalFasilitas() {
    const pax = document.getElementById('fas-book-pax').value;
    const totalDisplay = document.getElementById('fas-total-display');
    const totalValue = document.getElementById('fas-total-value');
    
    if (pax && pax > 0) {
        const total = pax * hargaFasilitasGlobal;
        totalDisplay.value = formatRupiah(total);
        totalValue.value = total;
    }
}


// ==========================================
// FUNGSI HALAMAN VOUCHER
// ==========================================
function initVoucher() {
    // 1. Ambil parameter ID dan Email dari URL browser
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    const emailParam = urlParams.get('email');

    if (!idParam || !emailParam) {
        alert("Data pesanan tidak lengkap!");
        return;
    }

    // 2. Tembak API backend untuk mengambil data
    fetch(`http://127.0.0.1:5000/api/cek-pesanan?id=${idParam}&email=${emailParam}`)
        .then(res => res.json())
        .then(result => {
            if (result.status === 'success') {
                const data = result.data;
                
                // --- A. JIKA INI VOUCHER KAMAR ---
                if (result.kategori === 'kamar') {
                    // Pastikan ID elemen (seperti 'v-layanan') sama dengan yang ada di file voucher.html milikmu
                    document.getElementById('v-layanan').innerText = "Kamar " + data.nama_tipe;
                    document.getElementById('v-detail-1').innerText = "Check-in: " + data.tanggal_masuk;
                    document.getElementById('v-detail-2').innerText = "Check-out: " + data.tanggal_keluar;
                    document.getElementById('v-nomor').innerText = data.nomor_kamar;
                } 
                
                // --- B. JIKA INI VOUCHER FASILITAS ---
                else if (result.kategori === 'fasilitas') {
                    document.getElementById('v-layanan').innerText = "Fasilitas: " + data.layanan;
                    document.getElementById('v-detail-1').innerText = "Tanggal Acara: " + data.tanggal_acara;
                    document.getElementById('v-detail-2').innerText = "Waktu Mulai: " + data.waktu_mulai;
                    document.getElementById('v-nomor').innerText = "-"; // Tidak ada kamar
                }

                // --- C. DATA UMUM (Tamu & Pembayaran) ---
                document.getElementById('v-nama').innerText = data.nama_lengkap;
                document.getElementById('v-email').innerText = data.email;
                document.getElementById('v-telepon').innerText = data.nomor_telepon;
                
                const hargaFinal = data.harga_terkunci || data.total_harga; 
                document.getElementById('v-total').innerText = "Rp " + parseInt(hargaFinal).toLocaleString('id-ID');
                document.getElementById('v-status').innerText = data.status_pesanan;
                
                // ID Reservasi di bagian atas voucher
                const elemIdRes = document.getElementById('v-id-reservasi');
                if(elemIdRes) elemIdRes.innerText = data.id_reservasi || idParam;

            } else {
                alert("Gagal memuat voucher: " + result.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Terjadi kesalahan saat memuat data voucher.");
        });
}