'use client';

import React, { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeProviderWrapperProps {
  children: ReactNode;
  options?: any;
}

export function StripeProviderWrapper({ children, options }: StripeProviderWrapperProps) {
  // Default options for CardElement flow (no clientSecret needed initially)
  const defaultOptions = {
    appearance: {
      theme: 'stripe' as const,
    },
    ...options,
  };

  return (
    <Elements stripe={stripePromise} options={defaultOptions}>
      {children}
    </Elements>
  );
}
