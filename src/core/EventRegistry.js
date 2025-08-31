/**
 * Centralized Event Registry
 * Manages all game events with type safety, debugging, and performance monitoring
 * Addresses the issue of 159+ untracked events across the codebase
 */
import TypeValidator from '../utils/TypeValidator.js';

class EventRegistry {
    constructor() {
        // Event definitions with validation schemas
        this.eventDefinitions = new Map();
        this.listenerCounts = new Map();
        this.eventHistory = [];
        this.maxHistory = 1000;
        this.debugMode = false;
        this.performanceMonitoring = true;
        this.eventStats = new Map();
        
        this.setupCoreEvents();
        console.log('📋 EventRegistry initialized');
    }

    /**
     * Setup core game event definitions
     */
    setupCoreEvents() {
        // Combat Events
        this.registerEvent('combat:attack-started', {
            required: ['attacker', 'target'],
            optional: ['damage', 'timestamp'],
            description: 'Triggered when a unit begins an attack'
        });

        this.registerEvent('combat:attack-completed', {
            required: ['attacker', 'target', 'damage'],
            optional: ['killed', 'timestamp'],
            description: 'Triggered when an attack is resolved'
        });

        this.registerEvent('combat:damage', {
            required: ['target', 'amount'],
            optional: ['source', 'type', 'timestamp'],
            description: 'Triggered when damage is dealt'
        });

        // Unit Events
        this.registerEvent('unit:placed', {
            required: ['unit', 'playerId', 'slotIndex'],
            optional: ['timestamp'],
            description: 'Triggered when a unit is placed on battlefield'
        });

        this.registerEvent('unit:dies', {
            required: ['unit', 'cause'],
            optional: ['playerId', 'slotIndex', 'timestamp'],
            description: 'Triggered when a unit dies'
        });

        this.registerEvent('unit:stats-changed', {
            required: ['unit', 'changes'],
            optional: ['reason', 'temporary', 'timestamp'],
            description: 'Triggered when unit stats are modified'
        });

        this.registerEvent('unit:survived-damage', {
            required: ['unit', 'damage'],
            optional: ['source', 'timestamp'],
            description: 'Triggered when a unit survives damage'
        });

        this.registerEvent('unit:survived-attacking', {
            required: ['unit'],
            optional: ['target', 'timestamp'],
            description: 'Triggered when a unit survives combat as attacker'
        });

        // Ability Events
        this.registerEvent('ability:unleash', {
            required: ['unit', 'context'],
            optional: ['timestamp'],
            description: 'Triggered when Unleash ability activates'
        });

        this.registerEvent('ability:last-gasp', {
            required: ['unit', 'context'],
            optional: ['timestamp'],
            description: 'Triggered when Last Gasp ability activates'
        });

        this.registerEvent('ability:manacharge', {
            required: ['unit', 'context'],
            optional: ['timestamp'],
            description: 'Triggered when Manacharge ability activates'
        });

        this.registerEvent('ability:manacharge-trigger', {
            required: ['playerId'],
            optional: ['timestamp'],
            description: 'Triggered to activate all Manacharge abilities'
        });

        this.registerEvent('ability:kindred', {
            required: ['unit', 'triggeringUnit', 'context'],
            optional: ['sharedTags', 'timestamp'],
            description: 'Triggered when Kindred ability activates'
        });

        this.registerEvent('ability:activated', {
            required: ['ability', 'unit', 'player'],
            optional: ['effect', 'timestamp'],
            description: 'General ability activation event'
        });

        // Turn Events
        this.registerEvent('turn:started', {
            required: ['playerId'],
            optional: ['turnNumber', 'timestamp'],
            description: 'Triggered at the start of a player turn'
        });

        this.registerEvent('turn:ended', {
            required: ['playerId'],
            optional: ['turnNumber', 'timestamp'],
            description: 'Triggered at the end of a player turn'
        });

        // Card Events
        this.registerEvent('card:played', {
            required: ['card', 'playerId'],
            optional: ['slotIndex', 'timestamp'],
            description: 'Triggered when a card is played'
        });

        this.registerEvent('card:drawn', {
            required: ['card', 'playerId'],
            optional: ['fromDeck', 'timestamp'],
            description: 'Triggered when a card is drawn'
        });

        this.registerEvent('card:discarded', {
            required: ['card', 'playerId'],
            optional: ['reason', 'timestamp'],
            description: 'Triggered when a card is discarded'
        });

        // Player Events
        this.registerEvent('player:damaged', {
            required: ['playerId', 'amount'],
            optional: ['source', 'timestamp'],
            description: 'Triggered when a player takes damage'
        });

        this.registerEvent('player:healed', {
            required: ['playerId', 'amount'],
            optional: ['source', 'timestamp'],
            description: 'Triggered when a player is healed'
        });

        // System Events
        this.registerEvent('system:error', {
            required: ['error', 'component'],
            optional: ['operation', 'severity', 'context', 'timestamp'],
            description: 'Triggered when a system error occurs'
        });

        this.registerEvent('system:warning', {
            required: ['message', 'component'],
            optional: ['context', 'timestamp'],
            description: 'Triggered for system warnings'
        });

        // Game Events
        this.registerEvent('game:started', {
            required: [],
            optional: ['players', 'timestamp'],
            description: 'Triggered when game starts'
        });

        this.registerEvent('game:ended', {
            required: ['winner'],
            optional: ['reason', 'timestamp'],
            description: 'Triggered when game ends'
        });

        // Draft Events
        this.registerEvent('draft:started', {
            required: ['tier', 'options'],
            optional: ['timestamp'],
            description: 'Triggered when draft phase starts'
        });

        this.registerEvent('draft:completed', {
            required: ['selectedCard'],
            optional: ['tier', 'timestamp'],
            description: 'Triggered when draft selection is made'
        });

        // UI Events
        this.registerEvent('ui:card-selected', {
            required: ['card'],
            optional: ['playerId', 'timestamp'],
            description: 'Triggered when a card is selected in UI'
        });

        this.registerEvent('ui:slot-targeted', {
            required: ['slotIndex'],
            optional: ['playerId', 'timestamp'],
            description: 'Triggered when a battlefield slot is targeted'
        });
    }

    /**
     * Register a new event type with validation schema
     */
    registerEvent(eventName, schema) {
        if (this.eventDefinitions.has(eventName)) {
            console.warn(`Event ${eventName} is already registered`);
            return;
        }

        this.eventDefinitions.set(eventName, {
            ...schema,
            registered: Date.now(),
            emitCount: 0
        });

        this.listenerCounts.set(eventName, 0);
        
        if (this.debugMode) {
            console.log(`📝 Registered event: ${eventName}`, schema);
        }
    }

    /**
     * Validate event data against schema
     */
    validateEvent(eventName, data) {
        const definition = this.eventDefinitions.get(eventName);
        
        if (!definition) {
            return {
                valid: false,
                errors: [`Unknown event type: ${eventName}`]
            };
        }

        const errors = [];
        
        // Check required fields
        for (const field of definition.required) {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Type validation for common fields
        if (data.unit && !TypeValidator.validateUnit(data.unit, `event:${eventName}`).valid) {
            errors.push('Invalid unit data');
        }

        if (data.playerId && !['player', 'ai'].includes(data.playerId)) {
            errors.push('Invalid playerId');
        }

        if (data.slotIndex !== undefined && (!Number.isInteger(data.slotIndex) || data.slotIndex < 0 || data.slotIndex > 5)) {
            errors.push('Invalid slotIndex');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Track event emission with validation and monitoring
     */
    trackEmit(eventName, data = {}) {
        // Add timestamp if not present
        if (!data.timestamp) {
            data.timestamp = Date.now();
        }

        // Validate event
        const validation = this.validateEvent(eventName, data);
        if (!validation.valid) {
            console.error(`Event validation failed for ${eventName}:`, validation.errors);
            if (this.debugMode) {
                console.error('Event data:', data);
            }
            return false;
        }

        // Update statistics
        const definition = this.eventDefinitions.get(eventName);
        if (definition) {
            definition.emitCount++;
        }

        // Record in event stats
        if (!this.eventStats.has(eventName)) {
            this.eventStats.set(eventName, {
                count: 0,
                lastEmit: 0,
                avgFrequency: 0,
                errors: 0
            });
        }

        const stats = this.eventStats.get(eventName);
        stats.count++;
        const now = Date.now();
        
        if (stats.lastEmit > 0) {
            const timeDiff = now - stats.lastEmit;
            stats.avgFrequency = (stats.avgFrequency + timeDiff) / 2;
        }
        
        stats.lastEmit = now;

        // Add to history
        this.eventHistory.push({
            eventName,
            data,
            timestamp: now,
            id: `${eventName}-${now}-${Math.random().toString(36).substr(2, 5)}`
        });

        // Trim history if needed
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }

        if (this.debugMode) {
            console.log(`📤 Event emitted: ${eventName}`, data);
        }

        return true;
    }

    /**
     * Track event listener registration
     */
    trackListener(eventName, added = true) {
        const current = this.listenerCounts.get(eventName) || 0;
        this.listenerCounts.set(eventName, current + (added ? 1 : -1));

        if (this.debugMode) {
            console.log(`📥 Listener ${added ? 'added' : 'removed'} for ${eventName}. Total: ${this.listenerCounts.get(eventName)}`);
        }
    }

    /**
     * Get event statistics and health metrics
     */
    getEventStats() {
        const totalEvents = Array.from(this.eventStats.values()).reduce((sum, stat) => sum + stat.count, 0);
        const totalListeners = Array.from(this.listenerCounts.values()).reduce((sum, count) => sum + count, 0);
        
        return {
            registeredEvents: this.eventDefinitions.size,
            totalEmissions: totalEvents,
            totalListeners,
            recentHistory: this.eventHistory.length,
            topEvents: this.getTopEvents(5),
            orphanedEvents: this.getOrphanedEvents(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Get most frequently emitted events
     */
    getTopEvents(limit = 5) {
        return Array.from(this.eventStats.entries())
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, count: stats.count, avgFrequency: Math.round(stats.avgFrequency) }));
    }

    /**
     * Get events with no listeners (potential dead code)
     */
    getOrphanedEvents() {
        return Array.from(this.listenerCounts.entries())
            .filter(([name, count]) => count === 0 && this.eventStats.has(name) && this.eventStats.get(name).count > 0)
            .map(([name]) => name);
    }

    /**
     * Estimate memory usage of event system
     */
    estimateMemoryUsage() {
        try {
            const historySize = JSON.stringify(this.eventHistory).length;
            const definitionsSize = JSON.stringify(Object.fromEntries(this.eventDefinitions)).length;
            return Math.round((historySize + definitionsSize) / 1024) + ' KB';
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Enable debug mode with detailed logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 Event debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get event definition for documentation
     */
    getEventDefinition(eventName) {
        return this.eventDefinitions.get(eventName);
    }

    /**
     * Get all event definitions for documentation
     */
    getAllEventDefinitions() {
        return Object.fromEntries(this.eventDefinitions);
    }

    /**
     * Clean up old event history
     */
    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const originalLength = this.eventHistory.length;
        
        this.eventHistory = this.eventHistory.filter(event => event.timestamp > oneHourAgo);
        
        if (this.eventHistory.length < originalLength) {
            console.log(`🧹 EventRegistry cleaned up ${originalLength - this.eventHistory.length} old events`);
        }
    }

    /**
     * Export event definitions as documentation
     */
    exportDocumentation() {
        const docs = {};
        
        for (const [eventName, definition] of this.eventDefinitions.entries()) {
            docs[eventName] = {
                description: definition.description,
                required: definition.required,
                optional: definition.optional,
                emitCount: definition.emitCount
            };
        }
        
        return docs;
    }
}

export default EventRegistry;