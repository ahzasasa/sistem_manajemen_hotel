document.addEventListener('DOMContentLoaded', function() {
    muatDetailKamar();
});

async function muatDetailKamar() {
    // 1. ambil id kamar dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const idKamar = urlParams.get('id');

    if (!idKamar) return; 

    try {
        // 2. minta data ke Backend Python
        const response = await fetch(`http://127.0.0.1:5000/api/tipe-kamar/${idKamar}`);
        const result = await response.json();

        if (result.status === 'success') {
            const kamar = result.data;

            // 3. tembak data ke HTML
            document.getElementById('detail-nama').innerText = kamar.nama_tipe;
            
            // format harga jadi rupiah
            const hargaRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kamar.harga_per_malam);
            document.getElementById('detail-harga').innerText = hargaRp + ' / Malam';

            // masukkan deskripsi
            const elemenDeskripsi = document.getElementById('detail-deskripsi');
            if (elemenDeskripsi && kamar.deskripsi) {
                elemenDeskripsi.innerText = kamar.deskripsi;
            }

            // 4. pecah daftar fasilitas dan cetak jadi kotak-kotak grid
            const wadahFasilitas = document.getElementById('detail-fasilitas');
            if (wadahFasilitas && kamar.fasilitas) {
                wadahFasilitas.innerHTML = '';
                
                // tambahkan kapasitas bawaan
                wadahFasilitas.innerHTML += `<div class="amenity-item">🛏️ ${kamar.kapasitas} Guest Maximum</div>`;

                // pecah teks berdasarkan koma, lalu buatkan HTML-nya satu per satu
                const listFasilitas = kamar.fasilitas.split(',');
                listFasilitas.forEach(item => {
                    wadahFasilitas.innerHTML += `<div class="amenity-item">✔️ ${item.trim()}</div>`;
                });
            }
        }
    } catch (error) {
        console.error("Gagal memuat data kamar:", error);
    }
}