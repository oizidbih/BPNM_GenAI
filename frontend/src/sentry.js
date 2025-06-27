/**
 * Sentry Configuration for React Frontend
 * 
 * This configuration sets up error tracking and performance monitoring
 * for the BPMN AI Editor React application.
 */

import * as Sentry from '@sentry/react';
import React from 'react';

/**
 * Initialize Sentry with environment-specific configuration
 */
export function initSentry() {
  // Only initialize Sentry if DSN is provided
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('REACT_APP_SENTRY_DSN not found. Sentry monitoring disabled.');
    return;
  }

  // Skip Sentry in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_SENTRY_DEBUG_MODE) {
    console.log('Sentry disabled in development mode. Set REACT_APP_SENTRY_DEBUG_MODE=true to enable.');
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE) || 
                     (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
    
    // Session Replay
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      // React Router integration (if using React Router)
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
      }),
      // Session Replay integration
      Sentry.replayIntegration({
        // Mask all text content, images, and user inputs
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out certain errors in development
      if (process.env.NODE_ENV === 'development') {
        // Don't send network errors in development
        if (hint.originalException?.message?.includes('NetworkError')) {
          return null;
        }
        // Don't send CORS errors in development
        if (hint.originalException?.message?.includes('CORS')) {
          return null;
        }
      }
      
      // Add custom context
      event.tags = {
        ...event.tags,
        component: 'bpmn-ai-editor-frontend',
        service: 'react-app'
      };

      // Add user context if available
      if (event.user) {
        event.user = {
          ...event.user,
          ip_address: '{{auto}}' // Let Sentry determine IP
        };
      }

      return event;
    },

    // Release tracking
    release: process.env.REACT_APP_VERSION || '1.0.0',
  });

  console.log(`✅ Sentry initialized for ${process.env.REACT_APP_SENTRY_ENVIRONMENT || 'development'} environment`);
}

/**
 * Manually capture an exception
 * 
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  Sentry.withScope((scope) => {
    // Add context to the scope
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the exception
    Sentry.captureException(error);
  });
}

/**
 * Manually capture a message
 * 
 * @param {string} message - Message to capture
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.withScope((scope) => {
    // Add context to the scope
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the message
    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 * 
 * @param {Object} user - User information
 */
export function setUser(user) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 * 
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Create error boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default Sentry; 