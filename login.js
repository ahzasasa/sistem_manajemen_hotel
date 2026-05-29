
// TOGGLE UI (Tamu vs Admin/Staf)

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


// VERIFIKASI & AUTO-ROUTING LOGIN (login.js)

document.addEventListener('DOMContentLoaded', function() {
    const formLoginAdmin = document.getElementById('form-login-admin'); 

    if (formLoginAdmin) {
        formLoginAdmin.addEventListener('submit', async function(e) {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const btnSubmit = formLoginAdmin.querySelector('.btn-admin');
            const pesanError = document.getElementById('pesan-error');


            // 1. hanya untuk admin
            if (usernameInput === 'admin' && passwordInput === 'admin123') {
                sessionStorage.clear();
                sessionStorage.setItem('isAdminMaster', 'true');
                sessionStorage.setItem('staf_username', 'Administrator');
            
                window.location.href = 'admin.html';
                return;
            }

            // 2. untuk semua staf
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
                    sessionStorage.setItem('staf_logged_in', 'true');
                    sessionStorage.setItem('staf_username', data.nama); 
                    sessionStorage.setItem('id_staf', data.id_staf); 
                    sessionStorage.setItem('id_posisi', data.id_posisi);

                    window.location.href = 'staf.html';
                    
                } else {
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