import type { TFunction } from 'i18next';

import type { Cup } from '@/features/cups/cupTypes';
import { formatCupTimes, formatDateSpan } from '@/features/postedCups/postedCupFormat';
import {
  formatLabel,
  formatLongDate,
  formatTimeRange,
  levelRangeLabel,
  matchAgeLabel,
} from '@/features/practiceMatches/practiceMatchFormat';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';

export interface ShareContent {
  title: string;
  /** Message without the link — the link is appended per channel. */
  body: string;
  /** Call to action placed before the link, e.g. "Boka här". */
  cta: string;
  url: string;
}

export function publicUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/** Ready-to-post text for a practice match, e.g. for a team's WhatsApp group. */
export function matchShare(t: TFunction, match: PracticeMatch, locale: string): ShareContent {
  const slots =
    match.freeSlots === 0 ? t('practice.fullyBooked') : t('practice.slotsFree', { free: match.freeSlots, count: match.opponentSlots });
  return {
    title: t('share.matchHeadline', { team: match.teamName }),
    body: [
      t('share.matchHeadline', { team: match.teamName }),
      `${matchAgeLabel(match)} · ${formatLabel(t, match.playersPerSide)} · ${levelRangeLabel(t, match.levelMin, match.levelMax)}`,
      `${t('share.when')}: ${formatLongDate(match.kickoffAt, locale)} ${formatTimeRange(match.kickoffAt, match.endsAt, locale)}`,
      `${t('share.where')}: ${match.venue}`,
      slots,
    ].join('\n'),
    cta: t('share.matchCta'),
    url: publicUrl(`/matcher/${match.id}`),
  };
}

/** Ready-to-post text for a cup. */
export function cupShare(t: TFunction, cup: Cup, locale: string): ShareContent {
  const remaining = Math.max(0, cup.maxTeams - cup.activeTeamCount);
  const times = formatCupTimes(cup.startTime, cup.endTime);
  const details = [(cup.ageClasses ?? []).join(', '), t('practice.formatLabel', { n: cup.playersPerTeam })].filter(Boolean);
  return {
    title: t('share.cupHeadline', { name: cup.name }),
    body: [
      t('share.cupHeadline', { name: cup.name }),
      `${t('share.dates')}: ${formatDateSpan(cup.startDate, cup.endDate, locale)}${times ? ` · ${times}` : ''}`,
      details.join(' · '),
      `${t('share.where')}: ${cup.venueName}`,
      remaining === 0 ? t('postedCup.feed.full') : t('postedCup.feed.spotsLeft', { remaining, max: cup.maxTeams }),
    ].join('\n'),
    cta: t('share.cupCta'),
    url: publicUrl(`/c/${cup.slug}`),
  };
}

export function fullMessage(content: ShareContent): string {
  return `${content.body}\n\n${content.cta}: ${content.url}`;
}

/**
 * Opens WhatsApp (app or web) with the message prefilled; the user picks the chat. Uses
 * api.whatsapp.com rather than wa.me, whose redirect garbles special characters on some clients,
 * and the message itself avoids emoji for the same reason.
 */
export function whatsappUrl(content: ShareContent): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage(content))}`;
}
