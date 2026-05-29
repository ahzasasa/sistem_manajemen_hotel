document.addEventListener('DOMContentLoaded', function() {
    // ambil parameter id reservasi dan email dari URL browser
    const urlParams = new URLSearchParams(window.location.search);
    const idReservasi = urlParams.get('id');
    const email = urlParams.get('email');

    const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

    if (!idReservasi || !email) {
        alert("Data tidak valid. Pastikan Anda mengakses dari tautan yang benar.");
        return;
    }

    // tarik data asli dari database lewat API Python Flask
    fetch(`http://127.0.0.1:5000/api/cek-pesanan?id=${idReservasi}&email=${email}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const p = data.data;
                
                // suntik data ke elemen-elemen HTML pembungkus
                document.getElementById('v-id').textContent = p.id_reservasi;
                document.getElementById('v-nama').textContent = p.nama_lengkap;
                document.getElementById('v-telepon').textContent = p.nomor_telepon;
                document.getElementById('v-tipe').textContent = p.nama_tipe;
                document.getElementById('v-checkin').textContent = p.tanggal_masuk;
                document.getElementById('v-checkout').textContent = p.tanggal_keluar;
                document.getElementById('v-nokamar').textContent = p.nomor_kamar;
                document.getElementById('v-metode').textContent = p.metode_pembayaran;
                document.getElementById('v-total').textContent = formatRupiah(p.harga_terkunci);
                document.getElementById('v-transaksi').innerText = p.referensi_transaksi || 'Belum Ada Transaksi';

                // definisikan komponen kontrol tombol aksi
                const statusBadge = document.getElementById('v-status');
                const btnBayar = document.getElementById('btn-bayar-sekarang');
                const btnBatal = document.getElementById('btn-batal-pesanan');
                const opsiBayar = document.getElementById('opsi-bayar-container');
                const selectBayar = document.getElementById('pilihan-bayar');

                // 1. validasi status pembatalan pesanan
                if (p.status_pesanan === 'Batal') {
                    statusBadge.textContent = 'CANCELED / BATAL';
                    statusBadge.style.borderColor = '#d9534f';
                    statusBadge.style.color = '#d9534f';
                    btnBatal.style.display = 'none';
                    btnBayar.style.display = 'none';
                    opsiBayar.style.display = 'none';
                } else {
                    // tombol pembatalan otomatis muncul selama tamu belum melakukan Check-In
                    if (p.status_pesanan !== 'Check-In' && p.status_pesanan !== 'Selesai') {
                        btnBatal.style.display = 'block';
                    } else {
                        btnBatal.style.display = 'none';
                    }

                    // 2. validasi lapisan status transaksi pembayaran invoice
                    if (p.status_pembayaran === 'Lunas') {
                        statusBadge.textContent = 'PAID / LUNAS';
                        statusBadge.style.borderColor = '#154230';
                        statusBadge.style.color = '#154230';
                        btnBayar.style.display = 'none';
                        opsiBayar.style.display = 'none';
                    } 
                    else if (p.status_pembayaran === 'DP Dibayar') {
                        statusBadge.textContent = 'PARTIAL / DP 50%';
                        statusBadge.style.borderColor = '#A6824A';
                        statusBadge.style.color = '#A6824A';
                        
                        // tamu sudah dp, batasi opsi bayar hanya untuk pelunasan sisa tagihan
                        opsiBayar.style.display = 'block';
                        selectBayar.innerHTML = '<option value="Lunas">Lunasi Sisa Tagihan (50%)</option>';
                        btnBayar.style.display = 'block';
                    } 
                    else {
                        statusBadge.textContent = 'UNPAID / PENDING';
                        statusBadge.style.borderColor = '#5D1E21';
                        statusBadge.style.color = '#5D1E21';
                        
                        // belum bayar sama sekali, bebaskan memilih dp atau Lunas
                        opsiBayar.style.display = 'block';
                        btnBayar.style.display = 'block';
                    }
                }

                // dandler eksekusi pembayaran rekening invoice
                btnBayar.onclick = function() {
                    const nominalPilihan = selectBayar.value;

                    Swal.fire({
                        title: 'Konfirmasi Pembayaran',
                        text: `Anda yakin ingin memproses pembayaran dengan status: ${nominalPilihan}?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#198754',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Ya, Proses!',
                        cancelButtonText: 'Batal',
                        backdrop: `rgba(0,0,0,0.4)`
                    }).then((result) => {
                        if (result.isConfirmed) {
                            btnBayar.textContent = "MEMPROSES TRANSAKSI...";
                            btnBayar.disabled = true;

                            fetch('http://127.0.0.1:5000/api/proses-bayar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id_reservasi: p.id_reservasi,
                                    status_pembayaran: nominalPilihan
                                })
                            })
                            .then(res => res.json())
                            .then(dataBayar => {
                                if(dataBayar.status === 'success') {
                                    Swal.fire({
                                        title: 'Berhasil!',
                                        text: 'Pembayaran Diverifikasi! Status invoice diperbarui.',
                                        icon: 'success',
                                        confirmButtonColor: '#198754'
                                    }).then(() => {
                                        window.location.reload();
                                    });
                                } else {
                                    Swal.fire('Gagal!', "Pesan: " + dataBayar.message, 'error');
                                    btnBayar.textContent = "💳 PROSES PEMBAYARAN";
                                    btnBayar.disabled = false;
                                }
                            })
                            .catch(err => {
                                Swal.fire('Error!', "Koneksi gagal ke server.", 'error');
                                btnBayar.textContent = "💳 PROSES PEMBAYARAN";
                                btnBayar.disabled = false;
                            });
                        }
                    });
                };

                // handler eksekusi pembatalan alokasi kamar
                btnBatal.onclick = function() {
                    Swal.fire({
                        title: 'Batalkan Pesanan?',
                        text: "PERINGATAN: Apakah Anda yakin ingin membatalkan pesanan ini? Kamar akan dikembalikan ke pool ketersediaan.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Ya, Batalkan!',
                        cancelButtonText: 'Tidak, Kembali',
                        backdrop: `rgba(0,0,0,0.6)`
                    }).then((result) => {
                        if (result.isConfirmed) {
                            btnBatal.textContent = "MEMBATALKAN...";
                            btnBatal.disabled = true;

                            fetch('http://127.0.0.1:5000/api/batal-pesanan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id_reservasi: p.id_reservasi })
                            })
                            .then(res => res.json())
                            .then(dataBatal => {
                                if(dataBatal.status === 'success') {
                                    Swal.fire({
                                        title: 'Dibatalkan!',
                                        text: 'Pesanan berhasil dibatalkan. Kamar telah dikembalikan.',
                                        icon: 'success',
                                        confirmButtonColor: '#198754'
                                    }).then(() => {
                                        window.location.reload();
                                    });
                                } else {
                                    Swal.fire('Gagal!', "Pesan: " + dataBatal.message, 'error');
                                    btnBatal.textContent = "❌ BATALKAN PESANAN";
                                    btnBatal.disabled = false;
                                }
                            })
                            .catch(err => {
                                Swal.fire('Error!', "Koneksi gagal ke server.", 'error');
                                btnBatal.textContent = "❌ BATALKAN PESANAN";
                                btnBatal.disabled = false;
                            });
                        }
                    });
                };

                document.getElementById('voucher-content').style.display = 'block';
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Gagal mengambil data operasional. Periksa terminal peladen Flask.');
        });
});