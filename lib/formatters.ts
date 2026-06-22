// Format currency to Indonesian Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const ISO_DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_INPUT_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

function parseDateValue(date: Date | string): Date {
  if (date instanceof Date) return date;

  const dateOnlyMatch = ISO_DATE_INPUT_RE.exec(date);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const displayDateOnlyMatch = DISPLAY_DATE_INPUT_RE.exec(date);
  if (displayDateOnlyMatch) {
    const [, day, month, year] = displayDateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(date);
}

function isRealDateParts(year: number, month: number, day: number): boolean {
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isValidParsedDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function formatDateInputValue(value: string): string {
  const match = ISO_DATE_INPUT_RE.exec(value.trim());
  if (!match) return value;

  const [, year, month, day] = match;
  if (!isRealDateParts(Number(year), Number(month), Number(day))) return value;
  return `${day}-${month}-${year}`;
}

export function normalizeDateInputValue(value: string): string {
  const trimmed = value.trim();
  const displayMatch = DISPLAY_DATE_INPUT_RE.exec(trimmed);
  if (!displayMatch) return trimmed;

  const [, day, month, year] = displayMatch;
  if (!isRealDateParts(Number(year), Number(month), Number(day))) return trimmed;
  return `${year}-${month}-${day}`;
}

export function isValidDateInputValue(value: string): boolean {
  const trimmed = value.trim();
  const isoMatch = ISO_DATE_INPUT_RE.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isRealDateParts(Number(year), Number(month), Number(day));
  }

  const displayMatch = DISPLAY_DATE_INPUT_RE.exec(trimmed);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    return isRealDateParts(Number(year), Number(month), Number(day));
  }

  return false;
}

// Format date to long Indonesian format: "12 April 2026"
export function formatDateLong(date: Date | string): string {
  const d = parseDateValue(date);
  if (!isValidParsedDate(d)) return typeof date === 'string' ? date : '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// Format date to short Indonesian format: "12 Apr 2026"
export function formatDateShort(date: Date | string): string {
  const d = parseDateValue(date);
  if (!isValidParsedDate(d)) return typeof date === 'string' ? date : '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Format month key to Indonesian month and year: "April 2026"
export function formatMonthYear(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;

  const [, year, month] = match;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// Format date for calendar display: "Senin, 12 April"
export function formatDateCalendar(date: Date | string): string {
  const d = parseDateValue(date);
  if (!isValidParsedDate(d)) return typeof date === 'string' ? date : '';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}
