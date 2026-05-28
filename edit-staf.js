document.addEventListener('DOMContentLoaded', function() {
    // Jalankan inisialisasi halaman edit
    inisialisasiHalamanEdit();
});

async function inisialisasiHalamanEdit() {
    // 1. Ambil ID dari URL (?id=BO-002)
    const urlParams = new URLSearchParams(window.location.search);
    const idStaf = urlParams.get('id');

    if (!idStaf) {
        Swal.fire('Error!', 'ID Staf tidak ditemukan.', 'error').then(() => {
            window.location.href = 'admin.html';
        });
        return;
    }

    // 2. Ambil data staf dari Backend untuk mengisi form otomatis
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/staf/${idStaf}`);
        const result = await response.json();

        if (result.status === 'success') {
            const staf = result.data;
            document.getElementById('edit-id').value = staf.kode_staf || staf.id_staf;
            document.getElementById('edit-nama').value = staf.nama_staf;
            document.getElementById('edit-posisi').value = staf.id_posisi;
            document.getElementById('edit-telepon').value = staf.nomor_telepon;
            document.getElementById('edit-username').value = staf.username;
        } else {
            Swal.fire('Error!', 'Data staf tidak ditemukan.', 'error');
        }
    } catch (err) {
        Swal.fire('Error!', 'Gagal menarik data dari server.', 'error');
    }

    // 3. Tangani pengiriman data form (Submit)
    const formEdit = document.getElementById('form-edit-staf');
    if (formEdit) {
        formEdit.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const btnSimpan = document.getElementById('btn-simpan');
            btnSimpan.disabled = true;
            btnSimpan.innerHTML = 'Menyimpan...';

            const payload = {
                nama_staf: document.getElementById('edit-nama').value,
                id_posisi: document.getElementById('edit-posisi').value,
                nomor_telepon: document.getElementById('edit-telepon').value,
                username: document.getElementById('edit-username').value
            };

            try {
                const response = await fetch(`http://127.0.0.1:5000/api/staf/${idStaf}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    Swal.fire('Tersimpan!', 'Data staf berhasil diperbarui.', 'success').then(() => {
                        window.location.href = 'admin.html';
                    });
                } else {
                    Swal.fire('Gagal!', result.message, 'error');
                    btnSimpan.disabled = false;
                    btnSimpan.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
                }
            } catch (err) {
                Swal.fire('Error!', 'Gagal menyimpan data.', 'error');
                btnSimpan.disabled = false;
                btnSimpan.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
            }
        });
    }
}