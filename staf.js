// KEAMANAN & PENGATURAN IDENTITAS

if (sessionStorage.getItem('staf_logged_in') !== 'true') {
    window.location.href = 'login.html';
}

// tarik data identitas dari sesi login
const idStafAktif = sessionStorage.getItem('id_staf');
const namaStafAktif = sessionStorage.getItem('staf_username') || 'Staf Housekeeping';

document.addEventListener('DOMContentLoaded', () => {
    const namaElement = document.getElementById('nama-staf-aktif');
    const namaSidebar = document.getElementById('nama-staf-sidebar');
    
    if (namaElement) namaElement.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${namaStafAktif}`;
    if (namaSidebar) namaSidebar.innerText = namaStafAktif;

    updateJam();
    setInterval(updateJam, 1000);
    
    muatTugasStaf();
    muatRiwayatPresensi();
    muatProfilStaf();
    muatSlipGaji();
});


// JAM & PRESENSI

function updateJam() {
    const now = new Date();
    document.getElementById('jam-digital').innerText = now.toLocaleTimeString('id-ID');
    document.getElementById('tanggal-hari-ini').innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function catatPresensi(tipe) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/presensi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_staf: idStafAktif, 
                tipe_absen: tipe 
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            Swal.fire({
                title: `Presensi ${tipe} Berhasil!`,
                text: 'Waktu Anda telah dicatat oleh sistem.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            // tutup-buka tombol
            if (tipe === 'Masuk') {
                document.getElementById('btn-masuk').disabled = true;
                
                const btnSakit = document.getElementById('btn-sakit');
                const btnIzin = document.getElementById('btn-izin');
                if (btnSakit) btnSakit.disabled = true;
                if (btnIzin) btnIzin.disabled = true;
                
                document.getElementById('btn-pulang').disabled = false; 

            } else if (tipe === 'Pulang') {
                document.getElementById('btn-pulang').disabled = true;
            }
            
            if (typeof muatRiwayatPresensi === "function") {
                muatRiwayatPresensi();
            }
        } else {
            Swal.fire('Gagal!', result.message, 'warning');
        }
    } catch (error) {
        Swal.fire('Error!', 'Koneksi ke server database gagal.', 'error');
    }
}


// PENARIKAN TUGAS DARI DATABASE

async function muatTugasStaf() {
    const container = document.getElementById('container-tugas');
    container.innerHTML = '<p class="text-muted">Sedang memeriksa tugas baru...</p>';

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/tugas-staf/${idStafAktif}`);
        const result = await response.json();

        if (result.status === 'success') {
            const dataTugas = result.data;
            container.innerHTML = '';

            if (dataTugas.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-success text-center">
                        <i class="fa-solid fa-mug-hot fa-2x mb-2"></i><br>
                        Tidak ada tugas aktif saat ini. Anda bisa bersantai atau menunggu instruksi dari Admin.
                    </div>`;
                return;
            }

            // jika ada tugas, buatkan kartunya satu per satu
            dataTugas.forEach(tugas => {
                const card = document.createElement('div');
                card.className = 'card p-3 task-card';
                card.id = `tugas-${tugas.id_jadwal}`;
                
                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="m-0 text-warning">Kamar ${tugas.nomor_kamar}</h4>
                            <p class="m-0 text-muted">Instruksi: ${tugas.jenis_tugas}</p>
                        </div>
                        <button class="btn btn-warning fw-bold" onclick="tandaiSelesai(${tugas.id_jadwal}, ${tugas.id_kamar}, '${tugas.nomor_kamar}')">
                            <i class="fa-solid fa-check"></i> Tandai Bersih
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Gagal terhubung ke server.</div>';
    }
}


// PENYELESAIAN TUGAS

function tandaiSelesai(idJadwal, idKamar, nomorKamar) {
    Swal.fire({
        title: `Konfirmasi Pembersihan`,
        text: `Apakah Anda yakin Kamar ${nomorKamar} sudah bersih dan rapi?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Kamar Bersih!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            
            try {
                const response = await fetch('http://127.0.0.1:5000/api/selesai-tugas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_jadwal: idJadwal, id_kamar: idKamar })
                });
                
                const data = await response.json();

                if (data.status === 'success') {
                    Swal.fire('Laporan Terkirim!', `Kamar ${nomorKamar} telah diperbarui menjadi warna Hijau di layar Admin.`, 'success');
                    
                    muatTugasStaf();
                } else {
                    Swal.fire('Gagal!', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error!', 'Gagal mengirim laporan ke server.', 'error');
            }
        }
    });
}


function switchSection(sectionId, element) {
    document.querySelectorAll('.staf-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}



// FUNGSI MEMUAT RIWAYAT PRESENSI DI TABEL

async function muatRiwayatPresensi() {
    const tbody = document.querySelector('table tbody'); 
    if (!tbody) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/presensi/riwayat/${idStafAktif}`);
        const result = await response.json();

        if (result.status === 'success') {
            tbody.innerHTML = '';

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada riwayat presensi.</td></tr>';
                return;
            }

            result.data.forEach(item => {
                const waktuMasuk = item.waktu_masuk || item.jam_masuk || '-';
                const waktuPulang = item.waktu_pulang || item.jam_keluar || '-';

                // durasi kerja
                let teksDurasi = '<span class="text-muted fw-bold">Belum Selesai</span>';
                
                if (waktuMasuk !== '-' && waktuPulang !== '-') {
                    const masuk = new Date(`1970-01-01T${waktuMasuk}`);
                    const pulang = new Date(`1970-01-01T${waktuPulang}`);
                    const selisihMs = pulang - masuk;

                    // konversi jam ke menit
                    const jam = Math.floor(selisihMs / (1000 * 60 * 60));
                    const menit = Math.floor((selisihMs % (1000 * 60 * 60)) / (1000 * 60));
                    teksDurasi = `<span class="fw-bold text-dark">${jam} Jam ${menit} Menit</span>`;
                }

                // warna badge status
                let badgeStatus = 'bg-primary';
                if (item.status === 'Sakit') badgeStatus = 'bg-warning text-dark';
                if (item.status === 'Izin') badgeStatus = 'bg-info text-dark';
                if (item.status === 'Mangkir') badgeStatus = 'bg-danger';

                tbody.innerHTML += `
                    <tr class="align-middle text-center">
                        <td class="fw-bold">${item.tanggal}</td>
                        <td>
                            ${waktuMasuk !== '-' ? `<span class="badge bg-success py-2 px-3"><i class="fa-solid fa-arrow-right-to-bracket me-1"></i> ${waktuMasuk}</span>` : '-'}
                        </td>
                        <td>
                            ${waktuPulang !== '-' ? `<span class="badge bg-danger py-2 px-3"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i> ${waktuPulang}</span>` : '-'}
                        </td>
                        <td>${teksDurasi}</td>
                        <td><span class="badge ${badgeStatus} py-1 px-2">${item.status || 'Hadir'}</span></td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Gagal memuat riwayat presensi:", error);
    }
}



// MANAJEMEN PROFIL & PASSWORD

async function muatProfilStaf() {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/profil/${idStafAktif}`);
        const result = await response.json();

        if (result.status === 'success') {
            const data = result.data;
            document.getElementById('prof-nama').innerText = data.nama_staf;
            document.getElementById('prof-jabatan').innerText = data.nama_posisi;
            document.getElementById('prof-kode').innerText = `: ${data.kode_staf}`;
            document.getElementById('prof-telepon').innerText = `: ${data.nomor_telepon}`;
            document.getElementById('prof-username').innerText = `: ${data.username}`;
        }
    } catch (error) {
        console.error("Gagal memuat profil:", error);
    }
}

// Logika Ubah Password
const formUbahPassword = document.getElementById('form-ubah-password');
if (formUbahPassword) {
    formUbahPassword.addEventListener('submit', async function(e) {
        e.preventDefault();

        const passLama = document.getElementById('pass-lama').value;
        const passBaru = document.getElementById('pass-baru').value;
        const passKonfirm = document.getElementById('pass-konfirm').value;

        if (passBaru.length < 6) {
            return Swal.fire('Gagal!', 'Kata sandi baru minimal harus 6 karakter.', 'warning');
        }
        if (passBaru !== passKonfirm) {
            return Swal.fire('Gagal!', 'Konfirmasi kata sandi tidak cocok dengan sandi baru.', 'error');
        }
        if (passLama === passBaru) {
            return Swal.fire('Peringatan!', 'Kata sandi baru tidak boleh sama dengan kata sandi lama.', 'warning');
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/api/ubah-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_staf: idStafAktif,
                    pass_lama: passLama,
                    pass_baru: passBaru
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                Swal.fire('Berhasil!', result.message, 'success');
                formUbahPassword.reset();
            } else {
                Swal.fire('Akses Ditolak!', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error!', 'Gagal menghubungi server.', 'error');
        }
    });
}



// MODUL SLIP GAJI


// Fungsi singkat untuk format Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

async function muatSlipGaji() {
    const tbody = document.getElementById('table-gaji-body');
    if(!tbody) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/gaji/${idStafAktif}`);
        const result = await response.json();

        if (result.status === 'success') {
            tbody.innerHTML = ''; 
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Belum ada catatan slip gaji.</td></tr>';
                return;
            }

            result.data.forEach(row => {
                const statusBadge = row.status_pembayaran === 'Terbayar' 
                    ? '<span class="badge bg-success"><i class="fa-solid fa-check"></i> Terbayar</span>' 
                    : '<span class="badge bg-warning text-dark"><i class="fa-solid fa-hourglass-half"></i> Pending</span>';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="fw-bold text-secondary">${row.periode_bulan}</td>
                    <td>${formatRupiah(row.gaji_pokok)}</td>
                    <td class="text-success">+ ${formatRupiah(row.tunjangan)}</td>
                    <td class="text-danger">- ${formatRupiah(row.potongan)}</td>
                    <td class="fw-bold text-primary fs-6">${formatRupiah(row.total_bersih)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="cetakGaji('${row.periode_bulan}')">
                            <i class="fa-solid fa-print"></i> Cetak
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger py-4">Gagal memuat data dari server.</td></tr>';
    }
}

// Simulasi tombol cetak PDF
function cetakGaji(periode) {
    Swal.fire({
        title: 'Mencetak Dokumen',
        text: `Menyiapkan PDF Slip Gaji periode ${periode}...`,
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });
}



// FUNGSI PENGAJUAN IZIN / SAKIT (DIPISAH)

async function laporAbsen(tipe) {
    // 1. sesuaikan pesan dan warna berdasarkan tipe yang diklik
    let pesanTeks = '';
    let warnaTombol = '';
    
    if (tipe === 'Sakit') {
        pesanTeks = 'Apakah Anda yakin ingin melapor Sakit hari ini? Bukti surat keterangan dokter wajib diserahkan ke HRD saat Anda kembali bekerja.';
        warnaTombol = '#ffc107';
    } else {
        pesanTeks = 'Apakah Anda yakin ingin mengajukan Izin/Cuti hari ini? Pastikan Anda sudah berkoordinasi dengan atasan divisi Anda.';
        warnaTombol = '#0dcaf0';
    }

    // 2. munculkan pop-up konfirmasi langsung
    const result = await Swal.fire({
        title: `Konfirmasi Lapor ${tipe}`,
        text: pesanTeks,
        icon: tipe === 'Sakit' ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: warnaTombol,
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Ya, Lapor ${tipe}`,
        cancelButtonText: 'Batal'
    });

    // 3. jika user menekan "Ya"
    if (result.isConfirmed) {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/izin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id_staf: idStafAktif, 
                    status: tipe
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                Swal.fire('Laporan Terkirim!', data.message, 'success');
                
                document.getElementById('btn-masuk').disabled = true;
                document.getElementById('btn-pulang').disabled = true;
                document.getElementById('btn-sakit').disabled = true;
                document.getElementById('btn-izin').disabled = true;
                
                // perbarui tabel Riwayat Presensi
                muatRiwayatPresensi();
            } else {
                Swal.fire('Gagal!', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error!', 'Koneksi ke server database gagal.', 'error');
        }
    }
}