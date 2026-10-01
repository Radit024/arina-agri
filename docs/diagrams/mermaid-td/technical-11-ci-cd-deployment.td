flowchart TD
  dev["Developer push / pull request"]
  github["GitHub Repository"]
  actions["GitHub Actions"]
  install["npm ci"]
  lint["npm run lint"]
  typecheck["npm run typecheck"]
  tests["npm run test"]
  i18n["npm run i18n:check"]
  build["npm run build"]
  bundle["npm run perf:bundles"]
  preview["Vercel Preview Deploy"]
  production["Vercel Production Deploy"]
  smoke["npm run smoke:deploy"]
  app["Arina Agri Production"]

  dev --> github
  github --> actions
  actions --> install
  install --> lint
  lint --> typecheck
  typecheck --> tests
  tests --> i18n
  i18n --> build
  build --> bundle
  bundle --> preview
  bundle --> production
  preview --> smoke
  production --> smoke
  smoke --> app

  classDef source fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef quality fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef deploy fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef appClass fill:#f0fdf4,stroke:#16a34a,color:#0f172a;

  class dev,github source;
  class actions,install,lint,typecheck,tests,i18n,build,bundle quality;
  class preview,production,smoke deploy;
  class app appClass;
