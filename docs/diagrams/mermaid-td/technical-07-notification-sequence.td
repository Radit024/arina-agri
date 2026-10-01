sequenceDiagram
  autonumber
  actor Petani
  participant UI as Cuaca/Pengaturan UI
  participant API as Next.js Notification API
  participant Weather as Weather Snapshot
  participant Decision as Rule Decision Engine
  participant Gemini as Gemini Message Polish
  participant Channel as WhatsApp or Telegram API
  participant Recipient as Petani Recipient

  Petani->>UI: Aktifkan notifikasi atau kirim tes
  UI->>API: POST /api/notification/decide-send
  API->>Weather: Ambil snapshot cuaca
  Weather-->>API: Data kondisi, hujan, angin, suhu
  API->>Decision: Hitung riskScore dan riskLevel
  Decision-->>API: shouldSend, riskLevel, rekomendasi
  API->>Gemini: Polish pesan jika API key tersedia
  Gemini-->>API: Pesan final atau fallback draft
  alt shouldSend true
    API->>Channel: Kirim pesan
    Channel-->>Recipient: Notifikasi diterima
    API-->>UI: Status terkirim
  else shouldSend false
    API-->>UI: Tidak dikirim, risiko belum memenuhi aturan
  end
