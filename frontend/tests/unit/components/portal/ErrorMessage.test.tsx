
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorMessage } from '@/components/portal/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders default props correctly', () => {
    render(<ErrorMessage />);
    expect(screen.getByText('Ocurrió un error')).toBeDefined();
    expect(screen.getByText(/No pudimos cargar la información/)).toBeDefined();
  });

  it('renders custom title and message', () => {
    render(<ErrorMessage title="Custom Title" message="Custom Message" />);
    expect(screen.getByText('Custom Title')).toBeDefined();
    expect(screen.getByText('Custom Message')).toBeDefined();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage onRetry={onRetry} />);
    
    const button = screen.getByRole('button', { name: /intentar de nuevo/i });
    expect(button).toBeDefined();
    
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is missing', () => {
    render(<ErrorMessage />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorMessage className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
