import { render, screen, act, fireEvent } from '@testing-library/react';
import { InactivityListener } from '@/components/auth/InactivityListener';
import { useSession, signOut } from 'next-auth/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mocks
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('InactivityListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not do anything if session is not authenticated', () => {
    (useSession as any).mockReturnValue({ status: 'unauthenticated' });
    
    render(<InactivityListener />);
    
    // Advance time by 20 minutes
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });

    expect(signOut).not.toHaveBeenCalled();
  });

  it('should sign out after 15 minutes of inactivity when authenticated', () => {
    (useSession as any).mockReturnValue({ status: 'authenticated', data: { user: { name: 'Test' } } });
    
    render(<InactivityListener />);
    
    // Advance time by 15 minutes + 1 second
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    });

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=inactivity' });
  });

  it('should reset timer on activity', () => {
    (useSession as any).mockReturnValue({ status: 'authenticated', data: { user: { name: 'Test' } } });
    
    render(<InactivityListener />);
    
    // Advance time by 10 minutes
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    // Simulate activity
    fireEvent.mouseMove(window);

    // Advance time by another 10 minutes (total 20 mins from start, but only 10 from last activity)
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(signOut).not.toHaveBeenCalled();

    // Advance time by another 6 minutes (total 16 mins from last activity)
    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=inactivity' });
  });

  it('should sign out immediately if session has RefreshAccessTokenError', () => {
    (useSession as any).mockReturnValue({ 
      status: 'authenticated', 
      data: { 
        user: { name: 'Test' },
        error: 'RefreshAccessTokenError'
      } 
    });
    
    render(<InactivityListener />);
    
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login?reason=session_expired' });
  });
});
