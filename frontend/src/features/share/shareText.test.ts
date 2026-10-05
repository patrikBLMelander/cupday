import { beforeEach, describe, expect, it } from 'vitest';

import { buildPostedCup } from '@/features/postedCups/testFixtures';
import { buildMatch } from '@/features/practiceMatches/testFixtures';
import { cupShare, fullMessage, matchShare, whatsappUrl } from '@/features/share/shareText';
import i18n from '@/lib/i18n';

describe('shareText', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('formats a match like a group-chat post with emoji labels, notes and the booking link', () => {
    const kickoff = new Date(2026, 9, 17, 15, 0);
    const match = buildMatch({
      id: 'm-1',
      teamName: 'Älvsjö AIK Grupp 3',
      gender: 'P',
      birthYear: 2014,
      playersPerSide: 7,
      levelMin: 2,
      levelMax: 2,
      kickoffAt: kickoff.toISOString(),
      endsAt: new Date(2026, 9, 17, 16, 30).toISOString(),
      venue: 'Älvsjö IP plan 3',
      notes: 'Domare pratar vi ihop oss om.',
    });

    const message = fullMessage(matchShare(i18n.t, match, 'sv'));

    expect(message.split('\n').slice(0, 9)).toEqual([
      'Älvsjö AIK Grupp 3 söker träningsmatch.',
      '',
      '📅 Datum: Lör 17/10',
      '⏰ Tid: 15:00–16:30',
      '📍 Plats: Älvsjö IP plan 3',
      '👥 P14 · 7v7',
      '📈 Nivå: Lätt',
      '🎟️ 1 av 1 plats ledig',
      '',
    ]);
    expect(message).toContain('Domare pratar vi ihop oss om.');
    expect(message).toMatch(/Boka här: http:\/\/[^/]+\/matcher\/m-1$/);
    expect(whatsappUrl(matchShare(i18n.t, match, 'sv')).startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
  });

  it('links cups to their public page, never the admin link', () => {
    const content = cupShare(i18n.t, buildPostedCup({ slug: 'grimsta-hostcup', activeTeamCount: 1, maxTeams: 4 }), 'sv');

    expect(content.body).toContain('🏆 Cup: Grimsta Höstcup');
    expect(content.body).toContain('👥 P13, P14 · 7v7');
    expect(content.body).toContain('🎟️ 3 av 4 lagplatser kvar');
    expect(content.url).toMatch(/\/c\/grimsta-hostcup$/);
    expect(content.url).not.toContain('hantera');
  });
});
