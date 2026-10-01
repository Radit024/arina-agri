flowchart TD
  arina["Arina Agri"]

  dashboard["Dashboard Ringkasan"]
  finance["Pencatatan Keuangan"]
  stock["Manajemen Stok Panen"]
  weather["Cuaca dan Risiko"]
  market["Kabar Pasar"]
  calendar["Smart Kalender"]
  ai["Ensiklopedia AI"]
  settings["Pengaturan"]
  notification["Notifikasi WhatsApp / Telegram"]

  arina --> dashboard
  arina --> finance
  arina --> stock
  arina --> weather
  arina --> market
  arina --> calendar
  arina --> ai
  arina --> settings
  arina --> notification

  dashboard --> kpi["KPI usaha tani"]
  dashboard --> charts["Grafik keuangan dan harga"]
  dashboard --> alerts["Banner risiko cuaca"]

  finance --> ledger["Transaksi pemasukan dan pengeluaran"]
  finance --> report["Excel, PDF, dan analisis AI"]
  finance --> bep["HPP dan BEP"]

  stock --> batch["Batch panen"]
  stock --> mutation["Mutasi stok masuk / keluar"]
  stock --> expiry["Batch hampir kadaluarsa"]

  weather --> forecast["Prakiraan BMKG"]
  weather --> location["Lokasi manual / GPS"]
  weather --> warnings["Peringatan dini"]

  market --> prices["Harga cabai"]
  market --> articles["Berita pertanian"]
  market --> map["Peta harga Jawa Timur"]

  calendar --> tasks["Agenda tani"]
  calendar --> reminder["Pengingat aktivitas"]

  ai --> chat["Chat budidaya dan hama"]
  ai --> context["Konteks cuaca dan pasar"]

  settings --> profile["Profil"]
  settings --> preference["Bahasa dan tema"]
  notification --> channel["Channel notifikasi"]

  classDef center fill:#16a34a,stroke:#15803d,color:#ffffff;
  classDef module fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef leaf fill:#f8fafc,stroke:#94a3b8,color:#0f172a;

  class arina center;
  class dashboard,finance,stock,weather,market,calendar,ai,settings,notification module;
  class kpi,charts,alerts,ledger,report,bep,batch,mutation,expiry,forecast,location,warnings,prices,articles,map,tasks,reminder,chat,context,profile,preference,channel leaf;
