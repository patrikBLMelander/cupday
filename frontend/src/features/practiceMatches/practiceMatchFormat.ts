import type { TFunction } from 'i18next';

import { ageKey, localDateKey } from '@/features/practiceMatches/practiceMatchFeed';
import { LEVEL_KEYS, type PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';

export function levelLabel(t: TFunction, level: number): string {
  const key = LEVEL_KEYS[level - 1] ?? LEVEL_KEYS[0];
  return t(`practice.levels.${key}`);
}

export function formatLabel(t: TFunction, playersPerSide: number): string {
  return t('practice.formatLabel', { n: playersPerSide });
}

export function matchAgeLabel(match: PracticeMatch): string {
  return ageKey(match.gender, match.birthYear);
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "Lördag 3 oktober" — capitalised weekday plus date. */
export function formatLongDate(value: string | Date, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const text = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Idag"/"Imorgon" for the two nearest days, otherwise null. */
export function relativeDayLabel(t: TFunction, dateKey: string, now: Date = new Date()): string | null {
  const today = localDateKey(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dateKey === today) return t('practice.list.today');
  if (dateKey === localDateKey(tomorrowDate)) return t('practice.list.tomorrow');
  return null;
}

/** Parses YYYY-MM-DD as a local date (not UTC). */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function mapsUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}
