require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  connectMongo,
  getDb,
  isMongoConnected,
  mapDoc,
  toObjectId,
} = require('./services/db');
const { initFirebaseAdmin, verifyFirebaseToken } = require('./services/firebaseAdmin');
const { generateGeminiReply } = require('./services/gemini');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));
app.use(express.json());

const nowIso = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().split('T')[0];

const transactions = [];
const stokBatches = [];
const stokMutations = [];

const response = (data, message = 'OK') => ({ success: true, message, data });

const calculateStatus = (batch) => {
  if (batch.stokTersisa <= 0) return 'habis';
  if (batch.stokTersisa < batch.beratMasuk * 0.2) return 'menipis';
  const exp = new Date(batch.estimasiKadaluarsa);
  const diff = exp.getTime() - new Date(today()).getTime();
  const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dayDiff <= 2) return 'hampir_kadaluarsa';
  return 'aman';
};

app.get('/api/health', (_req, res) => {
  res.json(
    response({
      status: 'ok',
      service: 'arina-agri-backend',
      time: nowIso(),
      mongodbConnected: isMongoConnected(),
      firebaseAdminConfigured: initFirebaseAdmin(),
      geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
    })
  );
});

app.post('/api/ai/gemini', verifyFirebaseToken, async (req, res) => {
  try {
    const prompt = (req.body.prompt || '').trim();
    const history = Array.isArray(req.body.history) ? req.body.history : [];

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt wajib diisi.' });
    }

    const context = history
      .slice(-8)
      .map((item) => `${item.role || 'user'}: ${item.content || ''}`)
      .join('\n');

    const reply = await generateGeminiReply({ prompt, context });
    return res.json(response({ reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Gagal memanggil Gemini.' });
  }
});

app.get('/api/transactions', verifyFirebaseToken, async (_req, res) => {
  if (!isMongoConnected()) return res.json(response(transactions));
  const rows = await getDb().collection('transactions').find({}).sort({ createdAt: -1 }).toArray();
  return res.json(response(rows.map(mapDoc)));
});

app.post('/api/transactions', verifyFirebaseToken, async (req, res) => {
  const payload = req.body;
  const created = {
    _id: id(),
    jenis: payload.jenis,
    kategori: payload.kategori,
    nominal: Number(payload.nominal || 0),
    tanggal: payload.tanggal || today(),
    keterangan: payload.keterangan || '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  if (!isMongoConnected()) {
    transactions.unshift(created);
    return res.status(201).json(response(created, 'Transaction created'));
  }

  const doc = { ...created };
  delete doc._id;
  const result = await getDb().collection('transactions').insertOne(doc);
  return res.status(201).json(response({ ...doc, _id: result.insertedId.toString() }, 'Transaction created'));
});

app.put('/api/transactions/:id', verifyFirebaseToken, async (req, res) => {
  if (!isMongoConnected()) {
    const idx = transactions.findIndex((x) => x._id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
    transactions[idx] = { ...transactions[idx], ...req.body, updatedAt: nowIso() };
    return res.json(response(transactions[idx], 'Transaction updated'));
  }

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(404).json({ success: false, message: 'Transaction not found' });
  const updatedAt = nowIso();
  await getDb().collection('transactions').updateOne({ _id: oid }, { $set: { ...req.body, updatedAt } });
  const updated = await getDb().collection('transactions').findOne({ _id: oid });
  if (!updated) return res.status(404).json({ success: false, message: 'Transaction not found' });
  return res.json(response(mapDoc(updated), 'Transaction updated'));
});

app.delete('/api/transactions/:id', verifyFirebaseToken, async (req, res) => {
  if (!isMongoConnected()) {
    const idx = transactions.findIndex((x) => x._id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
    transactions.splice(idx, 1);
    return res.json(response(null, 'Transaction deleted'));
  }

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(404).json({ success: false, message: 'Transaction not found' });
  const result = await getDb().collection('transactions').deleteOne({ _id: oid });
  if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
  return res.json(response(null, 'Transaction deleted'));
});

app.get('/api/stok', verifyFirebaseToken, async (_req, res) => {
  if (!isMongoConnected()) return res.json(response(stokBatches));
  const rows = await getDb().collection('stok_batches').find({}).sort({ createdAt: -1 }).toArray();
  return res.json(response(rows.map(mapDoc)));
});

app.get('/api/stok/summary', verifyFirebaseToken, async (_req, res) => {
  const batches = !isMongoConnected()
    ? stokBatches
    : (await getDb().collection('stok_batches').find({}).toArray()).map(mapDoc);

  const mutations = !isMongoConnected()
    ? stokMutations
    : (await getDb().collection('stok_mutations').find({}).toArray()).map(mapDoc);

  const active = batches.filter((x) => x.status !== 'habis');
  const totalStokSiapJual = active.reduce((sum, x) => sum + x.stokTersisa, 0);
  const estimasiNilaiStok = active.reduce((sum, x) => sum + x.stokTersisa * x.hargaJual, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const stokTerjualMingguIni = mutations
    .filter((m) => m.tipe === 'keluar' && new Date(m.tanggal) >= weekAgo)
    .reduce((sum, m) => sum + m.berat, 0);
  const batchHampirKadaluarsa = batches.filter((x) => x.status === 'hampir_kadaluarsa').length;

  return res.json(response({ totalStokSiapJual, stokTerjualMingguIni, estimasiNilaiStok, batchHampirKadaluarsa }));
});

app.get('/api/stok/mutations', verifyFirebaseToken, async (req, res) => {
  const { grade, from, to } = req.query;
  let rows = !isMongoConnected()
    ? [...stokMutations]
    : (await getDb().collection('stok_mutations').find({}).sort({ createdAt: -1 }).toArray()).map(mapDoc);

  if (grade && grade !== 'semua') {
    rows = rows.filter((m) => m.batchCode.endsWith(`-${grade}`));
  }
  if (from) {
    rows = rows.filter((m) => m.tanggal >= from);
  }
  if (to) {
    rows = rows.filter((m) => m.tanggal <= to);
  }

  return res.json(response(rows));
});

app.post('/api/stok', verifyFirebaseToken, async (req, res) => {
  const payload = req.body;
  const created = {
    _id: id(),
    batchCode: `BATCH-${String((isMongoConnected() ? 1 : stokBatches.length + 1)).padStart(3, '0')}-${payload.grade}`,
    tanggalPanen: payload.tanggalPanen,
    grade: payload.grade,
    beratMasuk: Number(payload.beratMasuk),
    stokTersisa: Number(payload.beratMasuk),
    hargaModal: Number(payload.hargaModal),
    hargaJual: Number(payload.hargaJual),
    lokasiPenyimpanan: payload.lokasiPenyimpanan,
    estimasiKadaluarsa: payload.estimasiKadaluarsa,
    catatan: payload.catatan || '',
    status: 'aman',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  if (isMongoConnected()) {
    const count = await getDb().collection('stok_batches').countDocuments();
    created.batchCode = `BATCH-${String(count + 1).padStart(3, '0')}-${payload.grade}`;
  }

  created.status = calculateStatus(created);

  const mutation = {
    _id: id(),
    batchId: created._id,
    batchCode: created.batchCode,
    tipe: 'masuk',
    berat: created.beratMasuk,
    tanggal: created.tanggalPanen,
    catatan: created.catatan || 'Panen masuk gudang',
    createdAt: nowIso(),
  };

  if (!isMongoConnected()) {
    stokBatches.unshift(created);
    stokMutations.unshift(mutation);
    return res.status(201).json(response(created, 'Batch created'));
  }

  const db = getDb();
  const batchDoc = { ...created };
  delete batchDoc._id;
  const batchResult = await db.collection('stok_batches').insertOne(batchDoc);
  const batchId = batchResult.insertedId;

  const mutationDoc = {
    ...mutation,
    batchId,
  };
  delete mutationDoc._id;
  await db.collection('stok_mutations').insertOne(mutationDoc);

  return res.status(201).json(response({ ...batchDoc, _id: batchId.toString() }, 'Batch created'));
});

app.put('/api/stok/:id', verifyFirebaseToken, async (req, res) => {
  if (!isMongoConnected()) {
    const idx = stokBatches.findIndex((x) => x._id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    const next = { ...stokBatches[idx], ...req.body, updatedAt: nowIso() };
    next.status = calculateStatus(next);
    stokBatches[idx] = next;
    return res.json(response(next, 'Batch updated'));
  }

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(404).json({ success: false, message: 'Batch not found' });
  const current = await getDb().collection('stok_batches').findOne({ _id: oid });
  if (!current) return res.status(404).json({ success: false, message: 'Batch not found' });
  const next = { ...current, ...req.body, updatedAt: nowIso() };
  next.status = calculateStatus(next);
  await getDb().collection('stok_batches').updateOne({ _id: oid }, { $set: next });
  const updated = await getDb().collection('stok_batches').findOne({ _id: oid });
  return res.json(response(mapDoc(updated), 'Batch updated'));
});

app.delete('/api/stok/:id', verifyFirebaseToken, async (req, res) => {
  if (!isMongoConnected()) {
    const idx = stokBatches.findIndex((x) => x._id === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    const [deleted] = stokBatches.splice(idx, 1);
    for (let i = stokMutations.length - 1; i >= 0; i -= 1) {
      if (stokMutations[i].batchId === deleted._id) stokMutations.splice(i, 1);
    }
    return res.json(response(null, 'Batch deleted'));
  }

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(404).json({ success: false, message: 'Batch not found' });
  const db = getDb();
  const result = await db.collection('stok_batches').deleteOne({ _id: oid });
  if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
  await db.collection('stok_mutations').deleteMany({ batchId: oid });
  return res.json(response(null, 'Batch deleted'));
});

app.post('/api/stok/:id/keluar', verifyFirebaseToken, async (req, res) => {
  if (!isMongoConnected()) {
    const batch = stokBatches.find((x) => x._id === req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const berat = Number(req.body.berat || 0);
    if (berat <= 0) return res.status(400).json({ success: false, message: 'Berat keluar harus lebih dari 0' });
    if (berat > batch.stokTersisa) return res.status(400).json({ success: false, message: 'Stok tidak mencukupi' });

    batch.stokTersisa = Number((batch.stokTersisa - berat).toFixed(2));
    batch.status = calculateStatus(batch);
    batch.updatedAt = nowIso();

    const mutation = {
      _id: id(),
      batchId: batch._id,
      batchCode: batch.batchCode,
      tipe: 'keluar',
      berat,
      tujuan: req.body.tujuan || 'Lainnya',
      tanggal: req.body.tanggal || today(),
      catatan: req.body.catatan || '',
      createdAt: nowIso(),
    };
    stokMutations.unshift(mutation);
    return res.json(response({ batch, mutation }, 'Stock out recorded'));
  }

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(404).json({ success: false, message: 'Batch not found' });
  const db = getDb();
  const batch = await db.collection('stok_batches').findOne({ _id: oid });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  const berat = Number(req.body.berat || 0);
  if (berat <= 0) return res.status(400).json({ success: false, message: 'Berat keluar harus lebih dari 0' });
  if (berat > batch.stokTersisa) return res.status(400).json({ success: false, message: 'Stok tidak mencukupi' });

  const updatedBatch = {
    ...batch,
    stokTersisa: Number((batch.stokTersisa - berat).toFixed(2)),
    updatedAt: nowIso(),
  };
  updatedBatch.status = calculateStatus(updatedBatch);

  await db.collection('stok_batches').updateOne({ _id: oid }, { $set: updatedBatch });

  const mutationDoc = {
    batchId: oid,
    batchCode: updatedBatch.batchCode,
    tipe: 'keluar',
    berat,
    tujuan: req.body.tujuan || 'Lainnya',
    tanggal: req.body.tanggal || today(),
    catatan: req.body.catatan || '',
    createdAt: nowIso(),
  };
  const insertResult = await db.collection('stok_mutations').insertOne(mutationDoc);

  return res.json(
    response(
      {
        batch: mapDoc(updatedBatch),
        mutation: { ...mutationDoc, _id: insertResult.insertedId.toString(), batchId: oid.toString() },
      },
      'Stock out recorded'
    )
  );
});

async function bootstrap() {
  const mongoState = await connectMongo().catch((err) => ({ connected: false, reason: err.message }));
  const firebaseReady = initFirebaseAdmin();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[arina-backend] running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[arina-backend] mongodb: ${mongoState.connected ? 'connected' : `disabled (${mongoState.reason})`}`);
    // eslint-disable-next-line no-console
    console.log(`[arina-backend] firebase admin: ${firebaseReady ? 'configured' : 'not configured'}`);
    // eslint-disable-next-line no-console
    console.log(`[arina-backend] gemini: ${process.env.GEMINI_API_KEY ? 'enabled' : 'disabled'}`);
  });
}

bootstrap();
