/**
 * Safe execution utility for wrapping operations with consistent error handling
 * Provides simple, standardized error handling patterns for common operations
 */

/**
 * Safely execute an operation with error handling
 * @param {Function} operation - The operation to execute
 * @param {Object} options - Configuration options
 * @returns {Object} Result with success status and data/error
 */
export function safeExecute(operation, options = {}) {
    const {
        context = 'unknown operation',
        fallback = null,
        logErrors = true,
        throwOnFailure = false
    } = options;

    try {
        const result = operation();
        return { success: true, data: result, error: null };
    } catch (error) {
        if (logErrors) {
            console.error(`❌ Error in ${context}:`, error);
        }

        if (throwOnFailure) {
            throw error;
        }

        return { 
            success: false, 
            data: fallback, 
            error: error.message || 'Unknown error' 
        };
    }
}

/**
 * Safely execute an async operation with error handling
 * @param {Function} asyncOperation - The async operation to execute
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result with success status and data/error
 */
export async function safeExecuteAsync(asyncOperation, options = {}) {
    const {
        context = 'unknown async operation',
        fallback = null,
        logErrors = true,
        throwOnFailure = false,
        timeout = null
    } = options;

    try {
        let result;
        
        if (timeout) {
            // Add timeout wrapper
            result = await Promise.race([
                asyncOperation(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
                )
            ]);
        } else {
            result = await asyncOperation();
        }

        return { success: true, data: result, error: null };
    } catch (error) {
        if (logErrors) {
            console.error(`❌ Error in ${context}:`, error);
        }

        if (throwOnFailure) {
            throw error;
        }

        return { 
            success: false, 
            data: fallback, 
            error: error.message || 'Unknown error' 
        };
    }
}

/**
 * Create a safe version of a function that won't throw errors
 * @param {Function} fn - The function to make safe
 * @param {Object} options - Configuration options
 * @returns {Function} Safe version of the function
 */
export function makeSafe(fn, options = {}) {
    return (...args) => safeExecute(() => fn(...args), options);
}

/**
 * Create a safe version of an async function that won't throw errors
 * @param {Function} asyncFn - The async function to make safe
 * @param {Object} options - Configuration options
 * @returns {Function} Safe version of the async function
 */
export function makeSafeAsync(asyncFn, options = {}) {
    return async (...args) => safeExecuteAsync(() => asyncFn(...args), options);
}

/**
 * Validate that a value meets certain criteria
 * @param {*} value - Value to validate
 * @param {Array} validators - Array of validator functions
 * @param {string} context - Context for error messages
 * @returns {Object} Validation result
 */
export function validateValue(value, validators, context = 'value') {
    try {
        for (const validator of validators) {
            const result = validator(value);
            if (!result.valid) {
                return {
                    valid: false,
                    error: `${context}: ${result.message || 'Validation failed'}`
                };
            }
        }
        return { valid: true, error: null };
    } catch (error) {
        return {
            valid: false,
            error: `${context}: Validation error - ${error.message}`
        };
    }
}

// Common validators
export const validators = {
    notNull: (value) => ({
        valid: value !== null && value !== undefined,
        message: 'Value cannot be null or undefined'
    }),
    
    isNumber: (value) => ({
        valid: typeof value === 'number' && !isNaN(value),
        message: 'Value must be a valid number'
    }),
    
    isPositive: (value) => ({
        valid: typeof value === 'number' && value >= 0,
        message: 'Value must be positive'
    }),
    
    isString: (value) => ({
        valid: typeof value === 'string',
        message: 'Value must be a string'
    }),
    
    isObject: (value) => ({
        valid: typeof value === 'object' && value !== null,
        message: 'Value must be an object'
    }),
    
    hasProperty: (property) => (value) => ({
        valid: value && typeof value === 'object' && property in value,
        message: `Object must have property '${property}'`
    })
};