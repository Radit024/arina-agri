  %%{init: {"theme": "base", "flowchart": {"curve": "basis", "nodeSpacing": 55, "rankSpacing": 75}, "themeVariables": {"background": "#ffffff", "fontFamily": "Arial", "fontSize": "15px", "primaryTextColor": "#1f2937", "lineColor": "#6b7280"}}}%%
  flowchart LR
    subgraph clientZone["Client Access"]
      desktop["DESKTOP<br/>Browser"]
      mobile["MOBILE<br/>Browser"]
      user["USERS<br/>Petani / UMKM"]
    end

    edge["VERCEL EDGE<br/>CDN + HTTPS"]

    subgraph appZone["Next.js 16 Monolith"]
      nextApp["NEXT APP<br/>App Router"]
      pages["PAGES<br/>app/dashboard/**"]
      views["VIEWS<br/>_components/*View.tsx"]
      controllers["CONTROLLERS<br/>useXxxController.ts"]
      hooks["HOOKS<br/>data + UI state"]
      shared["SHARED UI<br/>MUI components"]
    end

    subgraph apiZone["API & Server Modules"]
      apiRoutes["API ROUTES<br/>app/api/**/route.ts"]
      validators["VALIDATION<br/>Zod + request guards"]
      serverLib["SERVER LOGIC<br/>lib/server/**"]
      exports["EXPORTS<br/>PDF + XLSX"]
    end

    subgraph dataZone["Supabase Data & Auth"]
      supabaseAuth["AUTH<br/>Supabase Auth"]
      postgres["POSTGRES<br/>Supabase DB"]
      rls["RLS<br/>per-user policies"]
      localStorage["LOCAL STORAGE<br/>chat history + UI prefs"]
    end

    subgraph externalZone["External Data & AI"]
      bmkg["BMKG<br/>forecast + warnings"]
      wilayah["WILAYAH.ID<br/>location lookup"]
      siskaperbapo["SISKAPERBAPO<br/>commodity prices"]
      rss["GOOGLE NEWS RSS<br/>market news"]
      gemini["GEMINI AI<br/>chat + report analysis"]
    end

    subgraph messagingZone["Messaging & Webhooks"]
      whatsapp["WHATSAPP<br/>Cloud API"]
      telegram["TELEGRAM<br/>Bot API"]
      webhook["WEBHOOKS<br/>chat input"]
      notification["NOTIFICATION<br/>decision engine"]
    end

    subgraph opsZone["Operations"]
      github["GITHUB ACTIONS<br/>lint + typecheck + test + build"]
      vercel["VERCEL<br/>preview + production"]
      cron["VERCEL CRON<br/>news, prices, notifications"]
      smoke["SMOKE CHECK<br/>deployment health"]
    end

    subgraph legacyZone["Legacy / Reference"]
      backend["EXPRESS BACKEND<br/>legacy reference only"]
    end

    desktop -- "https" --> edge
    mobile -- "https" --> edge
    user -- "uses app" --> edge
    edge -- "serves UI" --> nextApp

    nextApp --> pages
    pages --> controllers
    controllers --> views
    views --> shared
    controllers --> hooks
    hooks -- "fetch / mutate" --> apiRoutes
    controllers -- "client reads + writes" --> postgres
    controllers -- "cache preferences" --> localStorage

    apiRoutes --> validators
    validators --> serverLib
    serverLib -- "read / write" --> postgres
    serverLib -- "auth session" --> supabaseAuth
    postgres --> rls
    supabaseAuth --> rls
    serverLib --> exports

    serverLib -- "forecast + warnings" --> bmkg
    serverLib -- "adm4 lookup" --> wilayah
    serverLib -- "daily prices" --> siskaperbapo
    serverLib -- "news feed" --> rss
    serverLib -- "prompt + context" --> gemini

    apiRoutes -- "send / decide" --> notification
    notification --> whatsapp
    notification --> telegram
    whatsapp -- "incoming messages" --> webhook
    telegram -- "incoming messages" --> webhook
    webhook --> apiRoutes

    github --> vercel
    vercel --> edge
    vercel --> smoke
    cron -- "scheduled GET" --> apiRoutes
    cron -- "fetch feeds" --> serverLib

    backend -. "not primary runtime" .-> serverLib

    subgraph legendZone["Legend"]
      legendSingle["SINGLE SERVICE"]
      legendCluster["GROUP / LAYER"]
      legendExternal["EXTERNAL PROVIDER"]
      legendDashed["DASHED = legacy/reference"]
    end

    classDef clientClass fill:#ffffff,stroke:#374151,stroke-width:2px,color:#111827;
    classDef appClass fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#111827;
    classDef apiClass fill:#eeeeee,stroke:#9ca3af,stroke-width:2px,color:#111827;
    classDef dataClass fill:#dbeafe,stroke:#60a5fa,stroke-width:2px,color:#111827;
    classDef externalClass fill:#ffedd5,stroke:#fb923c,stroke-width:2px,color:#111827;
    classDef messagingClass fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#111827;
    classDef opsClass fill:#f3f4f6,stroke:#6b7280,stroke-width:2px,color:#111827;
    classDef legacyClass fill:#ffffff,stroke:#9ca3af,stroke-width:2px,stroke-dasharray:8 6,color:#6b7280;
    classDef legendClass fill:#ffffff,stroke:#9ca3af,stroke-width:1px,color:#374151;

    class desktop,mobile,user,edge clientClass;
    class nextApp,pages,views,controllers,hooks,shared appClass;
    class apiRoutes,validators,serverLib,exports apiClass;
    class supabaseAuth,postgres,rls,localStorage dataClass;
    class bmkg,wilayah,siskaperbapo,rss,gemini externalClass;
    class whatsapp,telegram,webhook,notification messagingClass;
    class github,vercel,cron,smoke opsClass;
    class backend legacyClass;
    class legendSingle,legendCluster,legendExternal,legendDashed legendClass;

    style dataZone fill:#dbeafe,stroke:#60a5fa,stroke-width:2px;
    style externalZone fill:#ffedd5,stroke:#fb923c,stroke-width:2px;
    style messagingZone fill:#fef3c7,stroke:#f59e0b,stroke-width:2px;
    style appZone fill:#f3f4f6,stroke:#9ca3af,stroke-width:2px;
    style apiZone fill:#f8fafc,stroke:#9ca3af,stroke-width:2px;
    style opsZone fill:#f9fafb,stroke:#9ca3af,stroke-width:2px;
    style legacyZone fill:#ffffff,stroke:#9ca3af,stroke-width:2px,stroke-dasharray:8 6;
    style clientZone fill:#ffffff,stroke:#d1d5db,stroke-width:2px;
    style legendZone fill:#ffffff,stroke:#9ca3af,stroke-width:2px,stroke-dasharray:8 6;
