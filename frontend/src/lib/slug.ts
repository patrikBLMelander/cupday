// Strip combining diacritical marks (U+0300–U+036F) after NFKD-normalising.
const DIACRITICS_RE = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
