import type { SupabaseClient } from '@supabase/supabase-js';
import { getBmkgForecast, getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { generateGeminiReply } from '@/lib/server/ai/gemini';
import { filterWeatherWarningsByLocation } from '@/lib/dashboard/summary';

interface BriefingForecastDay {
  minTemperatureC?: number | string;
  maxTemperatureC?: number | string;
  temperatureC?: number | string;
  dominantCondition?: string;
  condition?: string;
}

export async function buildBriefingText(
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  range: 'hari ini' | 'minggu ini',
  now: Date
): Promise<string> {
  // 1. Get user's weather_adm4 from notification_schedules
  const { data: schedules } = await supabase
    .from('notification_schedules')
    .select('weather_adm4, weather_location_label')
    .eq('user_id', userId)
    .limit(1);

  const schedule = schedules?.[0];
  const weatherAdm4 = schedule?.weather_adm4?.trim();
  const locationLabel = schedule?.weather_location_label || weatherAdm4;

  let weatherContextSummary = 'Data cuaca tidak tersedia karena lokasi belum diatur di menu Notifikasi.';
  
  if (weatherAdm4) {
    try {
      const [forecast, warnings] = await Promise.all([
        getBmkgForecast({ adm4: weatherAdm4, locationLabel }),
        getBmkgWarnings(),
      ]);
      
      const isToday = range === 'hari ini';
      const day1 = (forecast.days[0] || forecast.current) as BriefingForecastDay;
      const day3 = (forecast.days[2] || day1) as BriefingForecastDay;
      
      const tMin1 = day1.minTemperatureC ?? day1.temperatureC ?? '-';
      const tMax1 = day1.maxTemperatureC ?? day1.temperatureC ?? '-';
      const cond1 = day1.dominantCondition ?? day1.condition ?? '-';
      
      const tMax3 = day3.maxTemperatureC ?? day3.temperatureC ?? '-';
      
      weatherContextSummary = isToday 
        ? `Hari ini: Suhu ${tMin1}-${tMax1}C, Kondisi dominan: ${cond1}.`
        : `Prakiraan 3 hari ke depan: Suhu berkisar ${tMin1}-${tMax3}C, Kondisi awal: ${cond1}.`;
        
      const relevantWarnings = filterWeatherWarningsByLocation(warnings.warnings, locationLabel);
      if (relevantWarnings.length > 0) {
        weatherContextSummary += ` PERINGATAN BMKG: ${relevantWarnings.map(w => w.headline || w.event).join(', ')}.`;
      }
    } catch (err) {
      console.error('[buildBriefingText] Error fetching weather:', err);
      weatherContextSummary = 'Gagal memuat data cuaca BMKG saat ini.';
    }
  }

  // 2. Get calendar events
  const startDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const endDate = new Date(now);
  if (range === 'minggu ini') {
    endDate.setDate(endDate.getDate() + 7);
  }
  const endDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(endDate);

  const { data: events } = await supabase
    .from('calendar_events')
    .select('title,waktu,date,description')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true })
    .order('waktu', { ascending: true });

  const agendaSummary = (events && events.length > 0)
    ? events.map(e => `- ${e.date} ${e.waktu || ''}: ${e.title} ${e.description ? `(${e.description})` : ''}`).join('\n')
    : 'Tidak ada agenda terjadwal.';

function markdownToHtml(text: string): string {
  let html = text;
  // Bold
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
  // Italic (single asterisk)
  html = html.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  // Underline
  html = html.replace(/__([\s\S]*?)__/g, '<u>$1</u>');
  // Italic (single underscore, avoid matching links or inside words if possible, but basic is fine)
  html = html.replace(/(?:^|\s)_([^_]+)_(?:\s|$)/g, ' <i>$1</i> ');
  
  return html;
}

  // 3. Ask Gemini to summarize
  const prompt = `Tolong berikan briefing cerdas untuk ${range} berdasarkan data berikut:
Cuaca: ${weatherContextSummary}
Agenda:
${agendaSummary}

Buatlah laporan padat yang mengaitkan kondisi cuaca dengan agenda, serta berikan saran ringkas. Gunakan formatting teks tebal untuk hal-hal penting.`;

  try {
    const aiReply = await generateGeminiReply({
      prompt,
      userName,
    });
    return `🌤️ <b>Briefing ${range === 'hari ini' ? 'Hari Ini' : 'Minggu Ini'}</b>\n\n${markdownToHtml(aiReply)}`;
  } catch (err) {
    console.error('[buildBriefingText] AI error:', err);
    return `🌤️ <b>Briefing ${range === 'hari ini' ? 'Hari Ini' : 'Minggu Ini'}</b>\n\nCuaca: ${weatherContextSummary}\n\nAgenda:\n${agendaSummary}`;
  }
}
