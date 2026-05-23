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
                            total_harga: totalHarga 
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
// FUNGSI HALAMAN CEK PESANAN
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
                    const p = data.data;
                    document.getElementById('res-id').textContent = p.id_reservasi;
                    document.getElementById('res-status').textContent = p.status_pesanan;
                    document.getElementById('res-nama').textContent = p.nama_lengkap;
                    document.getElementById('res-tlp').textContent = p.nomor_telepon;
                    document.getElementById('res-in').textContent = new Date(p.tanggal_masuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    document.getElementById('res-out').textContent = new Date(p.tanggal_keluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    document.getElementById('res-harga').textContent = formatRupiah(p.harga_terkunci);
                    document.getElementById('res-kamar').textContent = p.nama_tipe;

                    const badge = document.getElementById('res-status');
                    badge.style.backgroundColor = p.status_pesanan === 'Dikonfirmasi' ? '#154230' : (p.status_pesanan === 'Batal' ? '#5D1E21' : '#A6824A'); 
                    badge.style.color = p.status_pesanan === 'Menunggu' ? '#101111' : 'white';
                    resultBox.style.display = 'block';
                } else { 
                    alert(data.message); 
                    resultBox.style.display = 'none'; 
                }
            })
            .catch(err => { 
                alert("Kesalahan server."); 
                btnSubmit.textContent = "CARI PESANAN"; 
                btnSubmit.disabled = false; 
            });
    });
}