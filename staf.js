// ==========================================
// 1. KEAMANAN & PENGATURAN IDENTITAS
// ==========================================
if (sessionStorage.getItem('staf_logged_in') !== 'true') {
    window.location.href = 'login.html';
}

// Tarik data identitas dari sesi login
const idStafAktif = sessionStorage.getItem('id_staf');
const namaStafAktif = sessionStorage.getItem('staf_username') || 'Staf Housekeeping';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tampilkan Nama Asli di Pojok Kanan Atas
    const namaElement = document.getElementById('nama-staf-aktif');
    if (namaElement) {
        namaElement.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${namaStafAktif}`;
    }

    // 2. Jalankan Jam Digital
    updateJam();
    setInterval(updateJam, 1000);

    // 3. Tarik data tugas milik staf ini dari database
    muatTugasStaf();
});

// ==========================================
// 2. JAM & PRESENSI
// ==========================================
function updateJam() {
    const now = new Date();
    document.getElementById('jam-digital').innerText = now.toLocaleTimeString('id-ID');
    document.getElementById('tanggal-hari-ini').innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function catatPresensi(jenis) {
    Swal.fire({
        title: `Presensi ${jenis} Berhasil!`,
        text: `Semangat bekerja, ${namaStafAktif}!`,
        icon: 'success',
        confirmButtonColor: '#154230'
    });

    if(jenis === 'Masuk') {
        document.getElementById('btn-masuk').disabled = true;
        document.getElementById('btn-pulang').disabled = false;
    } else {
        document.getElementById('btn-masuk').disabled = false;
        document.getElementById('btn-pulang').disabled = true;
    }
}

// ==========================================
// 3. LOGIKA PENARIKAN TUGAS DARI DATABASE
// ==========================================
async function muatTugasStaf() {
    const container = document.getElementById('container-tugas');
    container.innerHTML = '<p class="text-muted">Sedang memeriksa tugas baru...</p>';

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/tugas-staf/${idStafAktif}`);
        const result = await response.json();

        if (result.status === 'success') {
            const dataTugas = result.data;
            container.innerHTML = ''; // Kosongkan tulisan loading

            if (dataTugas.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-success text-center">
                        <i class="fa-solid fa-mug-hot fa-2x mb-2"></i><br>
                        Tidak ada tugas aktif saat ini. Anda bisa bersantai atau menunggu instruksi dari Admin.
                    </div>`;
                return;
            }

            // Jika ada tugas, buatkan kartunya satu per satu
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

// ==========================================
// 4. PENYELESAIAN TUGAS
// ==========================================
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
                // Kirim laporan ke database Python
                const response = await fetch('http://127.0.0.1:5000/api/selesai-tugas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_jadwal: idJadwal, id_kamar: idKamar })
                });
                
                const data = await response.json();

                if (data.status === 'success') {
                    Swal.fire('Laporan Terkirim!', `Kamar ${nomorKamar} telah diperbarui menjadi warna Hijau di layar Admin.`, 'success');
                    
                    // Segarkan daftar tugas di layar
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
    // 1. Sembunyikan semua section
    document.querySelectorAll('.staf-section').forEach(sec => sec.classList.remove('active'));
    
    // 2. Tampilkan section yang dipilih
    document.getElementById(sectionId).classList.add('active');

    // 3. Update status aktif di nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    element.classList.add('active');
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}