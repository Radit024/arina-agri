/**
 * Regenerasi `public/jatim-kab.geojson` yang dipakai `components/dashboard/EastJavaMap.tsx`.
 *
 * Sumber: IDN_adm_2_kabkota (kabupaten/kota seluruh Indonesia), lalu disaring
 * menjadi wilayah Jawa Timur saja supaya bundle map tidak memuat 514 fitur
 * yang tidak pernah dirender.
 *
 * Jalankan dari root repo:
 *   node scripts/fetch-geojson.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/rifani/geojson-political-indonesia/master/IDN_adm_2_kabkota.json';

const OUTPUT_PATH = path.join(process.cwd(), 'public', 'jatim-kab.geojson');

// Skema properti pada dataset upstream berubah beberapa kali, jadi provisioning
// diuji terhadap beberapa alias sekaligus. Kalau semua gagal, error akan
// menampilkan properti yang benar-benar ada.
function isEastJava(properties) {
  const candidates = [
    properties.NAME_1,
    properties.Propinsi,
    properties.WADMPR,
    properties.PROVINSI,
    properties.NM_PROV,
    properties.nm_prov,
    properties.state,
  ];

  if (candidates.some((value) => String(value ?? '').toUpperCase() === 'JAWA TIMUR')) {
    return true;
  }

  if (properties.name && String(properties.name).includes('Jawa Timur')) {
    return true;
  }

  // Kode wilayah BPS: Jawa Timur = 35.
  if (properties.ID_1 === 35) {
    return true;
  }

  if (typeof properties.id === 'string' && properties.id.startsWith('35')) {
    return true;
  }

  if (typeof properties.KODE === 'string' && properties.KODE.startsWith('35')) {
    return true;
  }

  return false;
}

async function main() {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Gagal mengunduh GeoJSON: HTTP ${response.status} ${response.statusText}`);
  }

  const geojson = await response.json();
  const eastJava = geojson.features.filter((feature) => isEastJava(feature.properties ?? {}));

  if (eastJava.length === 0) {
    throw new Error(
      'Tidak ada fitur Jawa Timur yang terdeteksi. Struktur properti pada dataset ' +
        `upstream kemungkinan berubah. Contoh: ${JSON.stringify(geojson.features[0]?.properties)}`,
    );
  }

  geojson.features = eastJava;
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));

  console.log(`Menyimpan ${eastJava.length} fitur Jawa Timur ke ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
