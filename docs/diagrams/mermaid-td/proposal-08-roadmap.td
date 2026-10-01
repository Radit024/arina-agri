flowchart LR
  phase1["Fase 1<br/>MVP Dashboard<br/>Keuangan, stok, cuaca, kalender, kabar pasar, AI"]
  phase2["Fase 2<br/>Input Chat<br/>WhatsApp / Telegram untuk transaksi dan stok"]
  phase3["Fase 3<br/>Subscription<br/>Free, Basic, Pro, usage meter, billing"]
  phase4["Fase 4<br/>Analytics<br/>Prediksi risiko, rekomendasi margin, performa batch"]
  phase5["Fase 5<br/>Ekosistem Mitra<br/>Koperasi, distributor, pembeli, marketplace lokal"]

  phase1 --> phase2 --> phase3 --> phase4 --> phase5

  classDef current fill:#16a34a,stroke:#15803d,color:#ffffff;
  classDef next fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef future fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class phase1 current;
  class phase2,phase3 next;
  class phase4,phase5 future;
