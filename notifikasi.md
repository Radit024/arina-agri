# Context Fitur Notifikasi

Dokumen ini menjelaskan alur fitur notifikasi, komponen yang terlibat, dan langkah implementasi yang perlu dicek **sebelum build**.

## 1. Tujuan
- Mengirim notifikasi cuaca ke petani secara konsisten.
- Menggunakan keputusan berbasis rule engine + AI (Gemini) untuk merapikan pesan.
- Mendukung multi-platform (WhatsApp / Telegram).

## 2. Alur Fitur (Ringkas)
1. **Frontend (Next.js)**
	 - User memilih platform (WhatsApp/Telegram), menyimpan kontak, dan menekan tombol uji coba.
	 - Request dikirim ke backend: `POST /api/notification/decide-send`.

2. **Backend (Express TypeScript)**
	 - Validasi payload notifikasi.
	 - Rule engine menghitung `riskScore` dan `riskLevel`.
	 - Gemini memoles pesan (fallback ke draft jika gagal).
	 - Jika lolos aturan kirim, backend mengirim langsung ke API WhatsApp/Telegram.

3. **Channel Provider (API)**
	 - WhatsApp Cloud API atau Telegram Bot API menerima request dari backend.

4. **End User**
	 - Petani menerima pesan yang jelas dan actionable.

## 3. Endpoint Backend
- `POST /api/notification/send`
	- Kirim payload mentah langsung ke channel (tanpa decision).
- `POST /api/notification/decide`
	- Hanya menghitung keputusan (preview).
- `POST /api/notification/decide-send`
	- Hitung keputusan dan kirim ke channel jika lolos aturan.
- `GET /api/notification/schedule`
	- Ambil jadwal notifikasi harian.
- `POST /api/notification/schedule`
	- Simpan jadwal notifikasi harian (jam, platform, tujuan).

## 4. Payload yang Dikirim dari Frontend
```json
{
	"platform": "whatsapp",
	"to": "08123456789",
	"recipientName": "Budi Santoso",
	"notificationsEnabled": true,
	"weather": {
		"kondisi": "hujan",
		"suhu": 29,
		"kelembapan": 82,
		"curahHujan": 26,
		"kecepatanAngin": 14,
		"lokasi": "Malang"
	},
	"metadata": {
		"source": "weather-dashboard-test-button",
		"locale": "id"
	}
}
```

## 5. Rule Engine (Backend)
Rule default:
- `HEAVY_RAIN` (>= 20 mm) bobot 40
- `RAINY_CONDITION` (hujan/gerimis + >= 10 mm) bobot 20
- `STRONG_WIND` (>= 12 km/j) bobot 25
- `EXTREME_HEAT` (>= 32 C) bobot 20
- `LOW_HUMIDITY` (< 50%) bobot 15

Skala risiko:
- rendah: < 30
- sedang: 30-54
- tinggi: 55-79
- ekstrem: >= 80

Aturan kirim:
- `notificationsEnabled = true` dan
- `riskScore >= 30` **atau** `customMessage` **atau** mode test (`metadata.source = weather-dashboard-test-button`).

## 6. AI Layer (Gemini)
Peran Gemini:
- Memperjelas draft pesan, tanpa mengubah hasil rule engine.
- Jika API gagal, fallback ke draft message.

## 7. Payload ke Channel API
```json
{
	"platform": "whatsapp",
	"to": "628123456789",
	"message": "Arina Agri - Alert Cuaca TINGGI...",
	"metadata": {
		"source": "weather-dashboard-test-button",
		"decision": {
			"decisionId": "dec-...",
			"riskScore": 65,
			"riskLevel": "tinggi",
			"shouldSend": true
		},
		"weather": {
			"kondisi": "hujan",
			"suhu": 29,
			"kelembapan": 82,
			"curahHujan": 26,
			"kecepatanAngin": 14,
			"lokasi": "Malang"
		}
	}
}
```

## 8. Konfigurasi Environment (Backend)
Tambahkan di `.env` backend atau root `.env.local`:
```env
WHATSAPP_CLOUD_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_CLOUD_API_VERSION=v19.0

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_API_URL=https://api.telegram.org/bot<token>

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash

ALERT_HEAVY_RAIN_MM=20
ALERT_STRONG_WIND_KMH=12
ALERT_EXTREME_TEMP_C=32
ALERT_LOW_HUMIDITY_PERCENT=50
```

## 9. Checklist Sebelum Build
1. **Env tersedia dan backend direstart** (agar token channel terbaca).
2. **Credential channel sudah benar**:
	 - WhatsApp Cloud: `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
	 - Telegram: `TELEGRAM_BOT_TOKEN`.
3. **Payload cuaca terisi lengkap** dan angka valid.
4. **Gemini API key** tersedia jika ingin pesan dipoles AI.
5. **Jadwal harian** sudah di-set melalui endpoint schedule atau halaman Pengaturan.

## 10. Catatan Implementasi
- Normalisasi kontak:
	- WhatsApp: otomatis ke format internasional (62).
	- Telegram: bisa pakai @username untuk grup/channel publik. Untuk chat pribadi, user harus START bot dulu agar username bisa di-resolve otomatis.
- Mode uji coba (dashboard) dipaksa terkirim agar memudahkan pengujian.
