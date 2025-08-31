/**
 * Performance Monitoring System
 * Provides comprehensive performance tracking and profiling for the game
 * Addresses performance concerns identified in the architecture analysis
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.timers = new Map();
        this.memoryBaseline = this.getMemoryUsage();
        this.frameRateHistory = [];
        this.maxHistorySize = 100;
        this.enabled = true;
        this.detailedLogging = false;
        
        this.thresholds = {
            slowOperation: 16, // 16ms (60fps threshold)
            memoryLeak: 10 * 1024 * 1024, // 10MB
            frameRateWarning: 45 // Below 45fps
        };
        
        this.initializeMetrics();
        this.startFrameRateMonitoring();
        
        console.log('📊 PerformanceMonitor initialized');
    }

    /**
     * Initialize performance metrics tracking
     */
    initializeMetrics() {
        const metricCategories = [
            'rendering',
            'gameState',
            'abilitySystem',
            'ui',
            'combat',
            'eventSystem',
            'memory'
        ];

        metricCategories.forEach(category => {
            this.metrics.set(category, {
                totalTime: 0,
                callCount: 0,
                averageTime: 0,
                maxTime: 0,
                minTime: Infinity,
                errors: 0,
                lastCall: 0
            });
        });
    }

    /**
     * Start timing a performance-critical operation
     */
    startTimer(operation, category = 'general') {
        if (!this.enabled) return;

        const startTime = performance.now();
        this.timers.set(operation, {
            startTime,
            category,
            id: `${operation}-${startTime}`
        });

        if (this.detailedLogging) {
            console.log(`⏱️ Started timer: ${operation}`);
        }
    }

    /**
     * End timing and record metrics
     */
    endTimer(operation) {
        if (!this.enabled || !this.timers.has(operation)) {
            return null;
        }

        const timer = this.timers.get(operation);
        const endTime = performance.now();
        const duration = endTime - timer.startTime;
        
        this.timers.delete(operation);
        
        // Record metrics
        this.recordMetric(timer.category, duration);
        
        // Check for slow operations
        if (duration > this.thresholds.slowOperation) {
            this.reportSlowOperation(operation, duration, timer.category);
        }

        if (this.detailedLogging) {
            console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    /**
     * Record a metric for a category
     */
    recordMetric(category, duration) {
        let metrics = this.metrics.get(category);
        
        if (!metrics) {
            metrics = {
                totalTime: 0,
                callCount: 0,
                averageTime: 0,
                maxTime: 0,
                minTime: Infinity,
                errors: 0,
                lastCall: 0
            };
            this.metrics.set(category, metrics);
        }

        metrics.totalTime += duration;
        metrics.callCount++;
        metrics.averageTime = metrics.totalTime / metrics.callCount;
        metrics.maxTime = Math.max(metrics.maxTime, duration);
        metrics.minTime = Math.min(metrics.minTime, duration);
        metrics.lastCall = Date.now();
    }

    /**
     * Record an error for a category
     */
    recordError(category) {
        if (!this.enabled) return;

        const metrics = this.metrics.get(category);
        if (metrics) {
            metrics.errors++;
        }
    }

    /**
     * Monitor frame rate performance
     */
    startFrameRateMonitoring() {
        if (!this.enabled) return;

        let lastTime = performance.now();
        let frameCount = 0;

        const measureFrameRate = () => {
            const currentTime = performance.now();
            frameCount++;

            // Measure FPS every second
            if (currentTime - lastTime >= 1000) {
                const fps = (frameCount * 1000) / (currentTime - lastTime);
                this.recordFrameRate(fps);
                
                frameCount = 0;
                lastTime = currentTime;
            }

            if (this.enabled) {
                requestAnimationFrame(measureFrameRate);
            }
        };

        requestAnimationFrame(measureFrameRate);
    }

    /**
     * Record frame rate measurement
     */
    recordFrameRate(fps) {
        this.frameRateHistory.push({
            fps,
            timestamp: Date.now()
        });

        // Trim history
        if (this.frameRateHistory.length > this.maxHistorySize) {
            this.frameRateHistory.shift();
        }

        // Check for low frame rate
        if (fps < this.thresholds.frameRateWarning) {
            this.reportLowFrameRate(fps);
        }
    }

    /**
     * Monitor memory usage
     */
    checkMemoryUsage() {
        if (!this.enabled) return null;

        const currentMemory = this.getMemoryUsage();
        const memoryIncrease = currentMemory - this.memoryBaseline;
        
        if (memoryIncrease > this.thresholds.memoryLeak) {
            this.reportMemoryLeak(currentMemory, memoryIncrease);
        }

        return {
            current: currentMemory,
            baseline: this.memoryBaseline,
            increase: memoryIncrease
        };
    }

    /**
     * Get current memory usage (if available)
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0; // Fallback if not available
    }

    /**
     * Profile a function with automatic timing
     */
    profile(fn, operation, category = 'general') {
        return (...args) => {
            this.startTimer(operation, category);
            
            try {
                const result = fn(...args);
                
                // Handle async functions
                if (result && typeof result.then === 'function') {
                    return result
                        .then(value => {
                            this.endTimer(operation);
                            return value;
                        })
                        .catch(error => {
                            this.endTimer(operation);
                            this.recordError(category);
                            throw error;
                        });
                }
                
                this.endTimer(operation);
                return result;
            } catch (error) {
                this.endTimer(operation);
                this.recordError(category);
                throw error;
            }
        };
    }

    /**
     * Create a profiled version of an object's methods
     */
    profileObject(obj, category, methods = []) {
        if (!this.enabled) return obj;

        const methodsToProfile = methods.length > 0 ? methods : Object.getOwnPropertyNames(obj.constructor.prototype);
        
        methodsToProfile.forEach(methodName => {
            if (typeof obj[methodName] === 'function' && methodName !== 'constructor') {
                const originalMethod = obj[methodName];
                obj[methodName] = this.profile(
                    originalMethod.bind(obj),
                    `${obj.constructor.name}.${methodName}`,
                    category
                );
            }
        });

        return obj;
    }

    /**
     * Report slow operation
     */
    reportSlowOperation(operation, duration, category) {
        console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms (category: ${category})`);
        
        // Could emit event for further handling
        if (window.eventBus) {
            window.eventBus.emit('performance:slow-operation', {
                operation,
                duration,
                category,
                threshold: this.thresholds.slowOperation
            });
        }
    }

    /**
     * Report low frame rate
     */
    reportLowFrameRate(fps) {
        console.warn(`🖼️ Low frame rate detected: ${fps.toFixed(1)} FPS`);
        
        if (window.eventBus) {
            window.eventBus.emit('performance:low-framerate', {
                fps,
                threshold: this.thresholds.frameRateWarning
            });
        }
    }

    /**
     * Report potential memory leak
     */
    reportMemoryLeak(currentMemory, increase) {
        console.warn(`🧠 Potential memory leak detected: ${(increase / 1024 / 1024).toFixed(2)}MB increase`);
        
        if (window.eventBus) {
            window.eventBus.emit('performance:memory-leak', {
                currentMemory,
                increase,
                threshold: this.thresholds.memoryLeak
            });
        }
    }

    /**
     * Get comprehensive performance report
     */
    getReport() {
        const report = {
            timestamp: new Date().toISOString(),
            enabled: this.enabled,
            memory: this.checkMemoryUsage(),
            frameRate: this.getFrameRateStats(),
            categories: {},
            summary: {
                totalOperations: 0,
                totalErrors: 0,
                slowOperations: 0,
                averageFrameRate: 0
            }
        };

        // Compile category metrics
        for (const [category, metrics] of this.metrics.entries()) {
            report.categories[category] = {
                ...metrics,
                minTime: metrics.minTime === Infinity ? 0 : metrics.minTime
            };
            
            report.summary.totalOperations += metrics.callCount;
            report.summary.totalErrors += metrics.errors;
            
            if (metrics.maxTime > this.thresholds.slowOperation) {
                report.summary.slowOperations++;
            }
        }

        // Calculate average frame rate
        if (this.frameRateHistory.length > 0) {
            const totalFps = this.frameRateHistory.reduce((sum, entry) => sum + entry.fps, 0);
            report.summary.averageFrameRate = totalFps / this.frameRateHistory.length;
        }

        return report;
    }

    /**
     * Get frame rate statistics
     */
    getFrameRateStats() {
        if (this.frameRateHistory.length === 0) {
            return { average: 0, min: 0, max: 0, recent: 0 };
        }

        const fps = this.frameRateHistory.map(entry => entry.fps);
        const recent = fps.slice(-10); // Last 10 measurements
        
        return {
            average: fps.reduce((sum, fps) => sum + fps, 0) / fps.length,
            min: Math.min(...fps),
            max: Math.max(...fps),
            recent: recent.reduce((sum, fps) => sum + fps, 0) / recent.length,
            history: this.frameRateHistory.slice(-20) // Last 20 for graphing
        };
    }

    /**
     * Enable/disable performance monitoring
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`📊 Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable/disable detailed logging
     */
    setDetailedLogging(enabled) {
        this.detailedLogging = enabled;
        console.log(`🔍 Detailed performance logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set performance thresholds
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('📋 Performance thresholds updated:', this.thresholds);
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.frameRateHistory = [];
        this.memoryBaseline = this.getMemoryUsage();
        this.initializeMetrics();
        console.log('🔄 Performance metrics reset');
    }

    /**
     * Export metrics for external analysis
     */
    exportMetrics() {
        return {
            report: this.getReport(),
            rawMetrics: Object.fromEntries(this.metrics),
            frameHistory: this.frameRateHistory,
            thresholds: this.thresholds
        };
    }

    /**
     * Start performance monitoring session
     */
    startSession(sessionName = 'default') {
        console.log(`🎬 Starting performance session: ${sessionName}`);
        this.reset();
        this.sessionStartTime = Date.now();
        this.sessionName = sessionName;
    }

    /**
     * End performance monitoring session
     */
    endSession() {
        if (!this.sessionStartTime) {
            console.warn('No active performance session');
            return null;
        }

        const sessionDuration = Date.now() - this.sessionStartTime;
        const report = this.getReport();
        
        console.log(`🏁 Performance session ended: ${this.sessionName} (${sessionDuration}ms)`);
        console.log('📊 Session Report:', report);
        
        this.sessionStartTime = null;
        this.sessionName = null;
        
        return {
            name: this.sessionName,
            duration: sessionDuration,
            report
        };
    }
}

export default PerformanceMonitor;