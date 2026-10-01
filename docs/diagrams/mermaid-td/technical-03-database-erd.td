erDiagram
  PROFILES ||--o{ TRANSACTIONS : owns
  PROFILES ||--o{ CALENDAR_EVENTS : schedules
  PROFILES ||--o{ HARVEST_BATCHES : records
  PROFILES ||--o{ STOCK_MUTATIONS : creates
  HARVEST_BATCHES ||--o{ STOCK_MUTATIONS : has
  PROFILES ||--o{ NOTIFICATION_SCHEDULES : configures
  PROFILES ||--o{ INBOUND_MESSAGE_LOGS : receives
  PROFILES ||--o{ USER_FEEDBACKS : submits
  PROFILES ||--o{ BUYERS : saves
  PROFILES ||--o{ SUPPLY_ITEMS : owns
  SUPPLY_ITEMS ||--o{ SUPPLY_MUTATIONS : has
  PROFILES ||--o{ SUPPLY_MUTATIONS : records
  TRANSACTIONS ||--o{ SUPPLY_MUTATIONS : may_link_to
  PROFILES ||--o{ STOCK_GRADES : defines
  PROFILES ||--o{ STORAGE_LOCATIONS : defines

  PROFILES {
    uuid id PK
    text full_name
    text lokasi
    text komoditas
    text luas_lahan
    text whatsapp_phone UK
    text telegram_username UK
    text telegram_chat_id UK
    timestamptz created_at
    timestamptz updated_at
  }

  TRANSACTIONS {
    uuid id PK
    uuid user_id FK
    text jenis
    text kategori
    numeric nominal
    date tanggal
    text keterangan
    timestamptz created_at
    timestamptz updated_at
  }

  CALENDAR_EVENTS {
    uuid id PK
    uuid user_id FK
    text title
    text category
    date date
    text time
    text note
    boolean completed
    timestamptz created_at
    timestamptz updated_at
  }

  HARVEST_BATCHES {
    uuid id PK
    uuid user_id FK
    text batch_code UK
    date tanggal_panen
    text grade
    numeric berat_masuk
    numeric stok_tersisa
    numeric harga_modal
    numeric harga_jual
    text lokasi_penyimpanan
    date estimasi_kadaluarsa
    text status
    text catatan
    timestamptz created_at
    timestamptz updated_at
  }

  STOCK_MUTATIONS {
    uuid id PK
    uuid user_id FK
    uuid batch_id FK
    text batch_code
    text tipe
    numeric berat
    text tujuan
    text nama_pembeli
    numeric harga_realisasi
    date tanggal
    text catatan
    timestamptz created_at
  }

  BUYERS {
    uuid id PK
    text user_id FK
    text nama
    timestamptz created_at
  }

  SUPPLY_ITEMS {
    uuid id PK
    uuid user_id FK
    text nama
    text kategori
    text satuan
    numeric stok_saat_ini
    numeric harga_beli_terakhir
    text catatan
    timestamptz created_at
    timestamptz updated_at
  }

  SUPPLY_MUTATIONS {
    uuid id PK
    uuid user_id FK
    uuid item_id FK
    uuid linked_transaction_id FK
    text tipe
    numeric jumlah
    numeric harga_satuan
    date tanggal
    text keterangan
    timestamptz created_at
  }

  STOCK_GRADES {
    uuid id PK
    uuid user_id FK
    text nama
    integer urutan
  }

  STORAGE_LOCATIONS {
    uuid id PK
    uuid user_id FK
    text nama
    integer urutan
  }

  NOTIFICATION_SCHEDULES {
    uuid id PK
    uuid user_id FK
    boolean enabled
    time send_time
    text timezone
    text platform
    text destination
    text recipient_name
    text weather_adm4
    text weather_location_label
    text custom_message
    timestamptz updated_at
  }

  INBOUND_MESSAGE_LOGS {
    uuid id PK
    uuid user_id FK
    text channel
    text external_message_id UK
    text sender_id
    text raw_text
    text command_type
    text status
    text response_text
    text error_message
    timestamptz created_at
    timestamptz processed_at
  }

  USER_FEEDBACKS {
    uuid id PK
    uuid user_id FK
    text category
    text message
    text user_name
    text device_type
    text status
    timestamptz created_at
  }

  COMMODITY_PRICES {
    uuid id PK
    date date
    text commodity
    text location
    numeric price
    timestamptz created_at
  }

  NEWS_ARTICLES {
    uuid id PK
    text title
    text snippet
    text link UK
    text source
    text image_url
    timestamptz pub_date
    timestamptz created_at
  }
