/**
 * Base class for all ability handlers
 * Provides common functionality and enforces consistent patterns
 */
import ErrorHandler from '../../core/ErrorHandler.js';

export default class BaseAbilityHandler {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.combatSystem = null;
        this.errorHandler = null;
    }

    /**
     * Initialize the handler with required dependencies
     */
    initialize(gameEngine, eventBus, gameState) {
        this.gameEngine = gameEngine;
        this.eventBus = eventBus;
        this.gameState = gameState;
        this.errorHandler = new ErrorHandler(this.eventBus);
        
        if (this.gameEngine) {
            this.combatSystem = this.gameEngine.getSystem('CombatSystem');
        }
        
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers - to be overridden by subclasses
     */
    setupEventHandlers() {
        // Override in subclasses
    }

    /**
     * Safe execution wrapper with error handling
     */
    safeExecute(operation, context = {}) {
        try {
            return operation();
        } catch (error) {
            console.error(`Error in ${this.constructor.name}:`, error);
            this.errorHandler?.handleError(error, context);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current game state
     */
    getCurrentState() {
        return this.gameState?.getCurrentState() || {};
    }

    /**
     * Emit event safely
     */
    emitEvent(eventName, data) {
        if (this.eventBus) {
            this.eventBus.emit(eventName, data);
        }
    }

    /**
     * Log with handler context
     */
    log(message, data = {}) {
        console.log(`[${this.constructor.name}] ${message}`, data);
    }
}