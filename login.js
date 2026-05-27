// =================================================================
// 1. LOGIKA TOGGLE UI (Tamu vs Admin/Staf)
// =================================================================
function pilihPeran(peran) {
    const btnTamu = document.getElementById('btn-tab-tamu');
    const btnAdmin = document.getElementById('btn-tab-admin');
    const formTamu = document.getElementById('form-tamu');
    const formAdmin = document.getElementById('form-admin');
    const pesanError = document.getElementById('pesan-error');

    if (peran === 'tamu') {
        btnTamu.classList.add('active');
        btnAdmin.classList.remove('active');
        formTamu.classList.add('active');
        formAdmin.classList.remove('active');
    } else if (peran === 'admin') {
        btnAdmin.classList.add('active');
        btnTamu.classList.remove('active');
        formAdmin.classList.add('active');
        formTamu.classList.remove('active');
    }
    
    if (pesanError) pesanError.style.display = 'none'; 
}

// =================================================================
// 2. LOGIKA VERIFIKASI & AUTO-ROUTING LOGIN
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    const formLoginAdmin = document.getElementById('form-login-admin'); 

    if (formLoginAdmin) {
        formLoginAdmin.addEventListener('submit', async function(e) {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const btnSubmit = formLoginAdmin.querySelector('.btn-admin');
            const pesanError = document.getElementById('pesan-error');

            const teksAsli = btnSubmit.textContent;
            btnSubmit.textContent = 'MEMVERIFIKASI...';
            btnSubmit.disabled = true;
            if (pesanError) pesanError.style.display = 'none'; 

            try {
                const response = await fetch('http://127.0.0.1:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });
                
                const data = await response.json();

                if (data.status === 'success') {
                    // ==============================================
                    // LANGSUNG SIMPAN SESI TANPA POP-UP
                    // ==============================================
                    sessionStorage.setItem('staf_logged_in', 'true');
                    sessionStorage.setItem('staf_username', data.nama); 
                    sessionStorage.setItem('id_staf', data.id_staf); 
                    sessionStorage.setItem('id_posisi', data.id_posisi);

                    // ==============================================
                    // SISTEM AUTO-ROUTING BERDASARKAN ID_POSISI
                    // ==============================================
                    const idPosisi = parseInt(data.id_posisi);
                    
                    // ID 1 (Manager), 2 (Back Office), 3 (Front Office), 8 (Sales)
                    const grupDashboardAdmin = [1, 2, 3, 8]; 
                    
                    if (grupDashboardAdmin.includes(idPosisi)) {
                        // Lempar ke Dashboard Utama (Instan)
                        window.location.href = 'admin.html';
                    } else {
                        // Sisa divisi lapangan (Housekeeping, F&B, Wellness, Engineering)
                        // Lempar ke Portal Staf (Instan)
                        window.location.href = 'staf.html';
                    }
                } else {
                    // Pop-up error TETAP ADA agar pengguna tahu jika username/password salah
                    Swal.fire('Akses Ditolak!', data.message, 'error');
                    if (pesanError) {
                        pesanError.textContent = data.message;
                        pesanError.style.display = 'block';
                    }
                    btnSubmit.textContent = teksAsli; btnSubmit.disabled = false;
                }
            } catch (err) {
                Swal.fire('Error!', 'Gagal terhubung ke server database.', 'error');
                btnSubmit.textContent = teksAsli; btnSubmit.disabled = false;
            }
        });
    }
});