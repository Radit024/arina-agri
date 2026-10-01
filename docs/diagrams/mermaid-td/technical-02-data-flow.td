%%{init: {"theme": "base", "flowchart": {"curve": "linear", "nodeSpacing": 70, "rankSpacing": 85}, "themeVariables": {"background": "#ffffff", "fontFamily": "Arial", "fontSize": "17px", "primaryTextColor": "#374151", "lineColor": "#111827"}}}%%
flowchart LR
  farmer["Petani / UMKM"]

  login(("Login"))
  browse(("Browse<br/>dashboard"))
  inputData(("Input<br/>data"))
  syncExternal(("Sync<br/>external data"))
  insight(("Generate<br/>insight"))
  notify(("Send<br/>notification"))
  exportReport(("Export<br/>report"))

  authStore["------------<br/>Profile & session<br/>------------"]
  opsStore["------------<br/>Operational data<br/>transactions, stock, calendar<br/>------------"]
  marketStore["------------<br/>Market & weather data<br/>prices, news, forecast<br/>------------"]
  reportStore["------------<br/>Generated reports<br/>PDF / XLSX<br/>------------"]

  supabase["Supabase<br/>Auth + Postgres"]
  sources["BMKG, wilayah.id,<br/>Siskaperbapo,<br/>Google News RSS"]
  gemini["Gemini AI"]
  channels["WhatsApp /<br/>Telegram API"]

  farmer -- "Log in" --> login
  farmer -- "Browse information" --> browse
  farmer -- "Submit records" --> inputData
  farmer -- "Ask question / request report" --> insight

  login -- "Auth request" --> supabase
  supabase -- "Session + profile" --> authStore
  authStore -- "User context" --> browse

  inputData -- "Validated record" --> opsStore
  opsStore -- "Return state" --> browse

  sources -- "Weather, price, news feed" --> syncExternal
  syncExternal -- "Normalized data" --> marketStore

  browse -- "Retrieve farm data" --> opsStore
  browse -- "Retrieve market data" --> marketStore
  opsStore -- "Finance, stock, calendar" --> insight
  marketStore -- "Weather, price, news" --> insight
  browse -- "Dashboard summary" --> farmer

  insight -- "Prompt + context" --> gemini
  gemini -- "Recommendation" --> insight
  insight -- "Insight & recommendation" --> farmer

  insight -- "Alert draft" --> notify
  authStore -- "Contact preference" --> notify
  notify -- "Message payload" --> channels
  channels -- "Alert / reminder" --> farmer

  insight -- "Report data" --> exportReport
  exportReport -- "Generated file" --> reportStore
  reportStore -- "Download report" --> farmer

  subgraph legend["Legend"]
    legendFlow["Data flow"]
    legendProcess(("Process"))
    legendStore["------------<br/>File / Data store<br/>------------"]
    legendExternal["External entity"]
  end

  legendFlow --> legendProcess

  classDef processClass fill:#FF9B8A,stroke:#FF9B8A,stroke-width:2px,color:#374151;
  classDef userEntity fill:#F8C5CF,stroke:#F8C5CF,stroke-width:2px,color:#374151;
  classDef externalEntity fill:#FFC77D,stroke:#FFC77D,stroke-width:2px,color:#374151;
  classDef dataStore fill:#ffffff,stroke:#111827,stroke-width:0px,color:#4b5563;
  classDef legendItem fill:#ffffff,stroke:#ffffff,color:#4b5563;

  class login,browse,inputData,syncExternal,insight,notify,exportReport,legendProcess processClass;
  class farmer userEntity;
  class supabase,sources,gemini,channels,legendExternal externalEntity;
  class authStore,opsStore,marketStore,reportStore,legendStore dataStore;
  class legendFlow legendItem;
  style legend fill:#ffffff,stroke:#555555,stroke-width:2px,stroke-dasharray:8 8;
