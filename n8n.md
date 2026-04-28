# (Deprecated) Panduan Integrasi Notifikasi Arina Agri dengan n8n + AI Decision System

Dokumen ini sudah tidak digunakan. Sistem notifikasi sekarang berjalan langsung dari backend (tanpa n8n).
Lihat konteks terbaru di [notifikasi.md](notifikasi.md).

## 1. Tujuan
Dokumen ini menyelaraskan integrasi notifikasi dengan arsitektur project saat ini, sekaligus menerapkan AI Decision System hybrid:
- Rule-based logic (deterministik dan terkontrol).
- AI generatif Gemini (untuk memperhalus pesan, bukan mengganti keputusan).

## 2. Arsitektur Aktual

Alur notifikasi saat ini:

1. Website (Next.js)
- User menekan tombol "Kirim Pesan Uji Coba (AI Decision)" di halaman cuaca.
- Frontend mengirim request ke backend endpoint `POST /api/notification/decide-send`.

2. Backend Express (TypeScript)
- Route notifikasi menerima context cuaca + target penerima.
- Rule engine menghitung skor risiko, level risiko, rule yang terpicu, dan rekomendasi aksi.
- Gemini memoles draft pesan agar lebih natural, tetapi tetap mengikuti hasil rule.
- Jika `shouldSend = true`, backend mengirim payload ke webhook n8n.

3. n8n Workflow
- Webhook menerima payload terstruktur (platform, to, message, metadata decision).
- Node Switch/IF memilih channel WhatsApp atau Telegram.
- Node pengiriman channel mengeksekusi pesan.

4. End User
- Petani menerima pesan notifikasi yang konsisten, terkontrol, dan actionable.

## 3. Endpoint yang Tersedia

### 3.1 Endpoint manual (tanpa decision)
- `POST /api/notification/send`
- Fungsi: kirim payload mentah langsung ke n8n.

### 3.2 Endpoint decision only (preview keputusan)
- `POST /api/notification/decide`
- Fungsi: menghasilkan keputusan hybrid tanpa mengirim ke n8n.

### 3.3 Endpoint decision + kirim
- `POST /api/notification/decide-send`
- Fungsi: menghasilkan keputusan hybrid dan otomatis kirim ke n8n jika lolos aturan.

## 4. Konteks Payload untuk AI Decision System

Payload dari website ke backend:

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
    "locale": "id",
    "customMessage": ""
  }
}
```

## 5. Rule-Based Logic (Layer 1)

Rule default (bisa dikonfigurasi via env):
- `HEAVY_RAIN`: curah hujan >= 20 mm (bobot 40)
- `RAINY_CONDITION`: hujan/gerimis + curah hujan >= 10 mm (bobot 20)
- `STRONG_WIND`: angin >= 12 km/j (bobot 25)
- `EXTREME_HEAT`: suhu >= 32 C (bobot 20)
- `LOW_HUMIDITY`: kelembapan < 50% (bobot 15)

Skor dan level risiko:
- `rendah`: < 30
- `sedang`: 30-54
- `tinggi`: 55-79
- `ekstrem`: >= 80

Aturan kirim:
- Notifikasi dikirim jika `notificationsEnabled = true` dan:
  - skor >= 30, atau
  - ada `customMessage`.

## 6. AI Generatif (Layer 2)

Peran Gemini pada layer 2:
- Memperjelas bahasa pesan.
- Menjaga nada ramah dan instruktif.
- Memadatkan pesan agar ringkas.

Guardrail:
- Tidak boleh mengubah level risiko dari rule engine.
- Tidak boleh menambah data cuaca di luar input.
- Tidak boleh menambah saran berbahaya.

Fallback:
- Jika Gemini gagal/tidak tersedia, sistem memakai draft pesan rule engine.

## 7. Payload ke n8n (Output Backend)

Payload final yang dikirim ke webhook n8n:

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
      "shouldSend": true,
      "triggeredRules": [
        { "code": "HEAVY_RAIN", "reason": "...", "weight": 40 }
      ],
      "recommendations": [
        "Tunda penyemprotan...",
        "Pastikan drainase..."
      ],
      "reason": "Risk score 65 memenuhi ambang kirim notifikasi."
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

## 8. Workflow n8n yang Direkomendasikan

Urutan node:

1. Webhook Trigger
- Method: `POST`
- Path: `arina-notify`
- Auth: Header Auth (disarankan)

2. IF / Switch (validasi platform)
- Kondisi 1: `{{$json.platform}} == "whatsapp"`
- Kondisi 2: `{{$json.platform}} == "telegram"`

3. IF (cek quality gate)
- Opsional: skip jika `{{$json.metadata.decision.riskScore < 30}}`

4. Channel Sender
- WhatsApp: Cloud API / provider HTTP request
- Telegram: Telegram node bawaan

5. Logging / Data Store
- Simpan `decisionId`, `riskLevel`, `riskScore`, status kirim, timestamp

## 9. Integrasi Website (Sudah Diimplementasikan)

Di halaman cuaca:
- User bisa simpan nomor WhatsApp.
- Ada tombol `Kirim Pesan Uji Coba (AI Decision)`.
- Tombol memanggil endpoint `POST /api/notification/decide-send`.
- UI menampilkan status:
  - success (terkirim)
  - skipped (tidak dikirim karena skor di bawah ambang)
  - error

## 10. Environment Variables

Tambahkan di backend `.env`:

```env
N8N_WEBHOOK_URL=https://n8n.domainanda.com/webhook/arina-notify
N8N_WEBHOOK_SECRET=your-secret-token

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash

ALERT_HEAVY_RAIN_MM=20
ALERT_STRONG_WIND_KMH=12
ALERT_EXTREME_TEMP_C=32
ALERT_LOW_HUMIDITY_PERCENT=50
```

## 11. Contoh Response Endpoint

### 11.1 Keputusan dikirim

```json
{
  "success": true,
  "message": "Keputusan berhasil dibuat dan notifikasi diteruskan ke n8n.",
  "data": {
    "sent": true,
    "decision": {
      "decisionId": "dec-...",
      "shouldSend": true,
      "riskScore": 65,
      "riskLevel": "tinggi",
      "reason": "Risk score 65 memenuhi ambang kirim notifikasi."
    }
  }
}
```

### 11.2 Keputusan tidak dikirim

```json
{
  "success": true,
  "message": "Notifikasi tidak dikirim karena kondisi belum memenuhi aturan.",
  "data": {
    "sent": false,
    "decision": {
      "riskScore": 20,
      "riskLevel": "rendah",
      "reason": "Risk score 20 di bawah ambang notifikasi (30)."
    }
  }
}
```

## 12. Keamanan dan Operasional

1. Wajib aktifkan Header Auth di webhook n8n.
2. Jangan expose secret webhook di frontend.
3. Simpan audit log dengan `decisionId` untuk traceability.
4. Terapkan rate-limit endpoint notifikasi untuk mencegah spam.
5. Gunakan circuit breaker sederhana: jika n8n gagal beruntun, fallback ke queue/retry.

## 13. Ringkasan Nilai AI Decision System

Dengan hybrid approach ini:
- Keputusan tetap konsisten karena dikunci rule engine.
- Pesan lebih natural dan mudah dipahami karena dipoles Gemini.
- Risiko over-automation berkurang karena ada threshold dan alasan eksplisit.
- Integrasi n8n tetap sederhana, karena menerima payload final siap kirim.
