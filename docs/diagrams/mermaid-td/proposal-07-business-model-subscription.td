flowchart TD
  user["Pengguna Arina Agri"]

  free["Free<br/>Coba fitur inti dan prompt AI terbatas"]
  basic["Basic<br/>Kalender, export PDF, dan kuota lebih besar"]
  pro["Pro<br/>Insight AI, tim kecil, dan fair use lebih tinggi"]

  triggers["Pemicu Upgrade"]
  t1["Kuota AI hampir habis"]
  t2["Butuh laporan dan export"]
  t3["Operasional usaha makin besar"]
  t4["Butuh kolaborasi tim"]

  revenue["Pendapatan Berulang"]
  impact["Dampak Bisnis<br/>MRR, konversi, retensi, ARPU"]

  user --> free
  free -- "upgrade" --> basic
  basic -- "scale up" --> pro
  free --> triggers
  basic --> triggers
  triggers --> t1
  triggers --> t2
  triggers --> t3
  triggers --> t4
  basic --> revenue
  pro --> revenue
  revenue --> impact

  classDef user fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef tier fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef trigger fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef business fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class user user;
  class free,basic,pro tier;
  class triggers,t1,t2,t3,t4 trigger;
  class revenue,impact business;
