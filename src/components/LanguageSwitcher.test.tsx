import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('toggles aria-pressed when switching to English', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    const en = screen.getByRole('button', { name: /english|engelska/i });
    expect(en).toHaveAttribute('aria-pressed', 'false');

    await user.click(en);
    expect(en).toHaveAttribute('aria-pressed', 'true');
  });
});
