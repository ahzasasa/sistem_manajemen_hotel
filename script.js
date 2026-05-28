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
let originalRoomData = [];
let globalRoomData = []; 
let currentPage = 1;     
const itemsPerPage = 4;
let hargaKamarGlobal = 0; 
let hargaFasilitasGlobal = 0; 

const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

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
    return 'Standard'; 
}

// ==========================================
// INISIALISASI SAAT HALAMAN DIMUAT (ROUTER)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('detail.html')) { loadDetailKamar(); }
    else if (currentPath.includes('detail-fasilitas.html')) { loadDetailFasilitas(); } 
    else if (currentPath.includes('kamar.html')) { loadDataKamarGrid(); }
    else if (currentPath.includes('cek-pesanan.html')) { initCekPesanan(); }
    else if (currentPath.includes('fasilitas.html')) { /* Statis, tidak butuh JS spesifik */ }
    else { loadDataBeranda(); }
});

// ==========================================
// FUNGSI 1: BERANDA & PENCARIAN (DINAMIS DARI DATABASE)
// ==========================================
function loadDataBeranda() {
    fetch('http://127.0.0.1:5000/api/tipe-kamar')
        .then(response => response.json())
        .then(data => { 
            originalRoomData = data.data || data;
            globalRoomData = [...originalRoomData];
            currentPage = 1; 
            renderKamarCards(); 
        })
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
            .then(data => { 
                originalRoomData = data.data || data;
                globalRoomData = data;
                currentPage = 1;
                renderKamarCards(); })
            .catch(error => document.getElementById('kamar-container').innerHTML = '<h3 style="color:red; text-align:center;">Terjadi kesalahan sistem.</h3>');
    });
}

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
        
        // --- LOGIKA FASILITAS DINAMIS DARI DATABASE ---
        const fasilitasArray = kamar.fasilitas ? kamar.fasilitas.split(',') : [];
        let fasilitasSingkat = '';
        fasilitasArray.forEach(item => {
            fasilitasSingkat += `✔️ ${item.trim()}<br>`;
        });
        
        if (fasilitasSingkat === '') {
            fasilitasSingkat = 'Fasilitas belum ditambahkan.<br>';
        }
        // --- BATAS LOGIKA DINAMIS ---

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
// FUNGSI 2: HALAMAN KAMAR GRID
// ==========================================
function loadDataKamarGrid() {
    fetch('http://127.0.0.1:5000/api/tipe-kamar').then(res => res.json()).then(data => {
        // Ambil array data (mengatasi perbedaan struktur JSON API)
        const roomArray = data.data || data; 
        const gridContainer = document.getElementById('kamar-grid-container');
        if (!gridContainer) return;
        gridContainer.innerHTML = ''; 
        
        roomArray.forEach(kamar => {
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
    });
}

// ==========================================
// FUNGSI 3: DETAIL KAMAR & BOOKING
// ==========================================
function loadDetailKamar() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');
    
    if (!roomId) return;

    fetch('http://127.0.0.1:5000/api/tipe-kamar')
        .then(res => res.json())
        .then(data => {
            const roomArray = data.data || data;
            const kamar = roomArray.find(k => k.id_tipe == roomId);
            if (kamar) {
                hargaKamarGlobal = kamar.harga_per_malam; 
                
                const baseName = getBaseRoomName(kamar.nama_tipe);
                const infoTambahan = dataPelengkap[baseName] || { img: '', desc: '-' };
                
                document.getElementById('detail-nama').textContent = kamar.nama_tipe;
                document.getElementById('detail-img').src = infoTambahan.img;
                document.getElementById('detail-kapasitas').textContent = `${kamar.kapasitas} Guest Maximum`;
                document.getElementById('detail-deskripsi').textContent = kamar.deskripsi || infoTambahan.desc; // Ambil deskripsi asli jika ada
                document.getElementById('detail-harga').textContent = formatRupiah(kamar.harga_per_malam) + ' / Malam';

                // --- Tampilkan Fasilitas Lengkap di Detail ---
                const wadahFasilitas = document.getElementById('detail-fasilitas');
                if (wadahFasilitas && kamar.fasilitas) {
                    wadahFasilitas.innerHTML = `<div class="amenity-item">🛏️ ${kamar.kapasitas} Guest Maximum</div>`;
                    const listFasilitas = kamar.fasilitas.split(',');
                    listFasilitas.forEach(item => {
                        wadahFasilitas.innerHTML += `<div class="amenity-item">✔️ ${item.trim()}</div>`;
                    });
                }

                hitungTotalKamar(); 

                const formBooking = document.getElementById('form-booking');
                if (formBooking) {
                    formBooking.addEventListener('submit', async function(e) {
                        e.preventDefault(); 
                        const btnSubmit = formBooking.querySelector('button');
                        btnSubmit.textContent = 'MEMPROSES...'; btnSubmit.disabled = true;
                        
                        const checkin = document.getElementById('book-in').value;
                        const checkout = document.getElementById('book-out').value;
                        const totalHarga = document.getElementById('total-harga-value').value;
                        
                        if (new Date(checkout) <= new Date(checkin)) {
                            alert("Tanggal Check-Out harus setelah Check-In!");
                            btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false; return; 
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
                                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                            });
                            const result = await res.json();
                            
                            if (result.status === 'success') {
                                window.location.href = `voucher.html?id=${result.id_reservasi}&email=${payload.email}`;
                            } else {
                                alert("Pemesanan Gagal: " + result.message);
                                btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                            }
                        } catch (err) {
                            alert("Gagal terhubung ke server.");
                            btnSubmit.textContent = 'KONFIRMASI PESANAN'; btnSubmit.disabled = false;
                        }
                    });
                }
            }
        });

    const bookInEl = document.getElementById('book-in');
    const bookOutEl = document.getElementById('book-out');
    if (bookInEl && bookOutEl) {
        bookInEl.addEventListener('input', hitungTotalKamar);
        bookInEl.addEventListener('change', hitungTotalKamar);
        bookOutEl.addEventListener('input', hitungTotalKamar);
        bookOutEl.addEventListener('change', hitungTotalKamar);
    }
}

function hitungTotalKamar() {
    const inputIn = document.getElementById('book-in');
    const inputOut = document.getElementById('book-out');
    const totalDisplay = document.getElementById('total-display');
    const totalValue = document.getElementById('total-harga-value'); 

    if (!inputIn || !inputOut || !totalDisplay) return;

    if (inputIn.value && inputOut.value) {
        const dateIn = new Date(inputIn.value);
        const dateOut = new Date(inputOut.value);

        if (dateOut > dateIn) {
            const diffTime = Math.abs(dateOut - dateIn);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const total = diffDays * hargaKamarGlobal;
            
            totalDisplay.value = formatRupiah(total);
            if (totalValue) totalValue.value = total;
        } else {
            totalDisplay.value = "Tanggal Tidak Valid";
            if (totalValue) totalValue.value = 0;
        }
    }
}

// ==========================================
// FUNGSI 4: DETAIL FASILITAS & BOOKING
// ==========================================
const gambarFasilitas = {
    1: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', 
    2: 'https://images.unsplash.com/photo-1574096079513-d8259312b78a?w=800&q=80', 
    3: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80', 
    4: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', 
    5: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', 
    6: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'  
};

function loadDetailFasilitas() {
    const urlParams = new URLSearchParams(window.location.search);
    const fasId = urlParams.get('id');
    if (!fasId) return document.querySelector('.detail-content').innerHTML = '<h2>Fasilitas tidak ditemukan!</h2>';

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
                
                if (gambarFasilitas[fasId]) document.getElementById('fas-img').src = gambarFasilitas[fasId];

                hitungTotalFasilitas();
            }
        });

    const paxInput = document.getElementById('fas-book-pax');
    if(paxInput) {
        paxInput.addEventListener('input', hitungTotalFasilitas);
        paxInput.addEventListener('change', hitungTotalFasilitas);
    }

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
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                });
                const result = await res.json();
                
                if (result.status === 'success') {
                    Swal.fire({
                        title: 'Reservasi Berhasil!',
                        text: `Fasilitas berhasil dipesan dengan ID: ${result.id_reservasi}`,
                        icon: 'success',
                        confirmButtonColor: '#198754',
                        confirmButtonText: 'Lihat E-Voucher'
                    }).then(() => {
                        window.location.href = `voucher.html?id=${result.id_reservasi}&email=${payload.email}`; 
                    });
                } else {
                    Swal.fire('Gagal!', "Pesan: " + result.message, 'error');
                    btn.textContent = 'KONFIRMASI RESERVASI'; btn.disabled = false;
                }
            } catch (err) {
                Swal.fire('Error!', "Kesalahan jaringan atau server.", 'error');
                btn.textContent = 'KONFIRMASI RESERVASI'; btn.disabled = false;
            }
        });
    }
}

function hitungTotalFasilitas() {
    const pax = document.getElementById('fas-book-pax')?.value;
    const totalDisplay = document.getElementById('fas-total-display');
    const totalValue = document.getElementById('fas-total-value');
    
    if (pax && pax > 0 && totalDisplay) {
        const total = pax * hargaFasilitasGlobal;
        totalDisplay.value = formatRupiah(total);
        if (totalValue) totalValue.value = total;
    } else if (totalDisplay) {
        totalDisplay.value = "Rp 0";
        if (totalValue) totalValue.value = 0;
    }
}

// ==========================================
// FUNGSI 5: CEK PESANAN -> VOUCHER
// ==========================================
function initCekPesanan() {
    const form = document.getElementById('form-cek-pesanan');
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
                    window.location.href = `voucher.html?id=${idInput}&email=${emailInput}`;
                } else { 
                    alert(data.message); 
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
// FUNGSI 6: FILTER KAMAR (HARGA & FASILITAS)
// ==========================================

// 1. Membuat teks angka harga bergerak otomatis saat slider digeser
document.addEventListener('DOMContentLoaded', function() {
    const sliderHarga = document.getElementById('filter-harga');
    const labelHarga = document.getElementById('label-harga');
    if (sliderHarga && labelHarga) {
        sliderHarga.addEventListener('input', function() {
            labelHarga.textContent = formatRupiah(this.value);
        });
    }
});

// 2. Menerapkan Filter ke Data Kamar
async function terapkanFilter() {
    const checkin = document.getElementById('filter-checkin').value;
    const checkout = document.getElementById('filter-checkout').value;
    const kapasitas = document.getElementById('filter-kapasitas').value;
    const maxHarga = document.getElementById('filter-harga').value;
    
    let url = 'http://127.0.0.1:5000/api/tipe-kamar'; // Default: Ambil semua kamar
    let pakaiTanggal = false;

    // 1. Validasi Tanggal (Jika user mengisi form tanggal)
    if (checkin || checkout) {
        if (!checkin || !checkout) return alert('Silakan isi kedua tanggal Check-In dan Check-Out!');
        if (new Date(checkout) <= new Date(checkin)) return alert('Tanggal Check-Out harus setelah Check-In!');
        
        url = `http://127.0.0.1:5000/api/cari-kamar?checkin=${checkin}&checkout=${checkout}&kapasitas=${kapasitas}`;
        pakaiTanggal = true;
        
        // Opsional: Update ringkasan di panel Booking Details (jika ada)
        const sumIn = document.getElementById('summary-in');
        const sumOut = document.getElementById('summary-out');
        if (sumIn) sumIn.textContent = checkin;
        if (sumOut) sumOut.textContent = checkout;
    }

    try {
        const wadah = document.getElementById('kamar-container');
        wadah.innerHTML = '<p style="text-align: center; padding: 50px;">Menerapkan filter...</p>';

        // 2. Ambil data dari Backend (Sesuai URL: semua atau spesifik tanggal)
        const response = await fetch(url);
        const data = await response.json();
        originalRoomData = data.data || data;

        // 3. Filter Berlapis di Frontend (Harga & Fasilitas)
        const checkboxes = document.querySelectorAll('.filter-fasilitas:checked');
        const fasilitasPilihan = Array.from(checkboxes).map(cb => cb.value);

        globalRoomData = originalRoomData.filter(kamar => {
            const pasHarga = kamar.harga_per_malam <= parseInt(maxHarga);
            const pasFasilitas = fasilitasPilihan.every(fas => kamar.fasilitas && kamar.fasilitas.includes(fas));
            // Jika tidak pakai API tanggal, kita pastikan kapasitasnya cocok secara manual
            const pasKapasitas = pakaiTanggal ? true : (kamar.kapasitas >= parseInt(kapasitas)); 

            return pasHarga && pasFasilitas && pasKapasitas;
        });

        // 4. Cetak ulang hasilnya
        currentPage = 1;
        renderKamarCards();

    } catch (error) {
        console.error(error);
        document.getElementById('kamar-container').innerHTML = '<h3 style="color:red; text-align:center;">Gagal menerapkan filter.</h3>';
    }
}

function resetFilter() {
    document.getElementById('filter-checkin').value = '';
    document.getElementById('filter-checkout').value = '';
    document.getElementById('filter-kapasitas').value = '2';
    document.getElementById('filter-harga').value = 10000000;
    document.getElementById('label-harga').textContent = "Rp 10.000.000";
    document.querySelectorAll('.filter-fasilitas').forEach(cb => cb.checked = false);

    // Kembalikan teks ringkasan Booking Details ke strip (-)
    const sumIn = document.getElementById('summary-in');
    const sumOut = document.getElementById('summary-out');
    if (sumIn) sumIn.textContent = '-';
    if (sumOut) sumOut.textContent = '-';

    // Muat ulang data asli dari awal
    loadDataBeranda();
}