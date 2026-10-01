flowchart TD
  user["Petani membuka halaman Cuaca"]
  choose["Pilih lokasi"]
  gps["Gunakan GPS"]
  manual["Cari wilayah manual"]
  reverse["/api/location/reverse"]
  search["/api/location/search"]
  adm4["Kode wilayah BMKG adm4"]
  forecast["/api/weather/forecast"]
  warnings["/api/weather/warnings"]
  bmkg["BMKG Open Data"]
  normalize["Normalisasi forecast dan warning"]
  cache["Server cache"]
  ui["CuacaView"]
  risk["Weather risk signal"]
  notification["Decision engine notifikasi"]

  user --> choose
  choose --> gps
  choose --> manual
  gps --> reverse
  manual --> search
  reverse --> adm4
  search --> adm4
  adm4 --> forecast
  adm4 --> warnings
  forecast --> bmkg
  warnings --> bmkg
  bmkg --> normalize
  normalize --> cache
  cache --> ui
  ui --> risk
  risk --> notification

  classDef user fill:#dcfce7,stroke:#16a34a,color:#0f172a;
  classDef api fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef data fill:#fff7ed,stroke:#f59e0b,color:#0f172a;
  classDef ui fill:#f0fdf4,stroke:#16a34a,color:#0f172a;

  class user,choose,gps,manual user;
  class reverse,search,forecast,warnings,normalize,risk,notification api;
  class adm4,bmkg,cache data;
  class ui ui;
