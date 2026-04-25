import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePlaceholder from '@/HomePlaceholder';
import '@/lib/i18n';

describe('HomePlaceholder', () => {
  it('renders the app title', () => {
    render(<HomePlaceholder />);
    expect(screen.getByRole('heading', { name: /cup/i })).toBeInTheDocument();
  });
});
