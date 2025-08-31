/**
 * Production Logger
 * Intelligent logging system that reduces spam while preserving important information
 */
class ProductionLogger {
    constructor() {
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
        this.enabledCategories = new Set(['game', 'combat', 'error']);
        this.messageFrequency = new Map();
        this.spamThreshold = 5; // Same message more than 5 times = spam
        this.timeWindow = 10000; // 10 second window for spam detection
        this.totalLogsBlocked = 0;
        
        // Production mode settings
        this.productionMode = false;
        this.importantPrefixes = ['⚠️', '❌', '🚨', '💥', '🔥'];
        this.spamPrefixes = ['📊', '🔄', '⚡', '🏘️', '🛡️'];
    }

    /**
     * Enable production mode (reduced logging)
     */
    enableProductionMode() {
        this.productionMode = true;
        this.logLevel = 'WARN';
        this.enabledCategories = new Set(['error', 'critical']);
        console.log('🎯 Production logging mode enabled - verbose logs suppressed');
    }

    /**
     * Enable development mode (full logging)
     */
    enableDevelopmentMode() {
        this.productionMode = false;
        this.logLevel = 'DEBUG';
        this.enabledCategories = new Set(['game', 'combat', 'ui', 'ability', 'error']);
        console.log('🔧 Development logging mode enabled - full logging active');
    }

    /**
     * Smart log method that replaces console.log
     */
    log(message, data = null, category = 'general') {
        if (!this.shouldLog(message, category, 'INFO')) {
            return false;
        }

        console.log(message, data || '');
        return true;
    }

    /**
     * Warning logs (always shown unless spam)
     */
    warn(message, data = null, category = 'warning') {
        if (!this.shouldLog(message, category, 'WARN')) {
            return false;
        }

        console.warn(message, data || '');
        return true;
    }

    /**
     * Error logs (always shown)
     */
    error(message, data = null, category = 'error') {
        console.error(message, data || '');
        return true;
    }

    /**
     * Determine if a message should be logged
     */
    shouldLog(message, category, level) {
        // Always log errors and critical messages
        if (level === 'ERROR' || this.isImportantMessage(message)) {
            return true;
        }

        // In production mode, suppress verbose messages
        if (this.productionMode && this.isSpamMessage(message)) {
            this.totalLogsBlocked++;
            return false;
        }

        // Check log level
        if (!this.meetsLogLevel(level)) {
            return false;
        }

        // Check category
        if (!this.enabledCategories.has(category)) {
            return false;
        }

        // Check for spam
        if (this.isSpamMessage(message)) {
            this.totalLogsBlocked++;
            return false;
        }

        return true;
    }

    /**
     * Check if message is important (should always be shown)
     */
    isImportantMessage(message) {
        return this.importantPrefixes.some(prefix => message.startsWith(prefix));
    }

    /**
     * Check if message is likely spam
     */
    isSpamMessage(message) {
        const now = Date.now();
        
        // Check for spam prefixes in production
        if (this.productionMode && this.spamPrefixes.some(prefix => message.startsWith(prefix))) {
            return true;
        }

        // Track message frequency
        if (!this.messageFrequency.has(message)) {
            this.messageFrequency.set(message, { count: 1, firstSeen: now });
            return false;
        }

        const msgData = this.messageFrequency.get(message);
        
        // Reset counter if outside time window
        if (now - msgData.firstSeen > this.timeWindow) {
            msgData.count = 1;
            msgData.firstSeen = now;
            return false;
        }

        msgData.count++;
        
        // Consider spam if seen too frequently
        return msgData.count > this.spamThreshold;
    }

    /**
     * Check if message meets current log level
     */
    meetsLogLevel(level) {
        const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        const currentLevelValue = levels[this.logLevel] || 1;
        const messageLevelValue = levels[level] || 1;
        
        return messageLevelValue >= currentLevelValue;
    }

    /**
     * Create optimized replacement for common logging patterns
     */
    createOptimizedLogger(componentName) {
        return {
            log: (message, data) => this.log(`[${componentName}] ${message}`, data, componentName.toLowerCase()),
            warn: (message, data) => this.warn(`[${componentName}] ${message}`, data, componentName.toLowerCase()),
            error: (message, data) => this.error(`[${componentName}] ${message}`, data, componentName.toLowerCase()),
            
            // Specialized methods for common patterns
            statsRecalc: (count) => {
                if (count > 1) {
                    this.log(`📊 [${componentName}] Recalculated ${count} unit stats`, null, 'stats');
                }
            },
            
            uiUpdate: (reason) => {
                this.log(`🔄 [${componentName}] UI updated (${reason})`, null, 'ui');
            },
            
            abilityActivated: (unitName, abilityType) => {
                this.log(`⚡ [${componentName}] ${unitName} activated ${abilityType}`, null, 'ability');
            }
        };
    }

    /**
     * Wrap console methods to use production logger
     */
    wrapConsole() {
        const originalConsole = { ...console };
        
        console.log = (message, ...args) => {
            if (!this.log(message, args.length > 0 ? args : null)) {
                // Log was blocked
                return;
            }
        };

        console.warn = (message, ...args) => {
            this.warn(message, args.length > 0 ? args : null);
        };

        console.error = (message, ...args) => {
            this.error(message, args.length > 0 ? args : null);
        };

        // Provide a way to access original console if needed
        console._original = originalConsole;
    }

    /**
     * Get logging statistics
     */
    getStats() {
        return {
            productionMode: this.productionMode,
            logLevel: this.logLevel,
            enabledCategories: Array.from(this.enabledCategories),
            totalLogsBlocked: this.totalLogsBlocked,
            trackedMessages: this.messageFrequency.size,
            spamThreshold: this.spamThreshold
        };
    }

    /**
     * Print efficiency report
     */
    printEfficiencyReport() {
        const stats = this.getStats();
        console.log('📊 Logging Efficiency Report:');
        console.log(`  • Production mode: ${stats.productionMode ? 'ON' : 'OFF'}`);
        console.log(`  • Log level: ${stats.logLevel}`);
        console.log(`  • Logs blocked: ${stats.totalLogsBlocked}`);
        console.log(`  • Categories enabled: ${stats.enabledCategories.join(', ')}`);
    }

    /**
     * Clean up old message tracking data
     */
    cleanup() {
        const now = Date.now();
        const oldMessages = [];
        
        for (const [message, data] of this.messageFrequency.entries()) {
            if (now - data.firstSeen > this.timeWindow * 2) {
                oldMessages.push(message);
            }
        }
        
        oldMessages.forEach(message => this.messageFrequency.delete(message));
        
        if (oldMessages.length > 0) {
            console.log(`🧹 Cleaned up ${oldMessages.length} old message tracking entries`);
        }
    }
}

export default ProductionLogger;