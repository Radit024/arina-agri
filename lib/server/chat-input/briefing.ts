import type { SupabaseClient } from '@supabase/supabase-js';
import { getBmkgForecast, getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { weatherSnapshotFromBmkgForecast } from '@/lib/server/notifications/weatherSnapshot';
import { generateGeminiReply } from '@/lib/server/ai/gemini';

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
      const weather = weatherSnapshotFromBmkgForecast(forecast, locationLabel);
      
      const isToday = range === 'hari ini';
      // BMKG returns 3 days. If 'minggu ini', we just summarize the whole 3 days.
      weatherContextSummary = isToday 
        ? `Hari ini: Suhu ${weather.today.tempMin}-${weather.today.tempMax}C, Kondisi dominan: ${weather.today.weatherDesc}.`
        : `Prakiraan 3 hari ke depan: Suhu berkisar ${weather.today.tempMin}-${weather.today.tempMax}C, Kondisi awal: ${weather.today.weatherDesc}.`;
        
      if (warnings.warnings.length > 0) {
        weatherContextSummary += ` PERINGATAN BMKG: ${warnings.warnings.map(w => w.headline || w.event).join(', ')}.`;
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

  // 3. Ask Gemini to summarize
  const prompt = `Tolong berikan briefing cerdas untuk ${range} berdasarkan data berikut:
Cuaca: ${weatherContextSummary}
Agenda:
${agendaSummary}

Buatlah laporan padat yang mengaitkan kondisi cuaca dengan agenda, serta berikan saran ringkas.`;

  try {
    const aiReply = await generateGeminiReply({
      prompt,
      userName,
    });
    return `🌤️ *Briefing ${range === 'hari ini' ? 'Hari Ini' : 'Minggu Ini'}*\n\n${aiReply}`;
  } catch (err) {
    console.error('[buildBriefingText] AI error:', err);
    return `🌤️ *Briefing ${range === 'hari ini' ? 'Hari Ini' : 'Minggu Ini'}*\n\nCuaca: ${weatherContextSummary}\n\nAgenda:\n${agendaSummary}`;
  }
}
