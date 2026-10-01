flowchart TD
  batchInput["Input batch panen"]
  batchTable["harvest_batches"]
  stockOut["Catat stok keluar"]
  mutationTable["stock_mutations"]
  sale["Penjualan / distribusi"]
  transaction["transactions"]
  finance["Keuangan summary"]
  stockKpi["Stok KPI"]
  dashboard["Dashboard summary"]
  risk["Sinyal risiko cuaca dan kadaluarsa"]
  action["Prioritas jual, simpan, atau distribusi"]

  batchInput --> batchTable
  batchTable --> stockKpi
  stockOut --> mutationTable
  mutationTable --> batchTable
  mutationTable --> sale
  sale --> transaction
  transaction --> finance
  stockKpi --> dashboard
  finance --> dashboard
  batchTable --> risk
  risk --> action
  dashboard --> action

  classDef input fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef db fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef compute fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef output fill:#f0fdf4,stroke:#16a34a,color:#0f172a;

  class batchInput,stockOut,sale input;
  class batchTable,mutationTable,transaction db;
  class finance,stockKpi,dashboard,risk compute;
  class action output;
