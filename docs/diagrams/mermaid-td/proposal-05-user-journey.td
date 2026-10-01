flowchart LR
  stage1["1. Sebelum Pakai Arina<br/>Catatan tersebar, cuaca dan harga dicek manual"]
  stage2["2. Mulai Menggunakan<br/>Petani login dan membuka dashboard"]
  stage3["3. Mencatat Aktivitas<br/>Transaksi, stok panen, dan jadwal kerja dimasukkan"]
  stage4["4. Membaca Kondisi<br/>Arina menggabungkan data usaha, cuaca, harga, dan berita"]
  stage5["5. Mengambil Keputusan<br/>Petani menentukan panen, distribusi, atau pembelian input"]
  stage6["6. Setelah Berjalan<br/>Notifikasi dan dashboard membantu pemantauan rutin"]

  stage1 --> stage2 --> stage3 --> stage4 --> stage5 --> stage6
  stage6 -- "data makin lengkap" --> stage4

  classDef before fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef journey fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef outcome fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class stage1 before;
  class stage2,stage3,stage4 journey;
  class stage5,stage6 outcome;
