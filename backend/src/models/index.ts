import mongoose, { Schema, Document } from 'mongoose';

// ─── Transaction ──────────────────────────────────────────────────
export interface ITransaction extends Document {
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    jenis: { type: String, enum: ['pengeluaran', 'pendapatan'], required: true },
    kategori: { type: String, required: true },
    nominal: { type: Number, required: true, min: 0 },
    tanggal: { type: String, required: true },
    keterangan: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

// ─── Harvest Stock (Stok Panen) ──────────────────────────────────
export interface IHarvestBatch extends Document {
  batchCode: string;
  tanggalPanen: string;
  grade: 'A' | 'B' | 'C';
  beratMasuk: number;      // kg
  stokTersisa: number;     // kg
  hargaModal: number;      // Rp/kg
  hargaJual: number;       // Rp/kg
  lokasiPenyimpanan: 'Gudang Utama' | 'Gudang Cadangan';
  estimasiKadaluarsa: string;
  catatan: string;
  status: 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
  createdAt: Date;
  updatedAt: Date;
}

const harvestBatchSchema = new Schema<IHarvestBatch>(
  {
    batchCode: { type: String, required: true, unique: true },
    tanggalPanen: { type: String, required: true },
    grade: { type: String, enum: ['A', 'B', 'C'], required: true },
    beratMasuk: { type: Number, required: true, min: 0 },
    stokTersisa: { type: Number, required: true, min: 0 },
    hargaModal: { type: Number, required: true, min: 0 },
    hargaJual: { type: Number, required: true, min: 0 },
    lokasiPenyimpanan: {
      type: String,
      enum: ['Gudang Utama', 'Gudang Cadangan'],
      default: 'Gudang Utama',
    },
    estimasiKadaluarsa: { type: String, required: true },
    catatan: { type: String, default: '' },
    status: {
      type: String,
      enum: ['aman', 'menipis', 'hampir_kadaluarsa', 'habis'],
      default: 'aman',
    },
  },
  { timestamps: true }
);

export const HarvestBatch = mongoose.model<IHarvestBatch>('HarvestBatch', harvestBatchSchema);

// ─── Stock Mutation (Riwayat Mutasi Stok) ─────────────────────────
export interface IStockMutation extends Document {
  batchId: mongoose.Types.ObjectId;
  batchCode: string;
  tipe: 'masuk' | 'keluar';
  berat: number;           // kg
  tujuan?: string;         // For 'keluar': Pasar Lokal / Distributor / Restoran / Lainnya
  tanggal: string;
  catatan: string;
  createdAt: Date;
}

const stockMutationSchema = new Schema<IStockMutation>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'HarvestBatch', required: true },
    batchCode: { type: String, required: true },
    tipe: { type: String, enum: ['masuk', 'keluar'], required: true },
    berat: { type: Number, required: true, min: 0.01 },
    tujuan: { type: String },
    tanggal: { type: String, required: true },
    catatan: { type: String, default: '' },
  },
  { timestamps: true }
);

export const StockMutation = mongoose.model<IStockMutation>('StockMutation', stockMutationSchema);

// ─── Calendar Event ──────────────────────────────────────────────
export interface ICalendarEvent extends Document {
  title: string;
  date: string;
  category: 'tanam' | 'pupuk' | 'panen' | 'obat' | 'lainnya';
  description: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true },
    date: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['tanam', 'pupuk', 'panen', 'obat', 'lainnya'], 
      default: 'lainnya' 
    },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema);
