flowchart TD
  diagramTitle["Problem-Solution Flow Arina Agri"]

  farmer["Petani cabai / UMKM agribisnis"]

  subgraph problems["Masalah Utama"]
    p1["Pencatatan keuangan dan stok masih tersebar"]
    p2["Risiko cuaca sulit dipantau secara rutin"]
    p3["Harga pasar dan berita komoditas tidak selalu terbaca cepat"]
    p4["Keputusan panen, distribusi, dan pembelian input sering berbasis intuisi"]
  end

  arina["Arina Agri"]

  subgraph solutions["Solusi Digital"]
    s1["Dashboard operasional tani"]
    s2["Pencatatan transaksi dan stok panen"]
    s3["Cuaca BMKG dan peringatan risiko"]
    s4["Kabar pasar, harga komoditas, dan berita"]
    s5["Ensiklopedia AI dan rekomendasi berbasis konteks"]
  end

  subgraph outcomes["Dampak yang Diharapkan"]
    o1["Data usaha tani lebih rapi"]
    o2["Keputusan lebih cepat dan terukur"]
    o3["Risiko cuaca dan stok lebih mudah diantisipasi"]
    o4["Petani lebih siap membaca peluang pasar"]
  end

  diagramTitle --> farmer
  farmer --> p1
  farmer --> p2
  farmer --> p3
  farmer --> p4
  p1 --> arina
  p2 --> arina
  p3 --> arina
  p4 --> arina
  arina --> s1
  arina --> s2
  arina --> s3
  arina --> s4
  arina --> s5
  s1 --> o1
  s2 --> o1
  s3 --> o3
  s4 --> o4
  s5 --> o2

  classDef titleClass fill:#0f172a,stroke:#0f172a,color:#ffffff;
  classDef actor fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef problem fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef solution fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef impact fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class diagramTitle titleClass;
  class farmer actor;
  class p1,p2,p3,p4 problem;
  class arina,s1,s2,s3,s4,s5 solution;
  class o1,o2,o3,o4 impact;
