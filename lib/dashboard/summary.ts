import type { NewsArticle } from '@/lib/types/news';

export interface DashboardSummaryTransaction {
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  projectId?: string | null;
  tanggal: string;
}

export interface DashboardTrendPoint {
  bulan: string;
  pendapatan: number;
  pengeluaran: number;
}

export interface DashboardCategoryPoint {
  kategori: string;
  jumlah: number;
}

export interface DashboardFinanceProjectOption {
  id: string;
  name: string;
  commodity: string;
  seasonLabel: string;
  status: 'draft' | 'active' | 'archived';
}

export interface DashboardProjectPerformancePoint {
  projectId: string | null;
  projectName: string;
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
}

export interface DashboardFinanceScope {
  selectedProjectId: string | null;
  selectedProjectName: string;
  projects: DashboardFinanceProjectOption[];
  projectPerformance: DashboardProjectPerformancePoint[];
}

export interface DashboardKpi {
  totalPengeluaran: number;
  labaBersih: number;
  expTrend: number;
  profitTrend: number;
}

export interface DashboardPricePoint {
  date: string;
  price: number;
}

export interface DashboardPriceKpi {
  todayPrice: number | null;
  yesterdayPrice: number | null;
  priceDelta: number | null;
  priceDeltaPct: string | null;
  isTrendingUp: boolean | null;
}

export interface DashboardWeatherWarningLike {
  event: string;
  headline?: string | null;
  description?: string | null;
  affectedAreas?: string[] | null;
}

export interface DashboardForecastDayLike {
  date: string;
  totalRainfallMm: number;
}

export interface DashboardWeatherCurrentLike {
  temperatureC: number;
  condition: string;
  humidityPercent: number;
}

export interface DashboardForecastLike<TCurrent extends DashboardWeatherCurrentLike = DashboardWeatherCurrentLike> {
  current: TCurrent;
  days: DashboardForecastDayLike[];
}

export interface DashboardSummary {
  generatedAt: string;
  kpi: DashboardKpi;
  trend: DashboardTrendPoint[];
  category: DashboardCategoryPoint[];
  financeScope: DashboardFinanceScope;
  price: DashboardPriceKpi;
  weather: {
    currentWeather: DashboardWeatherCurrentLike | null;
    weatherBannerMessage?: string;
  };
  news: {
    articles: NewsArticle[];
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const UNASSIGNED_PROJECT_LABEL = 'Tanpa Project';
const UNASSIGNED_PROJECT_KEY = '__unassigned__';

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function dateOnly(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  };
}

export function getDashboardDateWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = addMonths(year, month, -5);
  const end = new Date(Date.UTC(year, month + 1, 0));

  return {
    from: dateOnly(start.year, start.month, 1),
    to: end.toISOString().slice(0, 10),
  };
}

function calcTrend(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildDashboardMetrics(transactions: DashboardSummaryTransaction[], now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentMonthKey = monthKey(year, month);
  const previous = addMonths(year, month, -1);
  const previousMonthKey = monthKey(previous.year, previous.month);
  const trendMap = new Map<string, DashboardTrendPoint>();

  for (let i = 5; i >= 0; i -= 1) {
    const item = addMonths(year, month, -i);
    trendMap.set(monthKey(item.year, item.month), {
      bulan: MONTH_LABELS[item.month],
      pendapatan: 0,
      pengeluaran: 0,
    });
  }

  const currentKpi = { income: 0, expense: 0 };
  const previousKpi = { income: 0, expense: 0 };
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    const key = transaction.tanggal.slice(0, 7);
    const trend = trendMap.get(key);

    if (trend) {
      if (transaction.jenis === 'pendapatan') trend.pendapatan += transaction.nominal;
      if (transaction.jenis === 'pengeluaran') trend.pengeluaran += transaction.nominal;
    }

    if (key === currentMonthKey) {
      if (transaction.jenis === 'pendapatan') currentKpi.income += transaction.nominal;
      if (transaction.jenis === 'pengeluaran') {
        currentKpi.expense += transaction.nominal;
        categoryMap.set(transaction.kategori, (categoryMap.get(transaction.kategori) || 0) + transaction.nominal);
      }
    }

    if (key === previousMonthKey) {
      if (transaction.jenis === 'pendapatan') previousKpi.income += transaction.nominal;
      if (transaction.jenis === 'pengeluaran') previousKpi.expense += transaction.nominal;
    }
  }

  const labaBersih = currentKpi.income - currentKpi.expense;
  const previousProfit = previousKpi.income - previousKpi.expense;

  return {
    kpi: {
      totalPengeluaran: currentKpi.expense,
      labaBersih,
      expTrend: calcTrend(currentKpi.expense, previousKpi.expense),
      profitTrend: calcTrend(labaBersih, previousProfit),
    },
    trend: Array.from(trendMap.values()),
    category: Array.from(categoryMap.entries())
      .map(([kategori, jumlah]) => ({ kategori, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5),
  };
}

export function buildDashboardProjectPerformance({
  transactions,
  projects,
  now = new Date(),
}: {
  transactions: DashboardSummaryTransaction[];
  projects: DashboardFinanceProjectOption[];
  now?: Date;
}): DashboardProjectPerformancePoint[] {
  const currentMonthKey = monthKey(now.getUTCFullYear(), now.getUTCMonth());
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const performanceMap = new Map<string, DashboardProjectPerformancePoint>();

  const ensureRow = (projectId: string | null) => {
    const key = projectId ?? UNASSIGNED_PROJECT_KEY;
    const existing = performanceMap.get(key);
    if (existing) return existing;

    const row: DashboardProjectPerformancePoint = {
      projectId,
      projectName: projectId ? projectNames.get(projectId) ?? 'Project Tidak Dikenal' : UNASSIGNED_PROJECT_LABEL,
      income: 0,
      expense: 0,
      profit: 0,
      transactionCount: 0,
    };
    performanceMap.set(key, row);
    return row;
  };

  for (const transaction of transactions) {
    if (transaction.tanggal.slice(0, 7) !== currentMonthKey) continue;

    const row = ensureRow(transaction.projectId ?? null);
    if (transaction.jenis === 'pendapatan') {
      row.income += transaction.nominal;
    } else {
      row.expense += transaction.nominal;
    }
    row.profit = row.income - row.expense;
    row.transactionCount += 1;
  }

  return Array.from(performanceMap.values())
    .filter((row) => row.transactionCount > 0)
    .sort((a, b) =>
      b.profit - a.profit ||
      b.income - a.income ||
      a.expense - b.expense ||
      a.projectName.localeCompare(b.projectName)
    );
}

export function buildPriceKpi(prices: DashboardPricePoint[]): DashboardPriceKpi {
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const todayPrice = sorted.at(-1)?.price ?? null;
  const yesterdayPrice = sorted.at(-2)?.price ?? null;
  const priceDelta = todayPrice !== null && yesterdayPrice !== null ? todayPrice - yesterdayPrice : null;
  const priceDeltaPct = yesterdayPrice && priceDelta !== null ? ((priceDelta / yesterdayPrice) * 100).toFixed(1) : null;

  return {
    todayPrice,
    yesterdayPrice,
    priceDelta,
    priceDeltaPct,
    isTrendingUp: priceDelta !== null ? priceDelta >= 0 : null,
  };
}

function normalizeWarningArea(value: string) {
  return value
    .toLowerCase()
    .replace(/\bkab\./g, 'kabupaten')
    .replace(/\bkec\./g, 'kecamatan')
    .replace(/\bkab\b/g, 'kabupaten')
    .replace(/\bkec\b/g, 'kecamatan')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNormalizedLocationParts(locationLabel: string) {
  return locationLabel
    .split(',')
    .map(normalizeWarningArea)
    .filter(Boolean);
}

function isLikelyProvincePart(parts: string[], index: number) {
  if (parts.length < 3 || index !== parts.length - 1) return false;
  return !/^(desa|kelurahan|kecamatan|kabupaten|kota)\b/.test(parts[index]);
}

function warningAreaMatchesLocationPart(area: string, part: string) {
  return part === area || part.endsWith(` ${area}`) || area.endsWith(` ${part}`);
}

export function warningMatchesLocation(warning: DashboardWeatherWarningLike, locationLabel?: string) {
  const affectedAreas = warning.affectedAreas?.map(normalizeWarningArea).filter(Boolean) ?? [];
  if (!locationLabel?.trim() || affectedAreas.length === 0) return false;

  const locationParts = getNormalizedLocationParts(locationLabel);
  if (locationParts.length === 0) return false;

  return affectedAreas.some((area) => locationParts.some((part, index) => {
    if (isLikelyProvincePart(locationParts, index)) return false;
    return warningAreaMatchesLocationPart(area, part);
  }));
}

export function filterWeatherWarningsByLocation<TWarning extends DashboardWeatherWarningLike>(
  warnings: TWarning[],
  locationLabel?: string
) {
  return warnings.filter((warning) => warningMatchesLocation(warning, locationLabel));
}

export function buildWeatherSignal<TCurrent extends DashboardWeatherCurrentLike>({
  warnings,
  forecast,
  locationLabel,
}: {
  warnings: DashboardWeatherWarningLike[];
  forecast: DashboardForecastLike<TCurrent> | null;
  locationLabel?: string;
}) {
  const relevantWarnings = filterWeatherWarningsByLocation(warnings, locationLabel);

  if (relevantWarnings.length > 0) {
    const topWarning = relevantWarnings[0];
    return {
      currentWeather: forecast?.current ?? null,
      weatherBannerMessage: `${topWarning.event}: ${topWarning.headline || topWarning.description || ''}`.trim(),
    };
  }

  const rainyDay = forecast?.days.find((day) => day.totalRainfallMm >= 20);
  if (rainyDay) {
    return {
      currentWeather: forecast?.current ?? null,
      weatherBannerMessage: `Prakiraan ${rainyDay.date}: potensi hujan ${rainyDay.totalRainfallMm}mm. Sesuaikan rencana lapang.`,
    };
  }

  return {
    currentWeather: forecast?.current ?? null,
    weatherBannerMessage: undefined,
  };
}
