'use client';

/**
 * @file src/layouts/AppProviders.jsx
 * @description Global client provider tree (formerly the ReactDOM.render tree in Vite's main.jsx).
 * Loaded client-only by src/app/client-root.jsx.
 */

// Must stay first: sets window.API_URL / SOCKET_URL and the Buffer/process polyfills
import '@/lib/clientEnv';

import React from 'react';
import { notificationService } from '@/utils/notificationService';
import { AppProvider } from '@/context/AppContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { ChatProvider } from '@/context/ChatContext';
import { CallProvider } from '@/context/CallContext';
import CallScreen from '@/views/chat/CallScreen';
import { ToastContainer } from '@/components/Toast';
import ErrorBoundary from '@/components/common/ErrorBoundary';

notificationService.register();

export default function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <BrandingProvider>
        <AppProvider>
          <ChatProvider>
            <CallProvider>
              {children}
              <ToastContainer />
              <CallScreen />
            </CallProvider>
          </ChatProvider>
        </AppProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
}
