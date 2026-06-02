import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeatherBanner from '@/components/dashboard/WeatherBanner';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    if (key === 'title') return 'Peringatan Cuaca';
    if (key === 'defaultMessage') return 'Hujan lebat 2 hari ke depan. Tunda pemupukan dan penyemprotan pestisida.';
    return key;
  },
}));

describe('WeatherBanner', () => {
  it('renders BMKG message when provided', () => {
    render(<WeatherBanner message="Angin Kencang: Waspada Dau" />);

    expect(screen.getByText('Peringatan Cuaca')).toBeInTheDocument();
    expect(screen.getByText('Angin Kencang: Waspada Dau')).toBeInTheDocument();
  });

  it('does not render the old static mock warning without a server message', () => {
    const { container } = render(<WeatherBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Hujan lebat 2 hari ke depan/i)).not.toBeInTheDocument();
  });
});
