flowchart TD
  cron["Vercel Cron"]

  subgraph newsFlow["News Flow"]
    cronNews["GET /api/cron/news"]
    rss["Google News RSS sources"]
    parseNews["rss-parser + relevance filter"]
    cleanNews["Normalize title, snippet, source, image"]
    newsDb["news_articles"]
    newsUi["Kabar Pasar and Dashboard NewsWidget"]
  end

  subgraph priceFlow["Price Flow"]
    cronPrice["GET /api/cron/prices"]
    siskaperbapo["Siskaperbapo Jawa Timur"]
    scrape["axios + cheerio scraper"]
    normalizePrice["Normalize commodity, region, price"]
    priceDb["commodity_prices"]
    priceUi["Price chart, KPI, East Java map"]
  end

  cron --> cronNews
  cron --> cronPrice
  cronNews --> rss
  rss --> parseNews
  parseNews --> cleanNews
  cleanNews --> newsDb
  newsDb --> newsUi

  cronPrice --> siskaperbapo
  siskaperbapo --> scrape
  scrape --> normalizePrice
  normalizePrice --> priceDb
  priceDb --> priceUi

  classDef cron fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef source fill:#f8fafc,stroke:#64748b,color:#0f172a;
  classDef process fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef db fill:#f0fdf4,stroke:#16a34a,color:#0f172a;

  class cron,cronNews,cronPrice cron;
  class rss,siskaperbapo source;
  class parseNews,cleanNews,scrape,normalizePrice process;
  class newsDb,priceDb,newsUi,priceUi db;
