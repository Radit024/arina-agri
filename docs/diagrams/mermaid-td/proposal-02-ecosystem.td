flowchart TD
  farmer["Petani / UMKM Agribisnis"]
  team["Tim usaha tani"]
  arina["Arina Agri Platform"]

  subgraph app["Aplikasi Arina"]
    dashboard["Dashboard"]
    finance["Keuangan"]
    stock["Stok Panen"]
    weather["Cuaca"]
    market["Kabar Pasar"]
    calendar["Smart Kalender"]
    ai["Ensiklopedia AI"]
    notifications["Notifikasi"]
  end

  subgraph data["Data dan Layanan Eksternal"]
    supabase["Supabase Auth + Postgres"]
    bmkg["BMKG Open Data"]
    wilayah["wilayah.id"]
    siskaperbapo["Siskaperbapo Jawa Timur"]
    news["Google News RSS"]
    gemini["Gemini AI"]
    channel["WhatsApp Cloud API / Telegram Bot API"]
  end

  subgraph ops["Operasional"]
    vercel["Vercel Deployment"]
    github["GitHub Actions CI/CD"]
    cron["Vercel Cron"]
  end

  farmer --> arina
  team --> arina
  arina --> dashboard
  arina --> finance
  arina --> stock
  arina --> weather
  arina --> market
  arina --> calendar
  arina --> ai
  arina --> notifications

  finance --> supabase
  stock --> supabase
  calendar --> supabase
  weather --> bmkg
  weather --> wilayah
  market --> siskaperbapo
  market --> news
  ai --> gemini
  notifications --> channel
  cron --> bmkg
  cron --> siskaperbapo
  cron --> news
  github --> vercel
  vercel --> arina

  classDef user fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef core fill:#f0fdf4,stroke:#15803d,color:#0f172a;
  classDef external fill:#f8fafc,stroke:#64748b,color:#0f172a;
  classDef ops fill:#fff7ed,stroke:#f59e0b,color:#0f172a;

  class farmer,team user;
  class arina,dashboard,finance,stock,weather,market,calendar,ai,notifications core;
  class supabase,bmkg,wilayah,siskaperbapo,news,gemini,channel external;
  class vercel,github,cron ops;
