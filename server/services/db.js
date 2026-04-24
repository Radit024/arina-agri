const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'arina_agri';

let mongoClient;
let db;

const nowIso = () => new Date().toISOString();

const seed = {
  transactions: [
    {
      jenis: 'pengeluaran',
      kategori: 'Pupuk',
      nominal: 450000,
      tanggal: '2026-04-10',
      keterangan: 'Pembelian pupuk NPK',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      jenis: 'pendapatan',
      kategori: 'Penjualan',
      nominal: 3200000,
      tanggal: '2026-04-18',
      keterangan: 'Penjualan cabai ke distributor',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
  batches: [
    {
      batchCode: 'BATCH-001-A',
      tanggalPanen: '2026-04-12',
      grade: 'A',
      beratMasuk: 400,
      stokTersisa: 280,
      hargaModal: 18000,
      hargaJual: 45000,
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '2026-04-26',
      catatan: 'Panen pagi kondisi optimal',
      status: 'aman',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      batchCode: 'BATCH-002-B',
      tanggalPanen: '2026-04-15',
      grade: 'B',
      beratMasuk: 350,
      stokTersisa: 60,
      hargaModal: 16000,
      hargaJual: 38000,
      lokasiPenyimpanan: 'Gudang Cadangan',
      estimasiKadaluarsa: '2026-04-28',
      catatan: 'Sortir ulang grade B',
      status: 'menipis',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      batchCode: 'BATCH-003-A',
      tanggalPanen: '2026-04-18',
      grade: 'A',
      beratMasuk: 420,
      stokTersisa: 420,
      hargaModal: 18000,
      hargaJual: 46000,
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '2026-05-02',
      catatan: 'Panen perdana batch baru',
      status: 'aman',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      batchCode: 'BATCH-004-C',
      tanggalPanen: '2026-04-20',
      grade: 'C',
      beratMasuk: 180,
      stokTersisa: 180,
      hargaModal: 12000,
      hargaJual: 28000,
      lokasiPenyimpanan: 'Gudang Cadangan',
      estimasiKadaluarsa: '2026-04-24',
      catatan: 'Grade C untuk pasar lokal, segera jual',
      status: 'hampir_kadaluarsa',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
  mutations: [
    { batchCode: 'BATCH-001-A', tipe: 'masuk', berat: 400, tanggal: '2026-04-12', catatan: 'Panen awal masuk gudang', createdAt: nowIso() },
    { batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 80, tujuan: 'Pasar Lokal', tanggal: '2026-04-14', catatan: 'Jual ke pasar pagi', createdAt: nowIso() },
    { batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 40, tujuan: 'Distributor', tanggal: '2026-04-16', catatan: 'Order Pak Hendra', createdAt: nowIso() },
  ],
};

function mapDoc(doc) {
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() };
}

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function connectMongo() {
  if (!MONGODB_URI) {
    return { connected: false, reason: 'MONGODB_URI is not set' };
  }
  if (db) return { connected: true };

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  db = mongoClient.db(MONGODB_DB_NAME);

  await db.collection('transactions').createIndex({ tanggal: -1 });
  await db.collection('stok_batches').createIndex({ createdAt: -1 });
  await db.collection('stok_mutations').createIndex({ createdAt: -1 });
  await db.collection('stok_mutations').createIndex({ batchId: 1 });

  await ensureSeedData();

  return { connected: true };
}

async function ensureSeedData() {
  const txCount = await db.collection('transactions').countDocuments();
  const batchCount = await db.collection('stok_batches').countDocuments();

  if (txCount === 0) {
    await db.collection('transactions').insertMany(seed.transactions);
  }

  if (batchCount === 0) {
    const inserted = await db.collection('stok_batches').insertMany(seed.batches);
    const ids = Object.values(inserted.insertedIds);

    const batchAId = ids[0];
    const seededMutations = seed.mutations.map((m) => ({
      ...m,
      batchId: batchAId,
    }));
    await db.collection('stok_mutations').insertMany(seededMutations);
  }
}

function getDb() {
  return db;
}

function isMongoConnected() {
  return Boolean(db);
}

module.exports = {
  connectMongo,
  getDb,
  isMongoConnected,
  mapDoc,
  toObjectId,
};
