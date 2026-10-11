/** English-only formatting for PDF/Excel exports. */

export const EXPORT_LOCALE = 'en-GB';
export const EXPORT_LOGO = 'assets/icon/PNG/Hourforge-Wortmarke.png';
export const EXPORT_BRAND = 'Hourforge';

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Accepts ISO dates or clock strings like "22:00" / "00:30". */
export function parseClock(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const s = String(value).trim();
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (clock) {
    return new Date(1970, 0, 1, Number(clock[1]), Number(clock[2]), Number(clock[3] || 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatExportTime(value: string | Date | null | undefined): string {
  const d = parseClock(value);
  if (!d) return '';
  return d.toLocaleTimeString(EXPORT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatExportPause(value: string | Date | null | undefined): string {
  const d = parseClock(value);
  if (!d) return '0h 0m';
  return `${d.getHours()}h ${d.getMinutes()}m`;
}

export function formatExportDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(EXPORT_LOCALE, {
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  });
}

export function formatExportWeekday(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(EXPORT_LOCALE, { weekday: 'long' });
}

export function formatExportDuration(duration: string | null | undefined): string {
  if (!duration) return '0h 0m';
  const cleaned = String(duration).replace(/[^\d:.]/g, '');
  const [h = '0', m = '0'] = cleaned.split(':');
  const hours = Number.parseInt(h, 10);
  const minutes = Number.parseInt(m, 10);
  return `${Number.isFinite(hours) ? hours : 0}h ${Number.isFinite(minutes) ? minutes : 0}m`;
}

/** "März 2026" / "mars 2026" → "March 2026" for English filenames. */
export function toEnglishMonthLabel(monthYear: string): string {
  const parts = String(monthYear || '').trim().split(/\s+/);
  if (parts.length < 2) return monthYear;
  const [monthName, year] = parts;
  const idx = monthNameToIndex(monthName);
  if (idx < 0) return monthYear;
  return `${MONTHS_EN[idx]} ${year}`;
}

export function monthNameToIndex(monthName: string): number {
  const lower = monthName.toLowerCase();
  const en = MONTHS_EN.map((m) => m.toLowerCase());
  const de = [
    'januar',
    'februar',
    'märz',
    'april',
    'mai',
    'juni',
    'juli',
    'august',
    'september',
    'oktober',
    'november',
    'dezember',
  ];
  const fr = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];
  let idx = en.indexOf(lower);
  if (idx === -1) idx = de.indexOf(lower);
  if (idx === -1) idx = fr.indexOf(lower);
  return idx;
}
