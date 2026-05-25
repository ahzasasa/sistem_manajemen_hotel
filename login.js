// Fungsi untuk mengganti tampilan form berdasarkan peran
function pilihPeran(peran) {
    document.getElementById('btn-tab-tamu').classList.remove('active');
    document.getElementById('btn-tab-admin').classList.remove('active');
    document.getElementById('form-tamu').classList.remove('active');
    document.getElementById('form-admin').classList.remove('active');

    if (peran === 'tamu') {
        document.getElementById('btn-tab-tamu').classList.add('active');
        document.getElementById('form-tamu').classList.add('active');
    } else {
        document.getElementById('btn-tab-admin').classList.add('active');
        document.getElementById('form-admin').classList.add('active');
    }
}

// Logika Verifikasi Form Admin (Terhubung ke Database)
document.addEventListener('DOMContentLoaded', function() {
    const formAdmin = document.getElementById('form-login-admin');
    
    if (formAdmin) {
        formAdmin.addEventListener('submit', function(e) {
            e.preventDefault(); 

            const userVal = document.getElementById('username').value;
            const passVal = document.getElementById('password').value;
            const errorMsg = document.getElementById('pesan-error');
            const btnSubmit = formAdmin.querySelector('button[type="submit"]');

            // Ubah tombol saat loading
            btnSubmit.textContent = "MEMVERIFIKASI...";
            btnSubmit.disabled = true;

            // Kirim data ke Python Backend
            fetch('http://127.0.0.1:5000/api/login-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: userVal,
                    password: passVal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    errorMsg.style.display = 'none';
                    // Opsional: Simpan nama admin di penyimpanan lokal browser
                    sessionStorage.setItem('adminName', data.nama);
                    // Pindah ke halaman dashboard
                    window.location.href = 'admin.html';
                } else {
                    // Tolak akses
                    errorMsg.textContent = "Akses Ditolak: " + data.message;
                    errorMsg.style.display = 'block';
                    btnSubmit.textContent = "MASUK KE DASHBOARD";
                    btnSubmit.disabled = false;
                }
            })
            .catch(err => {
                errorMsg.textContent = "Kesalahan server. Pastikan Backend aktif.";
                errorMsg.style.display = 'block';
                btnSubmit.textContent = "MASUK KE DASHBOARD";
                btnSubmit.disabled = false;
            });
        });
    }
});