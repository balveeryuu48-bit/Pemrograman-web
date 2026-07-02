# DOKUMENTASI TEKNIS: BAHASA PEMROGRAMAN & TEKNOLOGI
## Sistem Informasi Peminjaman Sarana & Prasarana UPT (SiPinjam UPT)

Selamat datang di Dokumentasi Teknis SiPinjam UPT. Dokumen ini dirancang khusus untuk menjelaskan seluruh ekosistem bahasa pemrograman, format file, arsitektur full-stack, serta teknologi pendukung yang digunakan untuk membangun aplikasi web ini secara lengkap, ramah dibaca, dan mendalam.

---

## 1. Ikhtisar Arsitektur Teknologi (Full-Stack)
Aplikasi **SiPinjam UPT** mengadopsi arsitektur **Full-Stack (Client-Server)** terintegrasi:

1. **Server-Side (Back-End):** 
   - Digerakkan oleh **Node.js** dengan framework **Express**.
   - Menggunakan bahasa **TypeScript (.ts)** untuk penulisan logika yang tangguh, aman, dan minim bug.
   - Menggunakan sistem penyimpanan data persisten lokal terstruktur (`db_state.json`) untuk kemudahan distribusi instan.
2. **Client-Side (Front-End):**
   - Dirancang menggunakan struktur **HTML5** semantik yang berkinerja tinggi.
   - Menggunakan **Tailwind CSS** untuk perancangan visual modern, responsif (mobile-friendly), dan elegan.
   - Memakai **JavaScript ES6+** murni untuk interaktivitas dinamis, asinkronisasi panggilan API (menggunakan `Fetch API`), dan manajemen sesi di sisi browser (`LocalStorage`).

---

## 2. Perbedaan Format File `.ts` dan `.tsx`

Di dalam pengembangan aplikasi modern (terutama ekosistem TypeScript & React), sering dijumpai berkas dengan ekstensi `.ts` dan `.tsx`. Berikut adalah penjelasannya:

| Karakteristik | File `.ts` (TypeScript Standard) | File `.tsx` (TypeScript XML / React) |
|---|---|---|
| **Definisi** | Berkas kode TypeScript murni tanpa elemen UI visual di dalamnya. | Berkas kode TypeScript yang mendukung penulisan sintaksis JSX (XML/HTML). |
| **Kegunaan Utama** | Menulis logika komputasi, routing backend, interaksi database, helper, dan tipe data statis. | Membangun komponen antarmuka pengguna (UI) reaktif yang menggabungkan logika dan HTML dalam satu tempat. |
| **Contoh di Proyek** | `server.ts` (Express server), `js/helpers.js` (ekuivalen logika klien). | `/src/App.tsx`, `/src/main.tsx` (Komponen visual React utama). |
| **Penulisan Kode** | Hanya berisi fungsi JS/TS: `function tambah(a: number, b: number) { return a + b; }` | Berisi elemen UI: `const Button = () => <button className="btn">Klik Saya</button>;` |

---

## 3. Penjelasan Detail per Bahasa Pemrograman

### A. TypeScript (.ts & .tsx)
**TypeScript** adalah bahasa pemrograman berbasis tipe data statis (*static typing*) yang merupakan superset dari **JavaScript**. Artinya, semua kode JavaScript yang valid adalah kode TypeScript yang valid pula. TypeScript dikompilasi menjadi JavaScript standar sebelum dijalankan di browser atau server.

- **Mengapa digunakan di SiPinjam UPT?**
  - **Type Safety (Keamanan Tipe):** Menghindari error tipe data (seperti mencoba membaca properti dari variabel yang `undefined` atau salah mengirimkan tipe parameter ke fungsi).
  - **Auto-Completion & Intellisense:** Sangat mempermudah pengembang dengan petunjuk otomatis yang instan sewaktu menulis kode.
  - **Struktur Jelas:** Memiliki fitur *Interface* dan *Type* yang mendefinisikan skema data (contohnya struktur data `User`, `Barang`, dan `Peminjaman`).

### B. JavaScript (ES6+ & Node.js)
**JavaScript** adalah bahasa scripting dinamis yang menjadi standar de facto interaktivitas web dunia.
- **Node.js (Server-Side):** Menjalankan JavaScript di luar browser menggunakan mesin V8 Google. Di sini, Node.js menggerakkan berkas server utama untuk menangani semua request API.
- **Fitur Modern (ES6+):**
  - **Async / Await & Promises:** Menangani operasi non-blocking seperti membaca file, menulis file database, atau mengirim email notifikasi secara asinkron tanpa memperlambat antrean request lainnya.
  - **Destructuring & Arrow Functions:** Menulis kode yang lebih bersih, ringkas, dan modern.
  - **Fetch API:** Digunakan di sisi browser untuk mengambil data secara dinamis ke server tanpa memuat ulang (*refresh*) seluruh halaman web.

### C. HTML5 (HyperText Markup Language)
**HTML5** menyediakan kerangka kerja semantik untuk halaman web kita.
- **Struktur Semantik:** Penggunaan tag bernilai logis seperti `<header>`, `<nav>`, `<section>`, `<main>`, dan `<footer>` membantu pengindeksan mesin pencari (SEO) dan alat pembaca layar bagi disabilitas (*accessibility*).
- **Integrasi CDN:** Menghubungkan font eksternal dari Google Fonts (*Inter*, *Space Grotesk*) dan ikon profesional dari *Tabler Icons* secara asinkron agar loading halaman berlangsung sangat cepat.

### D. CSS3 & Tailwind CSS
**CSS3** bertugas menghias kerangka HTML. Namun, di proyek ini kita beralih menggunakan pendekatan modern yaitu **Tailwind CSS**.
- **Utility-First Framework:** Tailwind CSS menyediakan ribuan kelas pembantu kecil yang dapat dikombinasikan langsung pada atribut `class` di HTML tanpa perlu menulis file CSS terpisah yang rumit.
- **Responsif Instan:** Menggunakan awalan (*breakpoints*) seperti `md:grid-cols-2` atau `lg:col-span-7` untuk memastikan aplikasi tampil luar biasa di layar HP, tablet, laptop, hingga monitor ultra-lebar.
- **Keindahan Visual:** Memungkinkan pembuatan visual bernilai seni tinggi melalui utilitas bayangan lembut (*shadow-sm*), sudut melengkung sempurna (*rounded-3xl*), warna latar transparan (*bg-neutral-900/60*), dan animasi halus (*transition-all duration-200*).

---

## 4. Aliran Data Aplikasi (Bagaimana Semuanya Bekerja)

1. **Interaksi Pengguna (HTML/Tailwind):** User mengakses halaman utama `landing.html` yang tampak memukau berkat desain tipografi *Space Grotesk* dan layout responsif Tailwind.
2. **Pengolahan Sesi (JavaScript Klien):** Saat menekan tombol masuk, berkas `js/helpers.js` memeriksa status token di `LocalStorage` browser. Jika kosong, user diarahkan ke `login.html`.
3. **Panggilan API Asinkron (Fetch API):** Formulir login diserahkan. JavaScript mengambil data input, mengirimkannya secara asinkron (AJAX) ke endpoint `/api/auth/login.php` di backend.
4. **Validasi & Pemrosesan (TypeScript Server):** Berkas `server.ts` menerima request tersebut, memverifikasi kata sandi secara aman dengan hashing, dan memberikan balasan berformat JSON.
5. **Persistensi Data (db_state.json):** Setiap perubahan status (menambah barang baru, menyetujui pinjaman, dll.) langsung disimpan secara persisten oleh server ke berkas `db_state.json` agar data tidak hilang ketika server direstart.

---

## 5. Cara Mengunduh PDF Dokumentasi ini secara Langsung
Anda dapat mengunduh dokumen teknis versi cetak PDF resmi langsung dari server aplikasi ini dengan mengakses tautan:
🔗 **`/api/dokumentasi/pdf`**

*(Tautan ini akan mengenerate dokumen PDF resmi dengan tata letak visual profesional bermerek lengkap dengan sampul, pembagian halaman, header, footer, dan dekorasi visual yang indah).*
