flowchart TD
  subgraph inputs["Input dan Sumber Data"]
    userData["Data usaha tani<br/>transaksi, stok, jadwal"]
    weather["Data cuaca BMKG"]
    market["Harga pasar dan berita"]
    aiContext["Konteks AI"]
  end

  arina["Arina Agri"]

  subgraph capabilities["Kapabilitas"]
    organize["Merapikan pencatatan"]
    monitor["Memantau risiko"]
    analyze["Menganalisis kondisi usaha"]
    remind["Memberi pengingat"]
  end

  subgraph value["Nilai untuk Pengguna"]
    finance["Kontrol biaya dan laba lebih jelas"]
    stock["Stok panen lebih mudah dikelola"]
    weatherValue["Risiko cuaca lebih cepat diantisipasi"]
    marketValue["Peluang harga lebih mudah dibaca"]
  end

  subgraph impact["Dampak Proposal"]
    productivity["Produktivitas pengelolaan meningkat"]
    resilience["Ketahanan usaha tani membaik"]
    decision["Keputusan lebih berbasis data"]
  end

  userData --> arina
  weather --> arina
  market --> arina
  aiContext --> arina
  arina --> organize
  arina --> monitor
  arina --> analyze
  arina --> remind
  organize --> finance
  organize --> stock
  monitor --> weatherValue
  analyze --> finance
  analyze --> marketValue
  remind --> weatherValue
  finance --> productivity
  stock --> productivity
  weatherValue --> resilience
  marketValue --> decision

  classDef source fill:#f8fafc,stroke:#94a3b8,color:#0f172a;
  classDef core fill:#16a34a,stroke:#15803d,color:#ffffff;
  classDef capability fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef value fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef impact fill:#fff7ed,stroke:#f59e0b,color:#0f172a;

  class userData,weather,market,aiContext source;
  class arina core;
  class organize,monitor,analyze,remind capability;
  class finance,stock,weatherValue,marketValue value;
  class productivity,resilience,decision impact;
