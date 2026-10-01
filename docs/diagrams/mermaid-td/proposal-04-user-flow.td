flowchart LR
  start([Start])
  startNote["Mulai alur penggunaan Arina Agri"]

  decision{Pengguna sudah punya akun?}
  decisionNote["Keputusan awal yang memengaruhi pengalaman pengguna"]

  register["Daftar Akun"]
  registerAction["isi data"]
  login["Login"]
  loginAction["masuk"]

  connector((User<br/>decision /<br/>connector))
  connectorNote["Dipakai saat pengguna bisa masuk ke beberapa arah fitur"]

  dashboard["Dashboard<br/>Ringkasan"]
  dashboardAction["pilih fitur"]

  altInput["Alt flow<br/>Input via WhatsApp / Telegram"]
  altInputNote["Jalur alternatif untuk pencatatan cepat tanpa membuka dashboard penuh"]

  inputData["Input Data<br/>Keuangan, stok panen, jadwal"]
  insight["Insight &<br/>Rekomendasi"]
  decisionTani["Keputusan Tani<br/>Panen, distribusi, pembelian input"]

  notification["Notifikasi<br/>Berkala"]
  endMain([End])
  endAlt([End])

  altAi["Alt flow<br/>Konsultasi Ensiklopedia AI"]
  altAiNote["Jalur bantuan saat pengguna membutuhkan saran budidaya, hama, atau penyakit"]

  note["Note<br/><br/>User flow proposal Arina Agri<br/>menunjukkan alur utama petani dari<br/>akses aplikasi, input data, insight,<br/>keputusan, sampai notifikasi."]

  start --> decision
  start -.-> startNote
  decision -.-> decisionNote

  decision -- "Tidak" --> register
  register --> registerAction --> login
  decision -- "Ya" --> login
  login --> loginAction --> connector

  connector --> dashboard
  connector --> altInput
  connector --> altAi

  dashboard --> dashboardAction --> inputData
  inputData --> insight
  insight --> decisionTani
  decisionTani --> notification
  notification --> endMain

  altInput --> inputData
  altInput -.-> altInputNote

  altAi --> insight
  altAi -.-> altAiNote

  connector -.-> connectorNote
  endAlt -.-> note
  altAi --> endAlt

  classDef startEnd fill:#FFE8A3,stroke:#D0B46A,stroke-width:2px,color:#111827;
  classDef endNode fill:#FBC5C0,stroke:#D99A95,stroke-width:2px,color:#111827;
  classDef decisionClass fill:#F2F2F2,stroke:#B8B8B8,stroke-width:2px,stroke-dasharray:5 5,color:#111827;
  classDef processClass fill:#DCC2F6,stroke:#A98ACF,stroke-width:2px,color:#111827;
  classDef actionClass fill:#BFE5FF,stroke:#8CC8EC,stroke-width:1px,color:#0f172a;
  classDef connectorClass fill:#E5E5E5,stroke:#BDBDBD,stroke-width:2px,color:#111827;
  classDef altClass fill:#8B3FF2,stroke:#7130D0,stroke-width:2px,color:#ffffff;
  classDef noteClass fill:#FFD966,stroke:#E2B94F,stroke-width:1px,color:#111827;
  classDef helper fill:#ffffff,stroke:#ffffff,color:#111827;

  class start startEnd;
  class endMain,endAlt endNode;
  class decision decisionClass;
  class register,login,dashboard,inputData,insight,decisionTani,notification processClass;
  class registerAction,loginAction,dashboardAction actionClass;
  class connector connectorClass;
  class altInput,altAi altClass;
  class note noteClass;
  class startNote,decisionNote,connectorNote,altInputNote,altAiNote helper;
