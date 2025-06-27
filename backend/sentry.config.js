/**
 * Sentry Configuration for Express Backend
 * 
 * This configuration sets up error tracking and performance monitoring
 * for the BPMN AI Editor backend service.
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry with environment-specific configuration
 */
function initSentry() {
  // Only initialize Sentry if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not found. Sentry monitoring disabled.');
    return false;
  }

  // Skip Sentry in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG_MODE) {
    console.log('Sentry disabled in development mode. Set SENTRY_DEBUG_MODE=true to enable.');
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 
                     (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Enable HTTP instrumentation
      Sentry.httpIntegration(),
      // Enable Express instrumentation  
      Sentry.expressIntegration(),
      // Enable Node.js profiling
      nodeProfilingIntegration(),
    ],

    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out certain errors in development
      if (process.env.NODE_ENV === 'development') {
        // Don't send CORS errors in development
        if (hint.originalException?.message?.includes('CORS')) {
          return null;
        }
      }
      
      // Add custom context
      event.tags = {
        ...event.tags,
        component: 'bpmn-ai-editor-backend',
        service: 'api'
      };

      return event;
    },

    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
  });

  console.log(`✅ Sentry initialized for ${process.env.SENTRY_ENVIRONMENT || 'development'} environment`);
  return true;
}

/**
 * Error handling middleware for Express
 * Must be used after all controllers and before other error handlers
 */
function sentryErrorHandler() {
  // In Sentry v8+, error handling is automatic with expressIntegration
  // Return a no-op middleware if Sentry is not initialized
  return (error, req, res, next) => {
    // Sentry will automatically capture this error via expressIntegration
    next(error);
  };
}

/**
 * Request handler middleware for Express
 * In Sentry v8+, this is handled automatically by expressIntegration
 */
function sentryRequestHandler() {
  // Return a no-op middleware since Sentry v8+ handles this automatically
  return (req, res, next) => {
    next();
  };
}

/**
 * Tracing handler middleware for Express
 * In Sentry v8+, this is handled automatically by expressIntegration
 */
function sentryTracingHandler() {
  // Return a no-op middleware since Sentry v8+ handles this automatically
  return (req, res, next) => {
    next();
  };
}

/**
 * Manually capture an exception
 * 
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
function captureException(error, context = {}) {
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
function captureMessage(message, level = 'info', context = {}) {
  Sentry.withScope((scope) => {
    // Add context to the scope
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the message
    Sentry.captureMessage(message, level);
  });
}

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  Sentry
}; 