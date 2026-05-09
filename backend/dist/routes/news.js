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
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const router = (0, express_1.Router)();
// ─── GET /api/news ────────────────────────────────────────────────
// Query params: ?limit=10&page=1
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 10, 50); // cap at 50
        const page = Math.max(Number(req.query.page) || 1, 1);
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, error, count } = await supabase_1.supabaseAdmin
            .from('news_articles')
            .select('*', { count: 'exact' })
            .order('pub_date', { ascending: false })
            .range(from, to);
        if (error) {
            console.error('[news route] Supabase error:', error.message);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data berita' });
        }
        return res.json({
            success: true,
            data: data || [],
            total: count || 0,
            page,
            limit,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[news route] Error:', message);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});
// ─── POST /api/news/trigger ───────────────────────────────────────
// Manual trigger for immediate fetch (dev/testing)
router.post('/trigger', async (_req, res) => {
    try {
        // Lazy import to avoid circular deps at startup
        const { startNewsScheduler } = await Promise.resolve().then(() => __importStar(require('../services/newsScheduler')));
        void startNewsScheduler;
        return res.json({ success: true, message: 'Fetch berita dipicu secara manual' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ success: false, message });
    }
});
exports.default = router;
