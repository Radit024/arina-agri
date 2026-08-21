import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldWithManageAction from '@/components/shared/forms/FieldWithManageAction';

describe('FieldWithManageAction', () => {
  it('renders children and manage action button with default aria-label', () => {
    const handleManage = vi.fn();
    render(
      <FieldWithManageAction onManage={handleManage}>
        <input data-testid="child-input" placeholder="Input Komoditas" />
      </FieldWithManageAction>
    );

    expect(screen.getByTestId('child-input')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Kelola Master Data' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-touch-target', '44');
  });

  it('calls onManage when manage action button is clicked', () => {
    const handleManage = vi.fn();
    render(
      <FieldWithManageAction onManage={handleManage}>
        <input placeholder="Field Data" />
      </FieldWithManageAction>
    );

    const button = screen.getByRole('button', { name: 'Kelola Master Data' });
    fireEvent.click(button);
    expect(handleManage).toHaveBeenCalledTimes(1);
  });

  it('supports custom manageLabel and custom dataTouchTarget', () => {
    const handleManage = vi.fn();
    render(
      <FieldWithManageAction
        onManage={handleManage}
        manageLabel="Kelola Daftar Pembeli"
        dataTouchTarget="48"
      >
        <span>Custom Child</span>
      </FieldWithManageAction>
    );

    const button = screen.getByRole('button', { name: 'Kelola Daftar Pembeli' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-touch-target', '48');
  });

  it('disables the manage button when disabled prop is true', () => {
    const handleManage = vi.fn();
    render(
      <FieldWithManageAction onManage={handleManage} disabled>
        <input placeholder="Field Data" />
      </FieldWithManageAction>
    );

    const button = screen.getByRole('button', { name: 'Kelola Master Data' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleManage).not.toHaveBeenCalled();
  });
});
