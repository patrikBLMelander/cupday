import type { TFunction } from 'i18next';

import type { Cup } from '@/features/cups/cupTypes';
import { formatCupTimes } from '@/features/postedCups/postedCupFormat';
import {
  formatLabel,
  formatTime,
  levelRangeLabel,
  matchAgeLabel,
} from '@/features/practiceMatches/practiceMatchFormat';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';

export interface ShareContent {
  title: string;
  /** Message without the link — the link is appended with the call to action. */
  body: string;
  /** Call to action placed before the link, e.g. "Boka här". */
  cta: string;
  url: string;
}

export function publicUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/** "Lör 17/10" — the short form coaches use in group chats. */
function shortDate(value: Date, locale: string): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(value).replace('.', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${value.getDate()}/${value.getMonth() + 1}`;
}

function cupDates(cup: Cup, locale: string): string {
  const start = new Date(`${cup.startDate}T00:00:00`);
  const end = new Date(`${cup.endDate}T00:00:00`);
  return cup.startDate === cup.endDate ? shortDate(start, locale) : `${shortDate(start, locale)} – ${shortDate(end, locale)}`;
}

/**
 * Ready-to-post text for a practice match, in the familiar group-chat format:
 * headline, then one emoji-labelled line per fact, the organizer's notes and the booking link.
 */
export function matchShare(t: TFunction, match: PracticeMatch, locale: string): ShareContent {
  const slots =
    match.freeSlots === 0 ? t('practice.fullyBooked') : t('practice.slotsFree', { free: match.freeSlots, count: match.opponentSlots });
  const lines = [
    t('share.matchHeadline', { team: match.teamName }),
    '',
    `📅 ${t('share.date')}: ${shortDate(new Date(match.kickoffAt), locale)}`,
    `⏰ ${t('share.when')}: ${formatTime(match.kickoffAt, locale)}–${formatTime(match.endsAt, locale)}`,
    `📍 ${t('share.where')}: ${match.venue}`,
    `👥 ${matchAgeLabel(match)} · ${formatLabel(t, match.playersPerSide)}`,
    `📈 ${t('share.level')}: ${levelRangeLabel(t, match.levelMin, match.levelMax)}`,
    `🎟️ ${slots}`,
  ];
  if (match.costSek !== null) {
    lines.push(`💰 ${t('share.cost')}: ${match.costSek === 0 ? t('practice.detail.free') : t('practice.detail.costValue', { cost: match.costSek })}`);
  }
  if (match.notes) {
    lines.push('', match.notes);
  }
  return {
    title: t('share.matchHeadline', { team: match.teamName }),
    body: lines.join('\n'),
    cta: t('share.matchCta'),
    url: publicUrl(`/matcher/${match.id}`),
  };
}

/** Ready-to-post text for a cup in the same format. */
export function cupShare(t: TFunction, cup: Cup, locale: string): ShareContent {
  const remaining = Math.max(0, cup.maxTeams - cup.activeTeamCount);
  const times = formatCupTimes(cup.startTime, cup.endTime);
  const who = [(cup.ageClasses ?? []).join(', '), t('practice.formatLabel', { n: cup.playersPerTeam })].filter(Boolean).join(' · ');
  const lines = [`🏆 ${t('share.cupHeadline', { name: cup.name })}`, '', `📅 ${t('share.date')}: ${cupDates(cup, locale)}`];
  if (times) lines.push(`⏰ ${t('share.when')}: ${times}`);
  lines.push(`📍 ${t('share.where')}: ${cup.venueName}`, `👥 ${who}`);
  if (cup.levelMin != null && cup.levelMax != null) {
    lines.push(`📈 ${t('share.level')}: ${levelRangeLabel(t, cup.levelMin, cup.levelMax)}`);
  }
  lines.push(
    `🎟️ ${remaining === 0 ? t('postedCup.feed.full') : t('postedCup.feed.spotsLeft', { remaining, max: cup.maxTeams })}`,
    `💰 ${t('share.fee')}: ${t('postedCup.feed.fee', { fee: cup.registrationFeeSek })}`,
  );
  return {
    title: t('share.cupHeadline', { name: cup.name }),
    body: lines.join('\n'),
    cta: t('share.cupCta'),
    url: publicUrl(`/c/${cup.slug}`),
  };
}

export function fullMessage(content: ShareContent): string {
  return `${content.body}\n\n${content.cta}: ${content.url}`;
}

/**
 * Opens WhatsApp (app or web) with the message prefilled; the user picks the chat. Uses
 * api.whatsapp.com rather than wa.me, whose redirect garbles emoji on some clients.
 */
export function whatsappUrl(content: ShareContent): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage(content))}`;
}
