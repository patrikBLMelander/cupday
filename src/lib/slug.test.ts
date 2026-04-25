import { describe, expect, it } from 'vitest';

import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('strips diacritics, lowercases, and replaces non-alphanumerics with hyphens', () => {
    expect(slugify('Åländska Cupen 2026')).toBe('alandska-cupen-2026');
    expect(slugify('IFK Norrköping U9')).toBe('ifk-norrkoping-u9');
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
  });

  it('is idempotent for already-slug-shaped inputs', () => {
    expect(slugify('hello-world')).toBe('hello-world');
    expect(slugify(slugify('Foo Bar'))).toBe(slugify('Foo Bar'));
  });
});
