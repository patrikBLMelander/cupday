import { useState } from 'react';

type Size = 'sm' | 'xs';

/**
 * Round avatar for a team — shows the logo URL if set and loads correctly,
 * otherwise falls back to the first letter of the team name on a muted
 * background. Matches the club-logo avatar pattern used on the cup hero.
 */
export function TeamAvatar({
  team,
  size = 'sm',
}: {
  team: { name: string; logoUrl: string };
  size?: Size;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(team.logoUrl) && !failed;
  const initial = team.name.trim().charAt(0).toUpperCase() || '?';
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-5 w-5 text-[9px]';

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-semibold ${dim}`}
    >
      {showImage ? (
        <img
          src={team.logoUrl}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
