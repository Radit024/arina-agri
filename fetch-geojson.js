const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/rifani/geojson-political-indonesia/master/IDN_adm_2_kabkota.json';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      if (res.statusCode !== 200) {
        console.error('Status Code:', res.statusCode, data.substring(0, 100));
        return;
      }
      const geojson = JSON.parse(data);
      const eastJava = geojson.features.filter(f => 
        f.properties.NAME_1 === 'Jawa Timur' ||
        f.properties.Propinsi === 'JAWA TIMUR' || 
        f.properties.WADMPR === 'Jawa Timur' ||
        f.properties.PROVINSI === 'JAWA TIMUR' ||
        f.properties.name?.includes('Jawa Timur') ||
        (f.properties.ID_1 && f.properties.ID_1 === 35) ||
        (f.properties.id && f.properties.id.startsWith('35')) ||
        (f.properties.KODE && f.properties.KODE.startsWith('35')) ||
        f.properties.NM_PROV === 'JAWA TIMUR' ||
        f.properties.nm_prov === 'JAWA TIMUR' ||
        f.properties.state === 'Jawa Timur'
      );
      
      console.log(`Found ${eastJava.length} features for East Java`);
      
      if (eastJava.length > 0) {
        geojson.features = eastJava;
        fs.writeFileSync('public/jatim-kab.geojson', JSON.stringify(geojson));
        console.log('Saved jatim-kab.geojson');
      } else {
        console.log('Sample properties:', geojson.features[0].properties);
      }
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
      console.log('Data sample:', data.substring(0, 100));
    }
  });
}).on('error', (err) => {
  console.error('Error fetching:', err.message);
});
