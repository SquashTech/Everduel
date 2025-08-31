/**
 * Optimized Update Manager
 * Eliminates redundant calls and batches updates for better performance
 */
class OptimizedUpdater {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.pendingUpdates = new Set();
        this.updateTimer = null;
        this.batchDelay = 16; // ~60fps batching
        this.lastUpdateTime = 0;
        this.minUpdateInterval = 50; // Minimum 50ms between updates
        
        // Track what needs updating
        this.pendingOperations = {
            statsRecalculation: false,
            uiUpdate: false,
            attackableUnits: false
        };
        
        this.debugMode = false;
    }

    /**
     * Request a stats recalculation (batched)
     */
    requestStatsRecalculation(source = 'unknown') {
        if (this.debugMode) {
            console.log(`📊 [OptimizedUpdater] Stats recalc requested by: ${source}`);
        }
        
        this.pendingOperations.statsRecalculation = true;
        this.scheduleBatch();
    }

    /**
     * Request a UI update (batched)
     */
    requestUIUpdate(source = 'unknown') {
        if (this.debugMode) {
            console.log(`🔄 [OptimizedUpdater] UI update requested by: ${source}`);
        }
        
        this.pendingOperations.uiUpdate = true;
        this.scheduleBatch();
    }

    /**
     * Request attackable units update (batched)
     */
    requestAttackableUnitsUpdate(source = 'unknown') {
        if (this.debugMode) {
            console.log(`⚔️ [OptimizedUpdater] Attackable units update requested by: ${source}`);
        }
        
        this.pendingOperations.attackableUnits = true;
        this.scheduleBatch();
    }

    /**
     * Schedule a batched update
     */
    scheduleBatch() {
        if (this.updateTimer) {
            return; // Already scheduled
        }

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        if (timeSinceLastUpdate < this.minUpdateInterval) {
            // Wait until minimum interval has passed
            const delay = this.minUpdateInterval - timeSinceLastUpdate;
            this.updateTimer = setTimeout(() => this.executeBatch(), delay);
        } else {
            // Use requestAnimationFrame for smooth updates
            this.updateTimer = requestAnimationFrame(() => this.executeBatch());
        }
    }

    /**
     * Execute the batched updates
     */
    executeBatch() {
        this.updateTimer = null;
        const now = Date.now();
        
        if (this.debugMode) {
            const operations = Object.entries(this.pendingOperations)
                .filter(([key, value]) => value)
                .map(([key]) => key);
            
            if (operations.length > 0) {
                console.log(`⚡ [OptimizedUpdater] Executing batch:`, operations);
            }
        }

        // Execute updates in optimal order
        if (this.pendingOperations.statsRecalculation) {
            this.eventBus.emit('batch:stats-recalculation');
            this.pendingOperations.statsRecalculation = false;
        }

        if (this.pendingOperations.attackableUnits) {
            this.eventBus.emit('batch:attackable-units-update');
            this.pendingOperations.attackableUnits = false;
        }

        if (this.pendingOperations.uiUpdate) {
            this.eventBus.emit('batch:ui-update');
            this.pendingOperations.uiUpdate = false;
        }

        this.lastUpdateTime = now;
    }

    /**
     * Force immediate execution of pending updates
     */
    flush() {
        if (this.updateTimer) {
            if (typeof this.updateTimer === 'number') {
                clearTimeout(this.updateTimer);
            } else {
                cancelAnimationFrame(this.updateTimer);
            }
        }
        this.executeBatch();
    }

    /**
     * Enable/disable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 [OptimizedUpdater] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get statistics about batching efficiency
     */
    getStats() {
        return {
            lastUpdateTime: this.lastUpdateTime,
            pendingOperations: { ...this.pendingOperations },
            hasPendingTimer: !!this.updateTimer,
            batchDelay: this.batchDelay,
            minUpdateInterval: this.minUpdateInterval
        };
    }
}

export default OptimizedUpdater;