# جدول القراءات العشر — Tabel Qiraat 'Asyr

Tabel pivot farsy al-huruf qiraat sepuluh (10 qurra, 20 rawi) untuk seluruh al-Qur'an, dari al-Fatihah sampai an-Nas.
Isinya 2270 posisi khilaf. Setiap posisi menyebut bacaan tiap rawi dan rujukan halamannya di kitab.

Cukup buka `index.html` di peramban. Tidak perlu server atau proses build.

## Sumber

- **Kitab rujukan:** *an-Nasyr fi al-Qira'at al-'Asyr* karya Ibn al-Jazari, tahqiq adh-Dhabba'.
  Nomor halaman mengikuti cetakan, misalnya «النشر ٢/٢٥٢».
- **Pembanding:** *al-Budur az-Zahirah* (thariq asy-Syathibiyyah dan ad-Durrah).
  Dipakai untuk cek silang dan untuk mengoreksi beberapa tempat yang nama qari'-nya hilang atau berlebih di cetakan an-Nasyr.
  Setiap koreksi dicatat di kolom rujukan posisi tersebut.
- **Teks mushaf:** [Tanzil Quran Text](https://tanzil.net) (Uthmani 1.1), © Tanzil Project, CC BY 3.0.
  Kata-kata mushaf dipakai apa adanya, tanpa diubah.
- **Desain antarmuka:** terinspirasi dari [Specta Qiraat](https://spectaqiraat.staialanwar.ac.id/) (STAI Al-Anwar), atas izin pengelolanya.

## Cakupan dan batasan

- Yang dimuat adalah **farsy al-huruf**. Masalah ushul tidak dimasukkan:
  - mad, imalah, idgham, dan hamzah
  - ya' idhafah dan zawa'id
  - mim al-jam'
  - istifham berulang
- Jika para rawi berbeda thariq, yang ditampilkan adalah **riwayat al-itsbat**. Tombol «إظهار الخلف» menampilkan kedua wajh.
- **Semua data belum di-tahqiq manusia.** Mohon cocokkan dengan kitab sebelum dipakai untuk mengajar atau ijazah.
  Koreksi sangat diharapkan; silakan buka *issue*.

## Status pemeriksaan

Setiap aturan sudah diperiksa terhadap sumbernya. Hasilnya disimpan di `data/tahqiq.json` dan tampil sebagai badge di tabel:

| Badge | Arti | Aturan | Posisi |
|---|---|---|---|
| مطابق للمصدرين | nama qari'/rawi cocok otomatis dengan kalimat an-Nasyr di halaman rujukan **dan** dengan al-Budur | 664 | 1253 |
| مطابق للنشر | cocok otomatis dengan kalimat an-Nasyr | 121 | 131 |
| مطابق للبدور | cocok otomatis dengan al-Budur (aturannya ditulis dari an-Nasyr) | 306 | 727 |
| مراجَع على النشر | dibaca ulang manual terhadap teks an-Nasyr karena pernyataannya majemuk atau ejaannya berbeda | 126 | 159 |
| محقَّق | sudah di-tahqiq manusia pada kitab (`"ok": true` di aturan) | 0 | 0 |

Pemeriksaan otomatis memakai `tools/verify_nashr.py`; perbandingan dengan al-Budur dilakukan dengan skrip terpisah dan teks al-Budur tidak disertakan.
Untuk menandai sebuah aturan sudah di-tahqiq, tambahkan `"ok": true` pada aturan tersebut di `rules/`.

## Struktur

```
index.html, js/app.js      antarmuka tabel (RTL)
rules/NNN-surah.json       satu aturan per pernyataan an-Nasyr, lengkap dengan rujukan halaman
tools/build_data.py        membangun data/qiraat-data.js dari rules/ dan teks Tanzil
data/qiraat-data.js        data jadi yang dimuat index.html
sources/quran-uthmani.txt  teks Tanzil (jangan diubah)
```

Untuk membangun ulang data setelah mengubah aturan:

```
python3 tools/build_data.py            # tulis data/qiraat-data.js
python3 tools/build_data.py --review   # tampilkan setiap kecocokan aturan umum
```

Teks an-Nasyr yang dipakai saat menyusun aturan (`sources/nashr-farsh.jsonl`) tidak disertakan di repo ini.
Jadi `tools/nashr_section.py` hanya bisa dipakai kalau Anda menyediakan file tersebut sendiri.
