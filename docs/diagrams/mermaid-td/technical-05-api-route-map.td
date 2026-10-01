flowchart TD
  client["Dashboard Client"]

  subgraph ai["AI"]
    aiGemini["POST /api/ai/gemini"]
    aiReport["POST /api/ai/financial-report"]
  end

  subgraph weather["Weather and Location"]
    forecast["GET /api/weather/forecast"]
    warnings["GET /api/weather/warnings"]
    search["GET /api/location/search"]
    reverse["GET /api/location/reverse"]
  end

  subgraph dashboard["Dashboard"]
    summary["GET /api/dashboard/summary"]
    profile["GET/POST /api/profile"]
    feedback["POST /api/feedback"]
  end

  subgraph market["Market News and Prices"]
    news["GET /api/news"]
    newsTrigger["POST /api/news/trigger"]
    cronNews["GET /api/cron/news"]
    cronPrices["GET /api/cron/prices"]
    newsTable["news_articles table"]
    priceTable["commodity_prices table"]
  end

  subgraph calendar["Calendar"]
    events["GET/POST /api/calendar/events"]
  end

  subgraph notification["Notification"]
    send["POST /api/notification/send"]
    decide["POST /api/notification/decide"]
    decideSend["POST /api/notification/decide-send"]
    schedule["GET/POST /api/notification/schedule"]
    cronNotification["GET /api/cron/notifications"]
  end

  subgraph webhook["Chat Input Webhooks"]
    wa["GET/POST /api/webhook/whatsapp"]
    tg["POST /api/webhook/telegram"]
  end

  subgraph health["Ops"]
    healthCheck["GET /api/health"]
  end

  client --> aiGemini
  client --> aiReport
  client --> forecast
  client --> warnings
  client --> search
  client --> reverse
  client --> summary
  client --> profile
  client --> feedback
  client --> news
  client --> events
  client --> send
  client --> decide
  client --> decideSend
  client --> schedule

  cronNews --> newsTable
  cronPrices --> priceTable
  newsTrigger --> newsTable
  news --> newsTable
  priceTable --> summary
  cronNotification --> notification
  wa --> notification
  tg --> notification
  healthCheck --> client

  classDef client fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef route fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef cron fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef webhook fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class client client;
  class aiGemini,aiReport,forecast,warnings,search,reverse,summary,profile,feedback,news,newsTrigger,events,send,decide,decideSend,schedule,healthCheck,newsTable,priceTable route;
  class cronNews,cronPrices,cronNotification cron;
  class wa,tg webhook;
