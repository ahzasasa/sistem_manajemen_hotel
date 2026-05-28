// ==========================================
// SISTEM KEAMANAN & OTORISASI HALAMAN
// ==========================================

const isAdminMaster = sessionStorage.getItem('isAdminMaster');

if (isAdminMaster !== 'true') {
    alert("Akses Ditolak! Halaman ini hanya untuk Administrator Utama.");
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

    if (sectionId === 'sec-staf') muatAnalitik();
    if (sectionId === 'sec-housekeeping') renderPetaKamarAsli();
    
    if (sectionId === 'sec-reservasi') {
        if (typeof loadAdminData === "function") muatHubReservasi();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const isAdminMaster = sessionStorage.getItem('isAdminMaster');

    if (isAdminMaster !== 'true') {
        alert("Akses Ditolak! Halaman ini hanya untuk Administrator Utama.");
        window.location.href = 'login.html';
        return;
    }

    loadAdminData();
    populateStafDropdown();
    renderPetaKamarAsli();
    muatDaftarStaf();
    muatAnalitik();

    // ... (Sisa baris 43 dan seterusnya biarkan saja persis seperti aslinya)
    const btnTambahHK = document.getElementById('btn-tambah-hk');
    if (btnTambahHK) {
        btnTambahHK.addEventListener('click', simpanTugasHousekeeping);
    }
    const labelTanggal = document.getElementById('label-tanggal-tugas');
    if (labelTanggal) {
        const opsiTanggal = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        labelTanggal.innerText = new Date().toLocaleDateString('id-ID', opsiTanggal);
    }

    setInterval(() => {
        const tabReservasi = document.getElementById('sec-reservasi');
        if (tabReservasi && tabReservasi.classList.contains('active')) {
            if (typeof loadAdminData === "function") {
                muatHubReservasi();
            }
            
        }
    }, 15000); // 15000 milidetik = Refresh otomatis setiap 15 Detik
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
                let btnAksi = '';
                if (r.status_pesanan === 'Menunggu') {
                    btnAksi = `
                        <button class="btn btn-sm btn-success btn-action me-1" onclick="prosesReservasi('${r.id_reservasi}', 'Aktif')">
                            <i class="fa-solid fa-key"></i> Check-In
                        </button>
                        <button class="btn btn-sm btn-danger btn-action" onclick="prosesReservasi('${r.id_reservasi}', 'Batal')">Batal</button>
                    `;
                } else if (r.status_pesanan === 'Aktif') {
                    // =========================================================================
                    // INI PERUBAHANNYA: Menambahkan parameter ketiga '${r.status_pembayaran}'
                    // =========================================================================
                    btnAksi = `
                        <button class="btn btn-sm btn-warning btn-action" onclick="prosesReservasi('${r.id_reservasi}', 'Selesai', '${r.status_pembayaran}')">
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
                // PAKSA menjadi String terlebih dahulu agar aman dari crash tipe data
                let nomorKamarStr = String(rm.nomor_kamar);
                
                // Jika nomor kamar di MySQL berupa angka biasa (misal 101, 205), gunakan cara ini:
                // Jika panjangnya 3 digit, lantai adalah karakter pertama. Jika 4 digit, 2 karakter pertama.
                let lantai = 1;
                if (nomorKamarStr.length === 3) {
                    lantai = parseInt(nomorKamarStr.substring(0, 1), 10); // 101 -> Lantai 1
                } else if (nomorKamarStr.length === 4) {
                    lantai = parseInt(nomorKamarStr.substring(0, 2), 10); // 1205 -> Lantai 12
                } else {
                    // Jika nomor kamarmu berformat teks "0301", logika aslimu di bawah ini akan aktif otomatis:
                    lantai = parseInt(nomorKamarStr.substring(0, 2), 10);
                }
                
                if (!roomsByFloor[lantai]) {
                    roomsByFloor[lantai] = []; 
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
                    
                    // Sensor klik dinamis untuk berbagai warna kamar
                    box.onclick = function() {
                        // 1. JIKA KAMAR BIRU (Aktif) ATAU UNGU (Menunggu) DIKLIK (Munculkan Modal Detail Tamu)
                        if (rm.status_visual === 'rm-occupied' || rm.status_visual === 'rm-booked') {
                            fetch(`http://127.0.0.1:5000/api/detail-kamar-aktif?nomor_kamar=${rm.nomor_kamar}`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data.status === 'success') {
                                        let d = data.data;
                                        document.getElementById('dtl-kamar').innerText = d.nomor_kamar;
                                        document.getElementById('dtl-id').innerText = d.id_reservasi;
                                        document.getElementById('dtl-nama').innerText = d.nama_lengkap;
                                        document.getElementById('dtl-telepon').innerText = d.nomor_telepon;
                                        document.getElementById('dtl-email').innerText = d.email;
                                        document.getElementById('dtl-masuk').innerText = d.tanggal_masuk;
                                        document.getElementById('dtl-keluar').innerText = d.tanggal_keluar;
                                        document.getElementById('dtl-transaksi').innerText = d.referensi_transaksi || '-';
                                        
                                        let badgeBayar = d.status_pembayaran === 'Lunas' ? 'bg-success' : 'bg-danger';
                                        document.getElementById('dtl-bayar').innerHTML = `<span class="badge ${badgeBayar}">${d.status_pembayaran}</span>`;
                                        
                                        let modalTamu = new bootstrap.Modal(document.getElementById('modalDetailTamu'));
                                        modalTamu.show();
                                    } else {
                                        Swal.fire('Gagal!', "Tidak dapat mengambil data tamu: " + data.message, 'error');
                                    }
                                })
                                .catch(err => {
                                    console.error("Error:", err);
                                    Swal.fire('Error!', "Koneksi ke server gagal.", 'error');
                                });
                        } 
                        // 2. JIKA KAMAR KUNING DIKLIK (Kotor / Jeda)
                        else if (rm.status_visual === 'rm-dirty') {
                            // Isi form target secara otomatis
                            document.getElementById('hk-no-kamar').value = rm.nomor_kamar;
                            let inputIdKamar = document.getElementById('hk-id-kamar');
                            if (inputIdKamar) inputIdKamar.value = rm.id_kamar;

                            // Munculkan Pop-up SweetAlert Kuning
                            Swal.fire({
                                title: 'Kamar Perlu Dibersihkan!',
                                text: `Kamar ${rm.nomor_kamar} berstatus Kotor/Jeda. Nomor kamar telah otomatis dimasukkan ke formulir Surat Tugas di sebelah kiri.`,
                                icon: 'warning',
                                confirmButtonColor: '#ffc107', // Warna kuning Bootstrap
                                confirmButtonText: 'Oke, Siapkan Tugas!'
                            });
                        }
                        // 3. JIKA KAMAR HIJAU ATAU ABU-ABU DIKLIK (Bersih / Perbaikan)
                        else {
                            let labelStatus = '';
                            let warnaTombol = '';
                            let ikonTipe = '';

                            if (rm.status_visual === 'rm-clean') {
                                labelStatus = 'Bersih / Tersedia';
                                warnaTombol = '#198754'; // Hijau Bootstrap
                                ikonTipe = 'success';
                            } else if (rm.status_visual === 'rm-repair') {
                                labelStatus = 'Perbaikan (Maintenance)';
                                warnaTombol = '#6c757d'; // Abu-abu Bootstrap
                                ikonTipe = 'info';
                            }
                            
                            if (labelStatus !== '') {
                                Swal.fire({
                                    title: 'Status Kamar',
                                    text: `Kamar ${rm.nomor_kamar} saat ini berstatus: ${labelStatus}.`,
                                    icon: ikonTipe,
                                    confirmButtonColor: warnaTombol,
                                    confirmButtonText: 'Tutup'
                                });
                            }
                        }
                    };
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
                // Pop-up Sukses Elegan
                Swal.fire({
                    title: 'Berhasil!',
                    text: data.message, // Menampilkan pesan dari Python
                    icon: 'success',
                    confirmButtonColor: '#198754',
                    confirmButtonText: 'Tutup'
                }).then(() => {
                    // Menggunakan kode reset pintarmu
                    document.getElementById('form-tugaskan-staf').reset();
                });
            } else {
                // Pop-up Gagal Elegan
                Swal.fire('Gagal!', data.message, 'error');
            }
        });
    });
}

function simulasiKamarSiap() {
    Swal.fire('Pembersihan Selesai', "Kamar berstatus 'Tersedia/Bersih' kembali.", 'success');
    document.querySelectorAll('.rm-dirty').forEach(box => {
        box.className = "room-box rm-clean";
    });
}


// Fungsi mengirim perintah ubah status ke Python
function prosesReservasi(id_reservasi, statusBaru, statusBayar = 'Lunas') {
    
    // Cegah Check-Out jika tagihan belum lunas
    if (statusBaru === 'Selesai' && statusBayar !== 'Lunas') {
        Swal.fire({
            title: 'Tindakan Ditolak!',
            text: 'Tamu belum melakukan pembayaran (UNPAID). Selesaikan tagihan terlebih dahulu sebelum Check-Out.',
            icon: 'error',
            confirmButtonColor: '#d33',
            confirmButtonText: 'Mengerti'
        });
        return; // Hentikan fungsi di sini, jangan hubungi server
    }
    // ========================================================

    // Logika cerdas untuk 3 status berbeda (Check-In, Check-Out, Batal)
    let warnaTombol, teksTombol, teksTanya, ikonSweet;

    if (statusBaru === 'Aktif') {
        warnaTombol = '#198754'; // Hijau untuk masuk
        teksTombol = 'Ya, Check-In!';
        teksTanya = 'melakukan Check-In';
        ikonSweet = 'question';
    } else if (statusBaru === 'Selesai') {
        warnaTombol = '#0d6efd'; // Biru untuk selesai
        teksTombol = 'Ya, Check-Out!';
        teksTanya = 'melakukan Check-Out (menyelesaikan pesanan)';
        ikonSweet = 'info';
    } else {
        warnaTombol = '#d33'; // Merah untuk batal
        teksTombol = 'Ya, Batalkan!';
        teksTanya = 'membatalkan pesanan';
        ikonSweet = 'warning';
    }

    Swal.fire({
        title: 'Konfirmasi Tindakan',
        text: `Apakah Anda yakin ingin ${teksTanya} untuk ID ${id_reservasi}?`,
        icon: ikonSweet,
        showCancelButton: true,
        confirmButtonColor: warnaTombol,
        cancelButtonColor: '#6c757d',
        confirmButtonText: teksTombol,
        cancelButtonText: 'Tutup',
        backdrop: `rgba(0,0,0,0.5)`
    }).then((result) => {
        if (result.isConfirmed) {
            
            // Tampilkan animasi loading saat memproses
            Swal.fire({
                title: 'Memproses...',
                text: 'Menghubungi server...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Kirim ke server
            fetch('http://127.0.0.1:5000/api/update-reservasi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_reservasi: id_reservasi, status_baru: statusBaru })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    // Pop-up Berhasil
                    Swal.fire({
                        title: 'Berhasil!',
                        text: `Pesanan ${id_reservasi} berhasil diperbarui.`,
                        icon: 'success',
                        confirmButtonColor: warnaTombol
                    }).then(() => {
                        loadAdminData(); // Segarkan tabel otomatis
                        renderPetaKamarAsli(); // Segarkan peta kamar otomatis
                    });
                } else {
                    Swal.fire('Gagal!', "Pesan: " + data.message, 'error');
                }
            })
            .catch(err => {
                console.error(err);
                Swal.fire('Error!', "Koneksi gagal ke server.", 'error');
            });
        }
    });
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

// ==========================================
// FUNGSI MEMUAT DAFTAR KARYAWAN (FULL WIDTH)
// ==========================================
async function muatDaftarStaf() {
    const tbody = document.getElementById('table-karyawan-body');
    const labelTotal = document.getElementById('total-staf');
    if (!tbody) return;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/staf');
        const result = await response.json();

        if (result.status === 'success') {
            tbody.innerHTML = ''; 
            if(labelTotal) labelTotal.innerText = result.data.length;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data.</td></tr>';
                return;
            }

            result.data.forEach(staf => {
                // 1. Buat Email buatan dari Username
                const emailPerusahaan = `${staf.username}@hotelreservasi.com`;
                
                // 2. Format Waktu
                const jamMasuk = staf.waktu_masuk ? `<span class="fw-bold text-success">${staf.waktu_masuk}</span>` : '<span class="text-muted">-</span>';
                const jamPulang = staf.waktu_pulang ? `<span class="fw-bold text-danger">${staf.waktu_pulang}</span>` : '<span class="text-muted">-</span>';
                
                // 3. Desain Lencana Status
                let badgeStatus = '<span class="badge bg-light text-secondary border">Belum Hadir</span>';
                if (staf.status === 'Hadir') badgeStatus = '<span class="badge bg-success">Hadir</span>';
                else if (staf.status === 'Sakit') badgeStatus = '<span class="badge bg-warning text-dark">Sakit</span>';
                else if (staf.status === 'Izin') badgeStatus = '<span class="badge bg-info text-dark">Izin</span>';
                else if (staf.status === 'Mangkir') badgeStatus = '<span class="badge bg-danger">Mangkir</span>';

                // 4. Susun Baris Tabel
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="ps-4 fw-bold text-muted">${staf.id_staf || '-'}</td>
                    <td>
                        <div class="fw-bold text-dark">${staf.nama_staf}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${emailPerusahaan}</div>
                    </td>
                    <td><span class="badge border border-secondary text-secondary">${staf.nama_posisi}</span></td>
                    <td>${jamMasuk}</td>
                    <td>${jamPulang}</td>
                    <td>${badgeStatus}</td>
                    
                    <td class="pe-4 text-end">
                        <button class="btn btn-sm btn-light text-primary me-1" title="Edit Data" onclick="editStaf('${staf.id_staf}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-sm btn-light text-danger" title="Hapus" onclick="hapusStaf('${staf.id_staf}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal terhubung ke database.</td></tr>';
    }
}



// ==========================================
// ANALITIK: PIE CHART & HEATMAP (INTERAKTIF & TIME TRAVEL)
// ==========================================
let tanggalAnalitik = new Date(); 
let pieChartInstance = null; 

let currentTotalStaf = 1;
let currentJumlahHari = 30;
let dataBulananStatus = { 'Sakit': 0, 'Izin': 0, 'Mangkir': 0 };
let dataHarianDetail = {}; 

function geserBulan(arah) {
    tanggalAnalitik.setMonth(tanggalAnalitik.getMonth() + arah);
    muatAnalitik();
}

function updateTampilanPie(judul, dataStatus, pengaliHari) {
    const ctx = document.getElementById('absensiPieChart');
    const teksKosong = document.getElementById('teks-pie-kosong');
    const centerLabel = document.getElementById('center-label-container');
    const labelPersen = document.getElementById('label-persen-absen');
    const judulEl = document.getElementById('judul-pie-chart');
    const btnReset = document.getElementById('btn-reset-pie');
    
    if (judulEl) judulEl.innerText = judul;

    if (judul === '(Bulan Ini)') {
        if(btnReset) btnReset.classList.add('d-none');
    } else {
        if(btnReset) btnReset.classList.remove('d-none');
    }

    const totalAbsen = dataStatus['Sakit'] + dataStatus['Izin'] + dataStatus['Mangkir'];

    if (totalAbsen === 0) {
        if(ctx) ctx.style.display = 'none';
        if(centerLabel) centerLabel.style.display = 'none';
        if(teksKosong) teksKosong.classList.remove('d-none');
    } else {
        if(ctx) ctx.style.display = 'block';
        if(centerLabel) centerLabel.style.display = 'block';
        if(teksKosong) teksKosong.classList.add('d-none');

        const rasio = (totalAbsen / (currentTotalStaf * pengaliHari)) * 100;
        if(labelPersen) labelPersen.innerText = rasio.toFixed(1) + '%';

        if (pieChartInstance) {
            pieChartInstance.data.datasets[0].data = [dataStatus['Sakit'], dataStatus['Izin'], dataStatus['Mangkir']];
            pieChartInstance.update();
        }
    }
}

function klikHeatmapHari(hari) {
    const detailHariIni = dataHarianDetail[hari];
    updateTampilanPie(`(Tgl ${hari})`, detailHariIni, 1);
}

function resetPieChart() {
    updateTampilanPie('(Bulan Ini)', dataBulananStatus, currentJumlahHari);
}

async function muatAnalitik() {
    const container = document.getElementById('heatmap-calendar');
    const labelBulan = document.getElementById('label-bulan-analitik');
    if (!container) return;

    const tahun = tanggalAnalitik.getFullYear();
    const bulan = tanggalAnalitik.getMonth(); 
    if(labelBulan) labelBulan.innerText = tanggalAnalitik.toLocaleString('id-ID', { month: 'short', year: 'numeric' });

    currentJumlahHari = new Date(tahun, bulan + 1, 0).getDate();
    const hariPertama = new Date(tahun, bulan, 1).getDay(); 

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/presensi/rekap?bulan=${bulan + 1}&tahun=${tahun}`);
        const result = await response.json();
        
        let dataHarianTotal = {};
        
        dataBulananStatus = { 'Sakit': 0, 'Izin': 0, 'Mangkir': 0 };
        dataHarianDetail = {};
        for(let i=1; i<=31; i++) { dataHarianDetail[i] = { 'Sakit': 0, 'Izin': 0, 'Mangkir': 0 }; }

        if (result.status === 'success') {
            currentTotalStaf = result.total_staf || 1;
            
            result.data_harian.forEach(item => { dataHarianTotal[item.hari] = item.total_absen; });
            result.data_status.forEach(item => { dataBulananStatus[item.status] = item.jumlah; });
            
            if(result.data_harian_detail) {
                result.data_harian_detail.forEach(item => {
                    dataHarianDetail[item.hari][item.status] = item.jumlah;
                });
            }

            // --- 1. LUKIS KOTAK HEATMAP ---
            container.innerHTML = ''; 
            const namaHari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            namaHari.forEach(hari => { container.innerHTML += `<div class="text-center small fw-bold text-muted mb-2">${hari}</div>`; });
            for (let i = 0; i < hariPertama; i++) { container.innerHTML += `<div class="heatmap-box" style="visibility: hidden;"></div>`; }

            for (let d = 1; d <= currentJumlahHari; d++) {
                const jumlahAbsen = dataHarianTotal[d] || 0;
                const persentase = (jumlahAbsen / currentTotalStaf) * 100;

                let kelasWarna = 'legend-0';
                if (jumlahAbsen > 0) {
                    if (persentase >= 30) kelasWarna = 'legend-4';
                    else if (persentase >= 20) kelasWarna = 'legend-3';
                    else if (persentase >= 10) kelasWarna = 'legend-2';
                    else kelasWarna = 'legend-1';
                }

                container.innerHTML += `
                    <div class="heatmap-box ${kelasWarna}" 
                         title="Tgl ${d}: ${jumlahAbsen} Absen (Klik untuk rincian)" 
                         onclick="klikHeatmapHari(${d})">
                        ${d}
                    </div>
                `;
            }

            // --- 2. INISIALISASI KANVAS PIE CHART ---
            const ctx = document.getElementById('absensiPieChart');
            if (pieChartInstance) { pieChartInstance.destroy(); }
            
            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Sakit', 'Izin / Cuti', 'Mangkir'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#ffc107', '#0dcaf0', '#dc3545'],
                        hoverOffset: 10,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20, font: { size: 11, weight: 'bold' } } },
                        tooltip: { callbacks: { label: function(c) { return ` ${c.label}: ${c.raw} Kejadian`; } } }
                    },
                    cutout: '75%' 
                }
            });

            // --- 3. PASANG DATA SEBAGAI TAMPILAN AWAL ---
            const waktuAsli = new Date();
        
            if (tahun === waktuAsli.getFullYear() && bulan === waktuAsli.getMonth()) {
                klikHeatmapHari(waktuAsli.getDate());
            } else {
                resetPieChart();
            }
        }
    } catch (error) {
        console.error("Gagal memuat analitik:", error);
    }
}


// ==========================================
// FUNGSI MENGHAPUS STAF (TOMBOL SAMPAH)
// ==========================================
async function hapusStaf(idStaf) {
    const konfirmasi = await Swal.fire({
        title: 'Berhentikan Staf?',
        text: "Data staf ini akan dihapus permanen dari sistem!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (konfirmasi.isConfirmed) {
        try {
            // Mengirim perintah DELETE ke Python
            const response = await fetch(`http://127.0.0.1:5000/api/staf/${idStaf}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.status === 'success') {
                Swal.fire('Terhapus!', 'Staf berhasil diberhentikan.', 'success');
                // Refresh tabel otomatis (GANTI dengan nama fungsi pemanggil tabel Anda)
                tampilkanTabelStaf(); 
            } else {
                Swal.fire('Gagal!', data.message, 'error');
            }
        } catch (err) {
            Swal.fire('Error!', 'Gagal terhubung ke server.', 'error');
        }
    }
}

// ==========================================
// FUNGSI MENGEDIT STAF (ALIHKAN KE HALAMAN BARU)
// ==========================================
function editStaf(idStaf) {
    window.location.href = `edit-staf.html?id=${idStaf}`;
}


// ==========================================
// JALANKAN SAAT HALAMAN DIMUAT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Panggil fungsi pemuat tabel staf
    muatDaftarStaf();
});