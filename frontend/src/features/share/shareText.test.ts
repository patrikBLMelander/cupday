import { beforeEach, describe, expect, it } from 'vitest';

import { buildPostedCup } from '@/features/postedCups/testFixtures';
import { buildMatch } from '@/features/practiceMatches/testFixtures';
import { cupShare, matchShare, whatsappUrl } from '@/features/share/shareText';
import i18n from '@/lib/i18n';

describe('shareText', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('builds a WhatsApp message for a match with level, slots and the public link', () => {
    const match = buildMatch({ id: 'm-1', teamName: 'Ekens IF F11', gender: 'F', birthYear: 2015, levelMin: 2, levelMax: 3, opponentSlots: 2, freeSlots: 1 });

    const content = matchShare(i18n.t, match, 'sv');
    const url = whatsappUrl(content);
    expect(url.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
    const message = decodeURIComponent(url.replace('https://api.whatsapp.com/send?text=', ''));

    expect(message).toContain('Ekens IF F11 söker motstånd!');
    expect(message).toContain('Plats: Grimsta IP');
    expect(message).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(message).toContain('F15 · 7v7 · Lätt–Lätt+');
    expect(message).toContain('1 av 2 platser lediga');
    expect(message).toMatch(/Boka här: http:\/\/[^/]+\/matcher\/m-1$/);
  });

  it('links cups to their public page, never the admin link', () => {
    const content = cupShare(i18n.t, buildPostedCup({ slug: 'grimsta-hostcup', activeTeamCount: 1, maxTeams: 4 }), 'sv');

    expect(content.body).toContain('Cup: Grimsta Höstcup');
    expect(content.body).toContain('P13, P14 · 7v7');
    expect(content.body).toContain('3 av 4 lagplatser kvar');
    expect(content.url).toMatch(/\/c\/grimsta-hostcup$/);
    expect(content.url).not.toContain('hantera');
  });
});
