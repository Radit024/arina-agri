import { generateNotificationDecisionMessage } from '@/lib/server/ai/gemini';
import type { BmkgWeatherWarning } from '@/lib/server/weather/bmkgTypes';

export type NotificationPlatform = 'whatsapp' | 'telegram';

export interface WeatherSnapshotInput {
  kondisi: string;
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  lokasi?: string;
}

export interface DailyAgendaItem {
  title: string;
  time?: string;
  category?: string;
  note?: string;
}

export interface DecisionMetadataInput {
  source?: string;
  customMessage?: string;
  locale?: 'id' | 'en';
  forecastWindowHours?: number;
  dailyEvents?: DailyAgendaItem[];
  forceSend?: boolean;
  bmkgWarnings?: BmkgWeatherWarning[];
}

export interface NotificationDecisionInput {
  platform: NotificationPlatform;
  to: string;
  recipientName?: string;
  notificationsEnabled?: boolean;
  weather: WeatherSnapshotInput;
  metadata?: DecisionMetadataInput;
}

export interface TriggeredRule {
  code: string;
  reason: string;
  weight: number;
}

export interface NotificationDecisionResult {
  decisionId: string;
  shouldSend: boolean;
  riskScore: number;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  triggeredRules: TriggeredRule[];
  recommendations: string[];
  reason: string;
  draftMessage: string;
  finalMessage: string;
  payload: {
    platform: NotificationPlatform;
    to: string;
    message: string;
    metadata: Record<string, unknown>;
  };
}

function normalizeWeatherSnapshot(weather: WeatherSnapshotInput): WeatherSnapshotInput {
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

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return digits;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function evaluateRules(weather: WeatherSnapshotInput, bmkgWarnings?: BmkgWeatherWarning[]): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const kondisi = weather.kondisi.toLowerCase();

  if (weather.curahHujan >= RAIN_HEAVY_MM) {
    rules.push({
      code: 'HEAVY_RAIN',
      reason: `Curah hujan ${weather.curahHujan}mm >= ${RAIN_HEAVY_MM}mm`,
      weight: 40,
    });
  } else if ((kondisi === 'hujan' || kondisi === 'gerimis') && weather.curahHujan >= 10) {
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

  const activeWarnings = (bmkgWarnings || []).filter((warning) => {
    if (!warning.expires) return true;
    const expiresAt = Date.parse(warning.expires);
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt > Date.now();
  });
  if (activeWarnings.length > 0) {
    const severeWarning = activeWarnings.find((warning) => {
      const severity = (warning.severity || '').toLowerCase();
      return severity === 'severe' || severity === 'extreme';
    });

    if (severeWarning) {
      rules.push({
        code: 'BMKG_WARNING_SEVERE',
        reason: severeWarning.headline || severeWarning.description || severeWarning.event,
        weight: 55,
      });
    } else {
      const firstWarning = activeWarnings[0];
      rules.push({
        code: 'BMKG_WARNING_ACTIVE',
        reason: firstWarning.headline || firstWarning.description || firstWarning.event,
        weight: 35,
      });
    }
  }

  return rules;
}

function riskLevelFromScore(score: number): 'rendah' | 'sedang' | 'tinggi' | 'ekstrem' {
  if (score >= 80) return 'ekstrem';
  if (score >= 55) return 'tinggi';
  if (score >= 30) return 'sedang';
  return 'rendah';
}

function buildRecommendations(triggeredRules: TriggeredRule[]): string[] {
  const recommendations: string[] = [];
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

  if (codes.has('BMKG_WARNING_SEVERE') || codes.has('BMKG_WARNING_ACTIVE')) {
    recommendations.push('Pantau peringatan dini BMKG dan tunda aktivitas lapang berisiko sampai kondisi aman.');
    recommendations.push('Amankan stok panen, alat, dan jalur distribusi dari hujan lebat atau angin kencang.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Kondisi relatif aman, lanjutkan monitoring cuaca rutin.');
  }

  return recommendations.slice(0, 3);
}

function buildDraftMessage({
  recipientName,
  weather,
  riskLevel,
  riskScore,
  recommendations,
  triggeredRules,
  customMessage,
  dailyEvents,
  bmkgWarnings,
}: {
  recipientName: string;
  weather: WeatherSnapshotInput;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  riskScore: number;
  recommendations: string[];
  triggeredRules: TriggeredRule[];
  customMessage?: string;
  dailyEvents?: DailyAgendaItem[];
  bmkgWarnings?: BmkgWeatherWarning[];
}) {
  const intro = customMessage?.trim();

  const header = 'Arina Agri - Ringkasan Cuaca Harian';
  const greeting = `Halo ${recipientName}, berikut ringkasan cuaca hari ini.`;
  const locationLine = `Lokasi: ${weather.lokasi || 'Kebun Anda'}`;
  const weatherLine = `Cuaca: ${weather.kondisi}, Suhu ${weather.suhu}C, Hujan ${weather.curahHujan}mm, Angin ${weather.kecepatanAngin} km/j.`;
  const triggerLine = triggeredRules.length > 0
    ? `Risiko: ${riskLevel.toUpperCase()} (${riskScore}/100). Pemicu: ${triggeredRules.map((r) => r.code).join(', ')}.`
    : `Risiko: ${riskLevel.toUpperCase()} (${riskScore}/100). Pemicu: monitoring rutin.`;
  const warnings = (bmkgWarnings || [])
    .map((warning) => warning.headline || warning.description || warning.event)
    .filter(Boolean);
  const warningLine = warnings.length > 0 ? `Peringatan dini BMKG: ${warnings.join(' | ')}` : '';
  const actionLines = recommendations.map((item, i) => `${i + 1}) ${item}`).join('\n');
  const actionBlock = `Aksi disarankan:\n${actionLines}`;

  const agendaSection = dailyEvents ? buildAgendaSection(dailyEvents) : '';
  return [intro, header, greeting, locationLine, weatherLine, triggerLine, warningLine, actionBlock, agendaSection]
    .filter(Boolean)
    .join('\n');
}

function formatAgendaCategory(value?: string) {
  if (!value) return '';
  const cleaned = value.replace(/_/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAgendaSection(events: DailyAgendaItem[]) {
  const header = 'Agenda hari ini:';
  if (!events.length) {
    return `${header}\n- Belum ada kegiatan terjadwal.`;
  }

  const lines = events.map((event) => {
    const timeLabel = event.time ? `${event.time} - ` : '';
    const categoryLabel = formatAgendaCategory(event.category);
    const categorySuffix = categoryLabel ? ` (${categoryLabel})` : '';
    return `- ${timeLabel}${event.title}${categorySuffix}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

export async function buildNotificationDecision(input: NotificationDecisionInput): Promise<NotificationDecisionResult> {
  const decisionId = makeDecisionId();
  const recipientName = input.recipientName || 'Petani';
  const weather = normalizeWeatherSnapshot(input.weather);
  const bmkgWarnings = input.metadata?.bmkgWarnings;
  const triggeredRules = evaluateRules(weather, bmkgWarnings);
  const score = Math.min(100, triggeredRules.reduce((sum, rule) => sum + rule.weight, 0));
  const riskScore = Math.max(score, 0);
  const riskLevel = riskLevelFromScore(riskScore);
  const recommendations = buildRecommendations(triggeredRules);
  const isTestRequest = input.metadata?.source === 'weather-dashboard-test-button';

  const notificationsEnabled = input.notificationsEnabled !== false;
  const forceSend = input.metadata?.forceSend === true;
  const shouldSend = notificationsEnabled && (isTestRequest || forceSend || riskScore >= 30 || Boolean(input.metadata?.customMessage));

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
    dailyEvents: input.metadata?.dailyEvents,
    bmkgWarnings,
  });

  let finalMessage = draftMessage;
  if (shouldSend) {
    try {
      finalMessage = await generateNotificationDecisionMessage({
        farmerName: recipientName,
        location: weather.lokasi,
        riskLevel,
        riskScore,
        triggeredRules: triggeredRules.map((rule) => `${rule.code}: ${rule.reason}`),
        recommendedActions: recommendations,
        weatherSummary: `kondisi=${weather.kondisi}, suhu=${weather.suhu}C, kelembapan=${weather.kelembapan}%, hujan=${weather.curahHujan}mm, angin=${weather.kecepatanAngin}km/j`,
        draftMessage,
      });
    } catch {
      finalMessage = draftMessage;
    }
  }

  if (input.metadata?.dailyEvents) {
    const agendaSection = buildAgendaSection(input.metadata.dailyEvents);
    if (!finalMessage.includes('Agenda hari ini')) {
      finalMessage = `${finalMessage}\n${agendaSection}`;
    }
  }

  const to = input.platform === 'whatsapp' ? normalizeWhatsAppNumber(input.to) : input.to;

  const metadata: Record<string, unknown> = {
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
    dailyEvents: input.metadata?.dailyEvents,
    bmkgWarnings: input.metadata?.bmkgWarnings,
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
