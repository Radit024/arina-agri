"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNotificationDecision = buildNotificationDecision;
const gemini_1 = require("./gemini");
function normalizeWeatherSnapshot(weather) {
    return {
        kondisi: typeof weather.kondisi === 'string' ? weather.kondisi : '',
        suhu: Number.isFinite(Number(weather.suhu)) ? Number(weather.suhu) : 0,
        kelembapan: Number.isFinite(Number(weather.kelembapan)) ? Number(weather.kelembapan) : 0,
        curahHujan: Number.isFinite(Number(weather.curahHujan)) ? Number(weather.curahHujan) : 0,
        kecepatanAngin: Number.isFinite(Number(weather.kecepatanAngin)) ? Number(weather.kecepatanAngin) : 0,
        lokasi: typeof weather.lokasi === 'string' ? weather.lokasi : undefined,
    };
}
const RAIN_HEAVY_MM = Number(process.env.ALERT_HEAVY_RAIN_MM || 20);
const WIND_STRONG_KMH = Number(process.env.ALERT_STRONG_WIND_KMH || 12);
const TEMP_EXTREME_C = Number(process.env.ALERT_EXTREME_TEMP_C || 32);
const HUMIDITY_LOW_PERCENT = Number(process.env.ALERT_LOW_HUMIDITY_PERCENT || 50);
function makeDecisionId() {
    return `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeWhatsAppNumber(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits)
        return digits;
    if (digits.startsWith('62'))
        return digits;
    if (digits.startsWith('0'))
        return `62${digits.slice(1)}`;
    return digits;
}
function evaluateRules(weather) {
    const rules = [];
    const kondisi = weather.kondisi.toLowerCase();
    if (weather.curahHujan >= RAIN_HEAVY_MM) {
        rules.push({
            code: 'HEAVY_RAIN',
            reason: `Curah hujan ${weather.curahHujan}mm >= ${RAIN_HEAVY_MM}mm`,
            weight: 40,
        });
    }
    else if ((kondisi === 'hujan' || kondisi === 'gerimis') && weather.curahHujan >= 10) {
        rules.push({
            code: 'RAINY_CONDITION',
            reason: `Kondisi ${weather.kondisi} dengan curah hujan ${weather.curahHujan}mm`,
            weight: 20,
        });
    }
    if (weather.kecepatanAngin >= WIND_STRONG_KMH) {
        rules.push({
            code: 'STRONG_WIND',
            reason: `Angin ${weather.kecepatanAngin} km/j >= ${WIND_STRONG_KMH} km/j`,
            weight: 25,
        });
    }
    if (weather.suhu >= TEMP_EXTREME_C) {
        rules.push({
            code: 'EXTREME_HEAT',
            reason: `Suhu ${weather.suhu}C >= ${TEMP_EXTREME_C}C`,
            weight: 20,
        });
    }
    if (weather.kelembapan < HUMIDITY_LOW_PERCENT) {
        rules.push({
            code: 'LOW_HUMIDITY',
            reason: `Kelembapan ${weather.kelembapan}% < ${HUMIDITY_LOW_PERCENT}%`,
            weight: 15,
        });
    }
    return rules;
}
function riskLevelFromScore(score) {
    if (score >= 80)
        return 'ekstrem';
    if (score >= 55)
        return 'tinggi';
    if (score >= 30)
        return 'sedang';
    return 'rendah';
}
function buildRecommendations(triggeredRules) {
    const recommendations = [];
    const codes = new Set(triggeredRules.map((r) => r.code));
    if (codes.has('HEAVY_RAIN') || codes.has('RAINY_CONDITION')) {
        recommendations.push('Tunda penyemprotan pupuk daun dan pestisida sampai cuaca stabil.');
        recommendations.push('Pastikan saluran drainase tidak tersumbat untuk mencegah genangan.');
    }
    if (codes.has('STRONG_WIND')) {
        recommendations.push('Perkuat ajir/paranet dan ikat tanaman yang mulai rebah.');
    }
    if (codes.has('EXTREME_HEAT')) {
        recommendations.push('Lakukan penyiraman pagi/sore dan hindari pemupukan saat siang terik.');
    }
    if (codes.has('LOW_HUMIDITY')) {
        recommendations.push('Tingkatkan frekuensi cek kelembapan tanah pada zona akar.');
    }
    if (recommendations.length === 0) {
        recommendations.push('Kondisi relatif aman, lanjutkan monitoring cuaca rutin.');
    }
    return recommendations.slice(0, 3);
}
function buildDraftMessage({ recipientName, weather, riskLevel, riskScore, recommendations, triggeredRules, customMessage, }) {
    if (customMessage && customMessage.trim()) {
        return customMessage.trim();
    }
    const header = `Arina Agri - Alert Cuaca ${riskLevel.toUpperCase()} (${riskScore}/100)`;
    const weatherLine = `Lokasi: ${weather.lokasi || 'Kebun Anda'} | Kondisi: ${weather.kondisi}, Suhu ${weather.suhu}C, Hujan ${weather.curahHujan}mm, Angin ${weather.kecepatanAngin} km/j.`;
    const triggerLine = triggeredRules.length > 0
        ? `Pemicu: ${triggeredRules.map((r) => r.code).join(', ')}.`
        : 'Pemicu: monitoring rutin.';
    const actionLines = recommendations.map((item, i) => `${i + 1}. ${item}`).join(' ');
    return `${header}\nHalo ${recipientName}, ${weatherLine} ${triggerLine} Aksi disarankan: ${actionLines}`;
}
async function buildNotificationDecision(input) {
    const decisionId = makeDecisionId();
    const recipientName = input.recipientName || 'Petani';
    const weather = normalizeWeatherSnapshot(input.weather);
    const triggeredRules = evaluateRules(weather);
    const score = Math.min(100, triggeredRules.reduce((sum, rule) => sum + rule.weight, 0));
    const riskScore = Math.max(score, 0);
    const riskLevel = riskLevelFromScore(riskScore);
    const recommendations = buildRecommendations(triggeredRules);
    const isTestRequest = input.metadata?.source === 'weather-dashboard-test-button';
    const notificationsEnabled = input.notificationsEnabled !== false;
    const shouldSend = notificationsEnabled && (isTestRequest || riskScore >= 30 || Boolean(input.metadata?.customMessage));
    const reason = !notificationsEnabled
        ? 'Notifikasi dinonaktifkan oleh pengguna.'
        : shouldSend
            ? isTestRequest
                ? 'Mode uji coba aktif, notifikasi dipaksa terkirim.'
                : `Risk score ${riskScore} memenuhi ambang kirim notifikasi.`
            : `Risk score ${riskScore} di bawah ambang notifikasi (30).`;
    const draftMessage = buildDraftMessage({
        recipientName,
        weather,
        riskLevel,
        riskScore,
        recommendations,
        triggeredRules,
        customMessage: input.metadata?.customMessage,
    });
    let finalMessage = draftMessage;
    if (shouldSend) {
        try {
            finalMessage = await (0, gemini_1.generateNotificationDecisionMessage)({
                farmerName: recipientName,
                location: weather.lokasi,
                riskLevel,
                riskScore,
                triggeredRules: triggeredRules.map((rule) => `${rule.code}: ${rule.reason}`),
                recommendedActions: recommendations,
                weatherSummary: `kondisi=${weather.kondisi}, suhu=${weather.suhu}C, kelembapan=${weather.kelembapan}%, hujan=${weather.curahHujan}mm, angin=${weather.kecepatanAngin}km/j`,
                draftMessage,
            });
        }
        catch {
            finalMessage = draftMessage;
        }
    }
    const to = input.platform === 'whatsapp' ? normalizeWhatsAppNumber(input.to) : input.to;
    const metadata = {
        source: input.metadata?.source || 'weather-dashboard',
        decision: {
            decisionId,
            riskScore,
            riskLevel,
            shouldSend,
            triggeredRules,
            recommendations,
            reason,
        },
        weather: input.weather,
    };
    return {
        decisionId,
        shouldSend,
        riskScore,
        riskLevel,
        triggeredRules,
        recommendations,
        reason,
        draftMessage,
        finalMessage,
        payload: {
            platform: input.platform,
            to,
            message: finalMessage,
            metadata,
        },
    };
}
