import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PasswordField } from '@/components/portal/auth/PasswordField';

describe('PasswordField Component', () => {
  it('renders with default label', () => {
    render(<PasswordField id="password" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toBeDefined();
    expect(input.getAttribute('type')).toBe('password');
  });

  it('renders with custom label', () => {
    render(<PasswordField id="password" label="Tu Clave" />);
    expect(screen.getByLabelText('Tu Clave')).toBeDefined();
  });

  it('toggles password visibility', () => {
    render(<PasswordField id="password" />);
    const input = screen.getByLabelText('Contraseña');
    const toggleButton = screen.getByRole('button');

    // Inicialmente oculto
    expect(input.getAttribute('type')).toBe('password');

    // Click para mostrar
    fireEvent.click(toggleButton);
    expect(input.getAttribute('type')).toBe('text');

    // Click para ocultar
    fireEvent.click(toggleButton);
    expect(input.getAttribute('type')).toBe('password');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<PasswordField id="password" ref={ref} />);

    expect(ref.current).toBeDefined();
    expect(ref.current?.tagName).toBe('INPUT');
    expect(ref.current?.id).toBe('password');
  });
});
