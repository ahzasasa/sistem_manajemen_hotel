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
    renderPetaKamarSimulasi();
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
                let badgeStatus = '';
                if (r.status_pembayaran === 'Lunas') {
                    badgeStatus = '<span class="badge badge-lunas">PAID / LUNAS</span>';
                } else if (r.status_pembayaran === 'DP Dibayar') {
                    badgeStatus = '<span class="badge badge-dp">PARTIAL / DP 50%</span>';
                } else {
                    badgeStatus = '<span class="badge badge-belum">UNPAID / PENDING</span>';
                }

                tbody.innerHTML += `
                    <tr data-status-bayar="${r.status_pembayaran}">
                        <td><strong>${r.id_reservasi}</strong></td>
                        <td>${r.nama_lengkap}</td>
                        <td><span class="badge bg-secondary">${r.nomor_kamar}</span></td>
                        <td>${r.tanggal_masuk} - ${r.tanggal_keluar}</td>
                        <td>${badgeStatus}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-success btn-action me-1"><i class="fa-solid fa-key"></i> Check-In</button>
                        </td>
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

function renderPetaKamarSimulasi() {
    const grid = document.getElementById('container-room-grid');
    grid.innerHTML = '';

    const sampleRooms = [
        { no: '0301', status: 'rm-clean' }, { no: '0302', status: 'rm-clean' },
        { no: '0303', status: 'rm-occupied' }, { no: '0325', status: 'rm-repair' },
        { no: '0401', status: 'rm-clean' }, { no: '0402', status: 'rm-occupied' },
        { no: '0511', status: 'rm-clean' }, { no: '0901', status: 'rm-clean' },
        { no: '1401', status: 'rm-dirty' }, { no: '1402', status: 'rm-clean' },
        { no: '1501', status: 'rm-occupied' }, { no: '1511', status: 'rm-dirty' },
        { no: '1701', status: 'rm-clean' }, { no: '2201', status: 'rm-clean' },
        { no: '2501', status: 'rm-occupied' }, { no: '2502', status: 'rm-clean' }
    ];

    sampleRooms.forEach(rm => {
        let box = document.createElement('div');
        box.className = `room-box ${rm.status}`;
        box.innerHTML = `<i class="fa-solid fa-door-closed mb-1"></i> ${rm.no}`;
        
        if (rm.status === 'rm-dirty') {
            box.onclick = function() {
                document.getElementById('hk-no-kamar').value = rm.no;
                document.getElementById('hk-id-kamar').value = rm.no;
                document.getElementById('hk-pilih-staf').focus();
            };
        } else {
            box.onclick = function() {
                alert(`Kamar ${rm.no} tidak memerlukan tindakan housekeeping.`);
            };
        }
        grid.appendChild(box);
    });
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