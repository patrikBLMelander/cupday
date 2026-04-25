import { describe, expect, it } from 'vitest';

import { hexToHslChannels, hslChannelsToHex } from '@/lib/color';

function rgbChannels(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

describe('color helpers', () => {
  // HSL channels are stored as integers, so the hex → HSL → hex round-trip
  // is inherently lossy by ~1 unit per RGB channel. This is fine for color
  // pickers — users perceive these as the same color.
  it('round-trips hex through HSL channels within a small tolerance', () => {
    const samples = ['#1d4ed8', '#f1f5f9', '#ffffff', '#000000', '#22c55e'];
    for (const hex of samples) {
      const channels = hexToHslChannels(hex);
      const back = hslChannelsToHex(channels);
      const [r1, g1, b1] = rgbChannels(hex);
      const [r2, g2, b2] = rgbChannels(back);
      expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(2);
      expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(2);
      expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(2);
    }
  });
});
