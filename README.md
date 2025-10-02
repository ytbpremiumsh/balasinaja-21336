# OneSender Autoreply Dashboard

Dashboard web untuk mengelola sistem autoreply WhatsApp menggunakan layanan OneSender dengan dukungan AI fallback.

## 🚀 Fitur

- **Webhook Handler**: Menerima dan memproses pesan masuk dari OneSender
- **Trigger-based Autoreply**: Sistem balasan otomatis berdasarkan kata kunci
- **AI Fallback**: Balasan cerdas menggunakan AI ketika tidak ada trigger yang cocok
  - Support: Google Gemini, OpenAI, DeepSeek, OpenRouter
- **Knowledge Base**: Manajemen database pengetahuan untuk AI
- **Contact Management**: Penyimpanan otomatis kontak yang mengirim pesan
- **Inbox Monitoring**: Log lengkap pesan masuk dan balasan
- **Dashboard Admin**: Interface web untuk mengelola semua fitur

## 📋 Prerequisites

- Node.js versi 14 atau lebih baru
- npm (Node Package Manager)
- Akun OneSender dengan API Key
- API Key dari provider AI (opsional, untuk AI fallback)

## ⚙️ Instalasi

1. **Clone atau download project ini**

2. **Install dependencies**
```bash
npm install
```

3. **Konfigurasi Environment Variables**

Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan konfigurasi Anda:

```env
# Server Configuration
PORT=3000

# OneSender API Configuration
ONESENDER_API_URL=https://api.onesender.id/api/v1/message/send
ONESENDER_API_KEY=your_onesender_api_key_here

# Message Priority (1-10)
MESSAGE_PRIORITY=10

# AI Configuration
AI_VENDOR=gemini
AI_API_KEY=your_ai_api_key_here
AI_MODEL=gemini-pro
```

**Pilihan AI Vendor:**
- `gemini` - Google Gemini (Model: gemini-pro, gemini-1.5-pro)
- `openai` - OpenAI (Model: gpt-4, gpt-3.5-turbo)
- `deepseek` - DeepSeek (Model: deepseek-chat)
- `openrouter` - OpenRouter (Model: openrouter/auto)

4. **Jalankan Server**

Development mode dengan auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## 🔌 Setup Webhook OneSender

1. Buka dashboard OneSender Anda
2. Navigate ke pengaturan Webhook
3. Masukkan URL webhook: `http://your-domain.com/api/webhook`

**Untuk Development Lokal:**
- Gunakan tools seperti [ngrok](https://ngrok.com/) untuk expose local server:
  ```bash
  ngrok http 3000
  ```
- Copy URL yang diberikan ngrok (contoh: `https://abc123.ngrok.io`)
- Gunakan sebagai webhook: `https://abc123.ngrok.io/api/webhook`

## 📱 Cara Menggunakan Dashboard

### 1. Inbox
- Lihat semua pesan masuk
- Monitor status balasan (Trigger, AI, No Reply)

### 2. Autoreplies
- Tambah trigger baru dengan kata kunci
- Setiap trigger bisa mengirim text, image, atau document
- Gunakan placeholder `{NAME}` dan `{PHONE}` dalam balasan
- Hapus trigger yang tidak diperlukan

### 3. AI Knowledge Base
- Tambah pasangan pertanyaan-jawaban
- Data ini digunakan AI sebagai konteks untuk memberikan jawaban akurat
- Semakin banyak data, semakin baik performa AI

### 4. Contacts
- Lihat daftar semua kontak yang pernah mengirim pesan
- Kontak otomatis tersimpan saat pesan pertama diterima

### 5. Settings
- Lihat konfigurasi aktif
- Informasi endpoint webhook

## 🧪 Testing Webhook

Test webhook menggunakan curl:

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "test123",
    "from_id": "6281234567890@s.whatsapp.net",
    "from_name": "Test User",
    "message_type": "text",
    "message_text": "info",
    "is_group": false,
    "is_from_me": false,
    "message_timestamp": "2025-01-01T10:00:00Z"
  }'
```

## 📊 Database

Aplikasi menggunakan SQLite database (`onesender.db`) yang dibuat otomatis saat pertama kali dijalankan.

**Tabel:**
- `settings` - Pengaturan aplikasi
- `autoreplies` - Trigger autoreply
- `ai_knowledge_base` - Data pengetahuan AI
- `contacts` - Daftar kontak
- `inbox` - Log pesan masuk dan balasan

## 🔒 Keamanan

- Jangan commit file `.env` ke repository
- Gunakan HTTPS untuk webhook di production
- Simpan API keys dengan aman

## 📝 Troubleshooting

**Server tidak bisa start:**
- Pastikan port 3000 tidak digunakan aplikasi lain
- Cek file `.env` sudah dibuat dan diisi dengan benar

**Webhook tidak menerima pesan:**
- Pastikan URL webhook sudah terdaftar di OneSender
- Untuk local development, pastikan ngrok masih running
- Cek console log untuk error

**AI tidak memberikan balasan:**
- Pastikan AI_VENDOR, AI_API_KEY, dan AI_MODEL sudah diisi di `.env`
- Cek console log untuk error dari AI provider
- Pastikan API key masih valid dan memiliki quota

## 🤝 Support

Untuk bantuan lebih lanjut, hubungi support OneSender atau developer aplikasi ini.

## 📄 License

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan.
