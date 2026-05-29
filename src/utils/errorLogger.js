/**
 * Centralized error logging utility
 * Formats errors consistently for debugging and future integration with Sentry/LogRocket
 */

export function logError(context, error, metadata = {}) {
  const timestamp = new Date().toISOString()
  const errorMessage = error?.message || String(error)
  const errorStack = error?.stack || 'No stack available'

  const logEntry = {
    timestamp,
    context,
    error: errorMessage,
    metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
  }

  console.error(
    `%c[${context}] ${errorMessage}`,
    'color: #dc2626; font-weight: bold; font-size: 12px;',
    {
      ...logEntry,
      stack: errorStack,
    }
  )

  // Future: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (window.errorTracker) {
  //   window.errorTracker.captureException(error, { contexts: { metadata } });
  // }
}

export function logWarning(context, message, metadata = {}) {
  const timestamp = new Date().toISOString()

  console.warn(`%c[${context}] ${message}`, 'color: #ea580c; font-weight: bold; font-size: 12px;', {
    timestamp,
    context,
    metadata,
  })
}

export function logInfo(context, message, metadata = {}) {
  const timestamp = new Date().toISOString()

  console.info(`%c[${context}] ${message}`, 'color: #2563eb; font-weight: normal; font-size: 12px;', {
    timestamp,
    context,
    metadata,
  })
}
