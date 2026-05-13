/**
 * Lightweight Wikidata lookup to auto-suggest a club logo from a club name.
 * Uses two public, CORS-friendly endpoints:
 *   - wbsearchentities for keyword search
 *   - wbgetentities to fetch claims for the top candidates
 * Returns null when no candidate is a football club with a P154 (logo) claim.
 */

const SEARCH_ENDPOINT = 'https://www.wikidata.org/w/api.php';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

/** Wikidata QIDs we treat as "this entity is a football / sports club or team". */
const SPORTS_CLUB_QIDS: ReadonlySet<string> = new Set([
  'Q476028', // association football club
  'Q12973014', // football club
  'Q6979593', // football team
  'Q15944511', // sports team
  'Q4498974', // women's association football club
  'Q15634554', // sports club (covers multi-section clubs like AIK, IFK Göteborg)
  'Q4438121', // sports association
  'Q56678644', // sport organisation
]);

export type ClubLogoSuggestion = {
  entityId: string;
  label: string;
  description: string;
  logoUrl: string;
};

type SearchHit = {
  id: string;
  label?: string;
  description?: string;
};

type ClaimValue = { id?: string } | string | undefined;
type Claim = { mainsnak?: { datavalue?: { value?: ClaimValue } } };
type Entity = { claims?: Record<string, Claim[]> };

/**
 * Returns the first football-club entity matching {@code query} that has a
 * logo image in P154. Returns null on no match, no logo, or network error.
 */
export async function suggestClubLogo(
  query: string,
  signal?: AbortSignal,
): Promise<ClubLogoSuggestion | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  try {
    const candidates = await search(trimmed, signal);
    if (candidates.length === 0) return null;

    const ids = candidates.map((c) => c.id).join('|');
    const entities = await getEntities(ids, signal);

    let fallback: { candidate: SearchHit; filename: string } | null = null;
    for (const candidate of candidates) {
      const entity = entities[candidate.id];
      if (!entity) continue;
      const filename = getLogoFilename(entity);
      if (!filename) continue;
      if (isSportsClub(entity)) {
        return toSuggestion(candidate, filename, trimmed);
      }
      if (!fallback) {
        fallback = { candidate, filename };
      }
    }
    return fallback ? toSuggestion(fallback.candidate, fallback.filename, trimmed) : null;
  } catch {
    return null;
  }
}

async function search(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', query);
  url.searchParams.set('language', 'sv');
  url.searchParams.set('uselang', 'sv');
  url.searchParams.set('format', 'json');
  url.searchParams.set('type', 'item');
  url.searchParams.set('limit', '5');
  url.searchParams.set('origin', '*');
  const resp = await fetch(url.toString(), { signal });
  if (!resp.ok) return [];
  const data = (await resp.json()) as { search?: SearchHit[] };
  return data.search ?? [];
}

async function getEntities(
  ids: string,
  signal?: AbortSignal,
): Promise<Record<string, Entity>> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', ids);
  url.searchParams.set('props', 'claims');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const resp = await fetch(url.toString(), { signal });
  if (!resp.ok) return {};
  const data = (await resp.json()) as { entities?: Record<string, Entity> };
  return data.entities ?? {};
}

function isSportsClub(entity: Entity): boolean {
  const p31 = entity.claims?.P31 ?? [];
  for (const claim of p31) {
    const value = claim.mainsnak?.datavalue?.value;
    if (value && typeof value === 'object' && typeof value.id === 'string') {
      if (SPORTS_CLUB_QIDS.has(value.id)) return true;
    }
  }
  return false;
}

function toSuggestion(
  candidate: SearchHit,
  filename: string,
  fallbackLabel: string,
): ClubLogoSuggestion {
  return {
    entityId: candidate.id,
    label: candidate.label ?? fallbackLabel,
    description: candidate.description ?? '',
    logoUrl: `${COMMONS_FILEPATH}/${encodeURIComponent(filename)}?width=200`,
  };
}

function getLogoFilename(entity: Entity): string | null {
  const p154 = entity.claims?.P154 ?? [];
  for (const claim of p154) {
    const value = claim.mainsnak?.datavalue?.value;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}
