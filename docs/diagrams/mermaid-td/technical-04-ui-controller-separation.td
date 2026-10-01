flowchart TD
  route["app/.../page.tsx<br/>composition layer"]
  controllerHook["useXxxController.ts<br/>state, business logic, API calls"]
  controllerComponent["XxxController.tsx<br/>controller wrapper when needed"]
  view["app/.../_components/XxxView.tsx<br/>rendering and styling only"]
  shared["components/shared/**<br/>reusable UI"]
  api["lib/api.ts / Supabase / app/api routes"]
  validators["zod schemas and formatters"]

  route --> controllerHook
  route --> controllerComponent
  controllerComponent --> controllerHook
  controllerHook --> view
  view --> shared
  controllerHook --> api
  controllerHook --> validators
  validators --> view

  rule1["Rule: View receives props and renders UI"]
  rule2["Rule: Controller owns state, business logic, side effects, and API calls"]
  rule3["Rule: page.tsx connects controller output to view"]

  view --> rule1
  controllerHook --> rule2
  route --> rule3

  classDef page fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef controller fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef view fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef rule fill:#f8fafc,stroke:#64748b,color:#0f172a;

  class route page;
  class controllerHook,controllerComponent,api,validators controller;
  class view,shared view;
  class rule1,rule2,rule3 rule;
