
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from '@/app/login/page';

// Mock LoginForm
vi.mock('@/components/auth/LoginForm', () => ({
  default: () => <div data-testid="login-form">LoginForm</div>,
}));

describe('Login Page', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('login-form')).toBeDefined();
    expect(screen.getByText('Quintas CRM')).toBeDefined();
  });
});
