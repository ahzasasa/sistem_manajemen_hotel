// Cek apakah admin sudah login (menggunakan sessionStorage yang kita set di login.js sebelumnya)
if (!sessionStorage.getItem('adminName')) {
    alert("Akses ditolak! Silakan login terlebih dahulu.");
    window.location.href = 'login.html';
}

// =========================================================================
// KONTROL UTAMA & ROUTER INTERFACES
// =========================================================================
function switchSection(sectionId, element) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    element.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    loadAdminData();
    populateStafDropdown();
    renderPetaKamarAsli();

    const btnTambahHK = document.getElementById('btn-tambah-hk');
    if (btnTambahHK) {
        btnTambahHK.addEventListener('click', simpanTugasHousekeeping);
    }
});

const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// =========================================================================
// PULLER DATA INTEGRASI BACKEND & REAL-TIME INVOICES
// =========================================================================
function loadAdminData() {
    fetch('http://127.0.0.1:5000/api/admin-dashboard')
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            // Update Ringkasan Atas
            document.getElementById('ov-okupansi').textContent = data.okupansi + "%";
            document.getElementById('ov-okupansi-bar').style.width = data.okupansi + "%";
            document.getElementById('ov-checkin').textContent = data.checkin;
            document.getElementById('ov-checkout').textContent = data.checkout;
            document.getElementById('ov-pendapatan').textContent = formatRupiah(data.pendapatan);

            // Update Status Tagihan
            document.getElementById('ov-inv-lunas').textContent = data.invoice['Lunas'] || 0;
            document.getElementById('ov-inv-dp').textContent = data.invoice['DP Dibayar'] || 0;
            document.getElementById('ov-inv-belum').textContent = data.invoice['Belum Dibayar'] || 0;

            // Update Tabel Reservasi
            const tbody = document.getElementById('table-res-body');
            tbody.innerHTML = '';
            
            data.reservasi.forEach(r => {
                // Label Pembayaran
                let badgeStatus = '';
                if (r.status_pembayaran === 'Lunas') badgeStatus = '<span class="badge badge-lunas">PAID / LUNAS</span>';
                else if (r.status_pembayaran === 'DP Dibayar') badgeStatus = '<span class="badge badge-dp">PARTIAL / DP 50%</span>';
                else badgeStatus = '<span class="badge badge-belum">UNPAID / PENDING</span>';

                // Tombol Aksi Dinamis
                // ... baris kode sebelumnya ...
                let btnAksi = '';
                if (r.status_pesanan === 'Menunggu') {
                    btnAksi = `
                        <button class="btn btn-sm btn-success btn-action me-1" onclick="prosesReservasi('${r.id_reservasi}', 'Aktif')">
                            <i class="fa-solid fa-key"></i> Check-In
                        </button>
                        <button class="btn btn-sm btn-danger btn-action" onclick="prosesReservasi('${r.id_reservasi}', 'Batal')">Batal</button>
                    `;
                } else if (r.status_pesanan === 'Aktif') {
                    btnAksi = `
                        <button class="btn btn-sm btn-warning btn-action" onclick="prosesReservasi('${r.id_reservasi}', 'Selesai')">
                            <i class="fa-solid fa-right-from-bracket"></i> Check-Out
                        </button>
                    `;
                } else {
                    btnAksi = `<span class="badge bg-secondary">${r.status_pesanan}</span>`;
                }

                tbody.innerHTML += `
                    <tr data-status-bayar="${r.status_pembayaran}">
                        <td><strong>${r.id_reservasi}</strong></td>
                        <td>${r.nama_lengkap}</td>
                        <td><span class="badge bg-secondary">${r.nomor_kamar}</span></td>
                        <td>${r.tanggal_masuk} - ${r.tanggal_keluar}</td>
                        <td>${badgeStatus}</td>
                        <td class="text-center">${btnAksi}</td>
                    </tr>
                `;
            });
        }
    })
    .catch(err => console.error("Gagal menarik data admin:", err));
}

// =========================================================================
// ENGINE PENCARIAN & FILTER TABEL MANAGEMENT
// =========================================================================
function filterReservasiTable() {
    const keyword = document.getElementById('search-res').value.toLowerCase();
    const filterBayar = document.getElementById('filter-status-bayar').value;
    const rows = document.querySelectorAll('#table-res-body tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const statusBayarAttr = row.getAttribute('data-status-bayar');

        const matchKeyword = text.includes(keyword);
        const matchStatus = filterBayar === "" || statusBayarAttr === filterBayar;

        if(matchKeyword && matchStatus) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// =========================================================================
// MODUL HOUSEKEEPING CONTROL & DELEGASI STAF
// =========================================================================
function populateStafDropdown() {
    fetch('http://127.0.0.1:5000/api/staf-housekeeping')
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            const selectStaf = document.getElementById('hk-pilih-staf');
            selectStaf.innerHTML = '<option value="">-- Pilih Staf Tersedia --</option>';
            
            data.data.forEach(staf => {
                let opt = document.createElement('option');
                opt.value = staf.id_staf;
                opt.textContent = `${staf.nama_staf} (${staf.posisi})`;
                selectStaf.appendChild(opt);
            });
        }
    });
}

function renderPetaKamarAsli() {
    fetch('http://127.0.0.1:5000/api/status-kamar')
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const container = document.getElementById('container-room-grid');
            container.innerHTML = ''; // Bersihkan kontainer lama

            // Objek untuk mengelompokkan data kamar berdasarkan lantai
            const roomsByFloor = {};

            data.data.forEach(rm => {
                // Ambil 2 karakter pertama dari nomor kamar lalu ubah ke angka (03 -> 3, 14 -> 14)
                let lantaiStr = rm.nomor_kamar.substring(0, 2);
                let lantai = parseInt(lantaiStr, 10);
                
                if (!roomsByFloor[lantai]) {
                    roomsByFloor[lantai] = []; // Buat grup baru jika lantai belum ada
                }
                roomsByFloor[lantai].push(rm);
            });

            // Loop untuk menggambar setiap lantai ke layar
            for (const lantai in roomsByFloor) {
                // 1. Buat Sekat/Pemisah Lantai
                let floorHeader = document.createElement('div');
                floorHeader.className = 'floor-divider';
                floorHeader.innerHTML = `<i class="fa-solid fa-layer-group"></i> Area Lantai ${lantai}`;
                container.appendChild(floorHeader);

                // 2. Buat Grid Kamar Khusus untuk Lantai Tersebut
                let grid = document.createElement('div');
                grid.className = 'room-grid';

                roomsByFloor[lantai].forEach(rm => {
                    let box = document.createElement('div');
                    box.className = `room-box ${rm.status_visual}`;
                    box.innerHTML = `<i class="fa-solid fa-door-closed mb-1"></i> ${rm.nomor_kamar}`;
                    
                    if (rm.status_visual === 'rm-dirty') {
                        box.onclick = function() {
                            document.getElementById('hk-no-kamar').value = rm.nomor_kamar;
                            document.getElementById('hk-id-kamar').value = rm.id_kamar;
                            document.getElementById('hk-pilih-staf').focus();
                        };
                    } else {
                        box.onclick = function() {
                            let labelStatus = '';
                            if (rm.status_visual === 'rm-clean') labelStatus = 'Bersih / Tersedia';
                            if (rm.status_visual === 'rm-occupied') labelStatus = 'Sedang Terisi Guest';
                            if (rm.status_visual === 'rm-booked') labelStatus = 'Telah Dipesan (Menunggu Check-In)';
                            if (rm.status_visual === 'rm-repair') labelStatus = 'Perbaikan (Maintenance)';
                            alert(`Kamar ${rm.nomor_kamar} saat ini berstatus: ${labelStatus}.`);
                        };
                    }
                    grid.appendChild(box);
                });
                
                // Masukkan grid lantai ini ke dalam kontainer utama
                container.appendChild(grid);
            }
        }
    })
    .catch(err => console.error("Gagal memuat data real-time peta kamar:", err));
}

// Submit form penugasan staf kebersihan
const formTugaskan = document.getElementById('form-tugaskan-staf');
if (formTugaskan) {
    formTugaskan.addEventListener('submit', function(e) {
        e.preventDefault();
        const noKamar = document.getElementById('hk-no-kamar').value;
        const idStaf = document.getElementById('hk-pilih-staf').value;
        const jenisTugas = document.getElementById('hk-jenis').value;
        
        const payload = {
            nomor_kamar: noKamar,
            id_staf: idStaf,
            jenis_tugas: jenisTugas
        };

        fetch('http://127.0.0.1:5000/api/tugaskan-staf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                document.getElementById('form-tugaskan-staf').reset();
            } else {
                alert("Gagal menerbitkan tugas: " + data.message);
            }
        });
    });
}

function simulasiKamarSiap() {
    alert("Kamar berstatus 'Tersedia/Bersih' kembali.");
    document.querySelectorAll('.rm-dirty').forEach(box => {
        box.className = "room-box rm-clean";
    });
}


// Fungsi mengirim perintah ubah status ke Python
function prosesReservasi(id_reservasi, statusBaru) {
    if(confirm(`Ubah status pesanan ${id_reservasi} menjadi ${statusBaru}?`)) {
        fetch('http://127.0.0.1:5000/api/update-reservasi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reservasi: id_reservasi, status_baru: statusBaru })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                loadAdminData(); // Segarkan tabel otomatis
                renderPetaKamarAsli(); // Segarkan peta kamar otomatis
            } else {
                alert("Gagal: " + data.message);
            }
        });
    }
}



// Fungsi untuk memproses penambahan tugas Housekeeping ke database
function simpanTugasHousekeeping() {
    // 1. Ambil data dari elemen-elemen form di Gambar 1
    // Asumsi ID elemen: hk-no-kamar (input), hk-id-kamar (hidden input untuk ID asli), hk-pilih-staf (select), hk-tanggal (input)
    const idKamar = document.getElementById('hk-id-kamar').value; 
    const noKamar = document.getElementById('hk-no-kamar').value;
    const idStaf = document.getElementById('hk-pilih-staf').value;
    const tanggalTugas = document.getElementById('hk-tanggal').value;

    // Validasi sederhana di sisi klien
    if (!idStaf) {
        alert("Mohon pilih staf Housekeeping terlebih dahulu.");
        return;
    }

    // Tampilkan konfirmasi
    if(confirm(`Konfirmasi penugasan untuk Kamar ${noKamar} pada tanggal ${tanggalTugas}?`)) {
        
        // Nonaktifkan tombol agar tidak diklik dua kali saat memproses
        const btn = document.getElementById('btn-tambah-hk'); // Asumsi ID tombol '+ Tambah Tugas'
        if(btn) { btn.textContent = "MEMPROSES..."; btn.disabled = true; }

        // 2. Siapkan data dalam format JSON
        const dataPayload = {
            id_kamar: idKamar,
            id_staf: idStaf,
            tanggal_tugas: tanggalTugas,
            id_reservasi: null // Set NULL sementara untuk pembersihan rutin
        };

        // 3. Kirim data ke API Python Flask yang baru kita buat
        fetch('http://127.0.0.1:5000/api/tambah-housekeeping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPayload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                alert(data.message);
                // Reset form di Gambar 1 agar bersih kembali
                document.getElementById('hk-id-kamar').value = '';
                document.getElementById('hk-no-kamar').value = 'Pilih Kamar di Peta';
                document.getElementById('hk-pilih-staf').value = ''; 
                // Opsional: Muat ulang data dashboard HK jika ada tabel daftarnya
            } else {
                alert("Gagal menyimpan tugas: " + data.message);
            }
        })
        .catch(err => {
            console.error("Koneksi Error:", err);
            alert("Terjadi kesalahan koneksi ke peladen Python.");
        })
        .finally(() => {
            // Aktifkan kembali tombolnya
            if(btn) { btn.textContent = "+ Tambah Tugas"; btn.disabled = false; }
        });
    }
}