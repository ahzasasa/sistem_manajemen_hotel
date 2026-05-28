document.addEventListener('DOMContentLoaded', function() {
    muatDetailKamar();
});

async function muatDetailKamar() {
    // 1. Ambil ID kamar dari URL (misal: ?id=1)
    const urlParams = new URLSearchParams(window.location.search);
    const idKamar = urlParams.get('id');

    if (!idKamar) return; 

    try {
        // 2. Minta data ke Backend Python
        const response = await fetch(`http://127.0.0.1:5000/api/tipe-kamar/${idKamar}`);
        const result = await response.json();

        if (result.status === 'success') {
            const kamar = result.data;

            // 3. Tembak data ke HTML
            document.getElementById('detail-nama').innerText = kamar.nama_tipe;
            
            // Format Harga jadi Rupiah
            const hargaRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kamar.harga_per_malam);
            document.getElementById('detail-harga').innerText = hargaRp + ' / Malam';

            // Masukkan Deskripsi
            const elemenDeskripsi = document.getElementById('detail-deskripsi');
            if (elemenDeskripsi && kamar.deskripsi) {
                elemenDeskripsi.innerText = kamar.deskripsi;
            }

            // 4. Pecah daftar Fasilitas dan cetak jadi Kotak-Kotak Grid
            const wadahFasilitas = document.getElementById('detail-fasilitas');
            if (wadahFasilitas && kamar.fasilitas) {
                wadahFasilitas.innerHTML = ''; // Kosongkan dulu
                
                // Tambahkan kapasitas bawaan
                wadahFasilitas.innerHTML += `<div class="amenity-item">🛏️ ${kamar.kapasitas} Guest Maximum</div>`;

                // Pecah teks berdasarkan koma, lalu buatkan HTML-nya satu per satu
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