"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMutation = exports.HarvestBatch = exports.Transaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const transactionSchema = new mongoose_1.Schema({
    jenis: { type: String, enum: ['pengeluaran', 'pendapatan'], required: true },
    kategori: { type: String, required: true },
    nominal: { type: Number, required: true, min: 0 },
    tanggal: { type: String, required: true },
    keterangan: { type: String, default: '' },
}, { timestamps: true });
exports.Transaction = mongoose_1.default.model('Transaction', transactionSchema);
const harvestBatchSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
exports.HarvestBatch = mongoose_1.default.model('HarvestBatch', harvestBatchSchema);
const stockMutationSchema = new mongoose_1.Schema({
    batchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'HarvestBatch', required: true },
    batchCode: { type: String, required: true },
    tipe: { type: String, enum: ['masuk', 'keluar'], required: true },
    berat: { type: Number, required: true, min: 0.01 },
    tujuan: { type: String },
    tanggal: { type: String, required: true },
    catatan: { type: String, default: '' },
}, { timestamps: true });
exports.StockMutation = mongoose_1.default.model('StockMutation', stockMutationSchema);
