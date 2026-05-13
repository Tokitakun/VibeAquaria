# 🐠 VibeAquaria - Smart Aquascape Management System

VibeAquaria adalah platform manajemen akuarium pintar yang menggabungkan estetika visual dengan teknologi **Google Gemini AI**. Proyek ini dikembangkan sebagai entri untuk kompetisi **JuaraVibeCoding**.

---

## 🚀 Fitur Utama

### 1. 🔍 Snap & Care (AI Detection)
Fitur berbasis AI untuk mengidentifikasi spesies ikan dan memberikan panduan perawatan (suhu & pH) secara otomatis melalui analisis gambar.

### 2. 💬 Konsultasi AI
Asisten virtual yang membantu pengguna memberikan solusi terkait ekosistem aquascape secara real-time.

---

## ⚠️ Informasi Penting (API Key & Deployment)

Aplikasi ini dirancang untuk beroperasi menggunakan **Gemini API Key**. Namun, perlu diperhatikan bahwa:

*   **Tanpa API Key di Repositori:** Demi keamanan data pribadi dan kepatuhan terhadap aturan teknis **JuaraVibeCoding**, repositori ini **TIDAK** menyertakan API Key secara spesifik. 
*   **Versi Cloud Run:** Versi yang di-deploy ke Cloud Run telah dikonfigurasi tanpa kredensial API backend untuk menghindari kendala autentikasi platform saat proses penilaian.
*   **Fungsionalitas AI:** Untuk melihat bagaimana AI bekerja secara utuh dalam sistem VibeAquaria, silakan merujuk pada **Video Demo** yang telah disediakan sebagai bagian dari submisi lomba.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router)
*   **AI Engine:** Google Gemini AI (Required API Key for full functionality)
*   **Styling:** Tailwind CSS (Ocean Neon Theme)
*   **Deployment:** Google Cloud Run

---

## 📂 Cara Menjalankan Lokal

Jika Anda ingin mencoba fitur AI secara mandiri, Anda harus menggunakan API Key milik Anda sendiri:

1. Buat file `.env.local` di root folder.
2. Tambahkan baris: `NEXT_PUBLIC_GEMINI_API_KEY=YOUR_OWN_API_KEY`.
3. Jalankan `npm install` dan `npm run dev`.

---

**Dikembangkan oleh Nafis untuk JuaraVibeCoding 2026.**
