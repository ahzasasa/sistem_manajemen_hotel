// Fungsi untuk mengganti tampilan form berdasarkan peran
function pilihPeran(peran) {
    // Matikan semua tab yang aktif
    document.getElementById('btn-tab-tamu').classList.remove('active');
    document.getElementById('btn-tab-admin').classList.remove('active');
    document.getElementById('form-tamu').classList.remove('active');
    document.getElementById('form-admin').classList.remove('active');

    // Nyalakan tab yang dipilih
    if (peran === 'tamu') {
        document.getElementById('btn-tab-tamu').classList.add('active');
        document.getElementById('form-tamu').classList.add('active');
    } else {
        document.getElementById('btn-tab-admin').classList.add('active');
        document.getElementById('form-admin').classList.add('active');
    }
}

// Logika Verifikasi Form Admin
document.addEventListener('DOMContentLoaded', function() {
    const formAdmin = document.getElementById('form-login-admin');
    
    if (formAdmin) {
        formAdmin.addEventListener('submit', function(e) {
            e.preventDefault(); 

            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            const errorMsg = document.getElementById('pesan-error');

            const KREDENSIAL_BENAR = {
                username: "admin",
                password: "adminhotel"
            };

            if (user === KREDENSIAL_BENAR.username && pass === KREDENSIAL_BENAR.password) {
                // Berhasil login admin, masuk ke Dashboard
                errorMsg.style.display = 'none';
                window.location.href = 'admin.html';
            } else {
                // Gagal login
                errorMsg.style.display = 'block';
            }
        });
    }
});