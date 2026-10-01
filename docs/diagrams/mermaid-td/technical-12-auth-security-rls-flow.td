flowchart TD
  user["Authenticated user"]
  supabaseAuth["Supabase Auth"]
  session["Client session"]
  client["Dashboard client"]
  anon["Supabase anon key"]
  rls["Postgres RLS policies"]
  userRows["Rows filtered by auth.uid()"]

  serverRoute["Next.js API route"]
  serviceRole["Supabase service role key"]
  cronSecret["CRON_SECRET bearer token"]
  webhookSecret["Webhook signature / verify token"]
  adminOps["Server-only privileged operations"]

  user --> supabaseAuth
  supabaseAuth --> session
  session --> client
  client --> anon
  anon --> rls
  rls --> userRows

  serverRoute --> serviceRole
  serverRoute --> cronSecret
  serverRoute --> webhookSecret
  serviceRole --> adminOps
  cronSecret --> adminOps
  webhookSecret --> adminOps
  adminOps --> rls

  guard1["Client cannot read or write other users' rows"]
  guard2["Secrets stay server-side only"]
  guard3["Cron and webhook endpoints require verification"]

  userRows --> guard1
  serviceRole --> guard2
  cronSecret --> guard3
  webhookSecret --> guard3

  classDef auth fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef client fill:#f0fdf4,stroke:#16a34a,color:#0f172a;
  classDef security fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef server fill:#eff6ff,stroke:#2563eb,color:#0f172a;

  class user,supabaseAuth,session auth;
  class client,anon,userRows client;
  class rls,serviceRole,cronSecret,webhookSecret,guard1,guard2,guard3 security;
  class serverRoute,adminOps server;
