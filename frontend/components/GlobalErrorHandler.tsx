'use client';

import { useEffect } from 'react';

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if the error matches the specific Chrome extension error
      const reason = event.reason;
      const errorMessage = reason instanceof Error ? reason.message : String(reason);

      if (errorMessage.includes('Could not establish connection. Receiving end does not exist')) {
        // Prevent the error from appearing as an uncaught exception in the console
        event.preventDefault();

        console.warn('[GlobalErrorHandler] Suppressed known Chrome Extension error:', {
          message: errorMessage,
          reason: event.reason,
          timestamp: new Date().toISOString(),
          type: 'Extension/ContentScript Communication Error',
          context:
            'This error typically occurs when a Chrome extension is updated or reloaded while the page is open, or when a content script tries to send a message to a background script that is no longer listening.',
        });

        return;
      }

      // Log other unhandled rejections for debugging
      console.error('[GlobalErrorHandler] Unhandled Promise Rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
