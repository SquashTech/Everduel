/**
 * Centralized error handling utility for consistent error management across systems
 */
class ErrorHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.errorCounts = new Map();
        this.maxRetries = 3;
    }

    /**
     * Handle errors consistently with appropriate recovery strategies
     * @param {Error} error - The error that occurred
     * @param {Object} context - Context about where the error occurred
     * @param {Object} options - Options for error handling
     * @returns {Object} Result indicating how the error was handled
     */
    handleError(error, context = {}, options = {}) {
        const {
            operation = 'unknown operation',
            component = 'unknown component',
            severity = 'medium',
            fallback = null,
            emit = true,
            retry = false
        } = options;

        // Create error key for tracking
        const errorKey = `${component}:${operation}`;
        const currentCount = this.errorCounts.get(errorKey) || 0;

        // Log error with context
        this.logError(error, context, severity);

        // Handle retry logic
        if (retry && currentCount < this.maxRetries) {
            this.errorCounts.set(errorKey, currentCount + 1);
            console.warn(`🔄 Retrying ${operation} (attempt ${currentCount + 1}/${this.maxRetries})`);
            return { action: 'retry', attempt: currentCount + 1 };
        }

        // Reset error count if we're not retrying or max retries reached
        if (this.errorCounts.has(errorKey)) {
            this.errorCounts.delete(errorKey);
        }

        // Emit error event if requested
        if (emit && this.eventBus) {
            this.eventBus.emit('system:error', {
                error: error.message,
                component,
                operation,
                severity,
                context,
                timestamp: new Date().toISOString()
            });
        }

        // Apply fallback strategy
        if (fallback) {
            console.info(`🛡️ Applying fallback strategy for ${component}:${operation}`);
            return { action: 'fallback', result: fallback };
        }

        // Determine recovery action based on severity
        switch (severity) {
            case 'critical':
                // Critical errors should fail fast and loudly
                console.error('🚨 CRITICAL ERROR - System may be unstable');
                return { action: 'fail', recoverable: false };
                
            case 'high':
                // High priority errors should be handled gracefully but reported
                console.warn('⚠️ High priority error handled gracefully');
                return { action: 'handled', recoverable: true };
                
            case 'medium':
                // Medium errors can usually continue with degraded functionality
                console.warn('⚠️ Non-critical error handled');
                return { action: 'continue', recoverable: true };
                
            case 'low':
                // Low priority errors are logged but don't affect operation
                console.log('ℹ️ Minor error logged');
                return { action: 'ignore', recoverable: true };
                
            default:
                return { action: 'handled', recoverable: true };
        }
    }

    /**
     * Log error with appropriate level and context
     */
    logError(error, context, severity) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${severity.toUpperCase()}: ${error.message}`;
        
        switch (severity) {
            case 'critical':
                console.error('🚨', logMessage, error);
                break;
            case 'high':
                console.error('❌', logMessage);
                break;
            case 'medium':
                console.warn('⚠️', logMessage);
                break;
            case 'low':
                console.info('ℹ️', logMessage);
                break;
        }

        if (Object.keys(context).length > 0) {
            console.log('📋 Context:', context);
        }
    }

    /**
     * Create a wrapper for async operations with consistent error handling
     * @param {Function} operation - The async operation to wrap
     * @param {Object} context - Context for error handling
     * @param {Object} options - Error handling options
     * @returns {Function} Wrapped operation
     */
    wrapAsync(operation, context, options) {
        return async (...args) => {
            try {
                return await operation(...args);
            } catch (error) {
                const result = this.handleError(error, context, options);
                
                if (result.action === 'retry' && options.retryFn) {
                    return await this.wrapAsync(operation, context, options)(...args);
                }
                
                if (result.action === 'fallback') {
                    return result.result;
                }
                
                if (result.action === 'fail') {
                    throw error;
                }
                
                return null; // Safe default return
            }
        };
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStats() {
        return {
            activeErrors: this.errorCounts.size,
            errorBreakdown: Object.fromEntries(this.errorCounts)
        };
    }

    /**
     * Clear error counts (useful for testing or reset)
     */
    reset() {
        this.errorCounts.clear();
        console.log('🧹 ErrorHandler reset - all error counts cleared');
    }
}

export default ErrorHandler;