flowchart TD
  user["User bertanya di Ensiklopedia AI"]
  view["EnsiklopediaView"]
  controller["useEnsiklopediaController"]
  history["Chat history di localStorage per user"]
  weatherContext["Konteks cuaca BMKG"]
  marketContext["Konteks harga dan kabar pasar"]
  api["POST /api/ai/gemini"]
  validators["AI validators and prompt formatting"]
  gemini["Gemini AI"]
  response["Jawaban AI"]
  ui["Tampilkan jawaban dan referensi cepat"]

  user --> view
  view --> controller
  controller --> history
  controller --> weatherContext
  controller --> marketContext
  controller --> api
  api --> validators
  validators --> gemini
  gemini --> response
  response --> controller
  controller --> history
  controller --> ui

  classDef user fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef ui fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef server fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef data fill:#fff7ed,stroke:#f59e0b,color:#0f172a;

  class user user;
  class view,controller,ui ui;
  class api,validators,gemini,response server;
  class history,weatherContext,marketContext data;
