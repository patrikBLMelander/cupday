import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function useCountdown(target: Date): CountdownParts {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

/**
 * Big 4-box countdown for hero sections. Renders zero-padded values and
 * updates every second. Designed to sit on a dark background (uses
 * {@code text-white} and a translucent backdrop on each box).
 */
export function Countdown({
  target,
  label,
  subline,
}: {
  target: Date;
  label: string;
  subline?: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  const parts = useCountdown(target);
  const units: { value: number; label: string }[] = [
    { value: parts.days, label: t('landing.countdown.days') },
    { value: parts.hours, label: t('landing.countdown.hours') },
    { value: parts.minutes, label: t('landing.countdown.minutes') },
    { value: parts.seconds, label: t('landing.countdown.seconds') },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
        {label}
      </span>
      <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {units.map(({ value, label: unitLabel }) => (
          <li
            key={unitLabel}
            className="flex w-20 flex-col items-center rounded-lg bg-white/10 px-3 py-3 backdrop-blur-sm sm:w-24"
          >
            <span className="text-3xl font-bold tabular-nums sm:text-4xl">
              {value.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              {unitLabel}
            </span>
          </li>
        ))}
      </ul>
      {subline}
    </div>
  );
}
