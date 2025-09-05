/**
 * Enhanced Game State Management
 * Improved version of GameState with better memory management and performance
 * Addresses unbounded history growth and adds intelligent cleanup strategies
 */
import TypeValidator from '../utils/TypeValidator.js';

class EnhancedGameState {
    constructor(initialState = null, options = {}) {
        this.state = initialState || this.getInitialState();
        this.history = [{ state: this.state, timestamp: Date.now(), checksum: this.calculateChecksum(this.state) }];
        
        // Enhanced history management options
        this.maxHistory = options.maxHistory || 50;
        this.compactHistory = options.compactHistory !== false; // Default true
        this.compactThreshold = options.compactThreshold || 0.8; // Compact when 80% full
        this.criticalStates = new Set(); // States that should not be compacted
        this.memoryLimit = options.memoryLimit || 5 * 1024 * 1024; // 5MB default
        
        // Performance tracking
        this.stateChangeCount = 0;
        this.lastCleanup = Date.now();
        this.cleanupInterval = options.cleanupInterval || 30000; // 30 seconds
        
        this.reducers = new Map();
        this.middleware = [];
        this.validators = new Map();
        
        this.setupDefaultReducers();
        this.setupValidators();
        
        console.log('🎮 EnhancedGameState initialized with memory-safe history management');
    }

    /**
     * Get the initial game state
     */
    getInitialState() {
        return {
            currentPlayer: 'player',
            phase: 'play',
            turn: 1,
            players: {
                player: {
                    health: 30,
                    gold: 2,
                    maxGold: 2,
                    hand: [],
                    deck: [],
                    battlefield: Array(6).fill(null),
                    hasAttacked: [],
                    slotBuffs: Array(6).fill(null).map(() => ({attack: 0, health: 0}))
                },
                ai: {
                    health: 30,
                    gold: 2,
                    maxGold: 2,
                    hand: [],
                    deck: [],
                    battlefield: Array(6).fill(null),
                    hasAttacked: [],
                    slotBuffs: Array(6).fill(null).map(() => ({attack: 0, health: 0}))
                }
            },
            draftOptions: [],
            currentDraftTier: null,
            draggedCard: null,
            globalEffects: {},
            dragonFlames: { player: 0, ai: 0 }
        };
    }

    /**
     * Enhanced dispatch with validation and intelligent history management
     */
    dispatch(action) {
        // Validate action structure
        if (!action || typeof action.type !== 'string') {
            console.error('Invalid action dispatched:', action);
            return this.state;
        }

        // Run middleware
        for (const middleware of this.middleware) {
            action = middleware(action, this.state) || action;
        }

        const reducer = this.reducers.get(action.type);
        if (!reducer) {
            console.warn(`No reducer found for action type: ${action.type}`);
            return this.state;
        }

        const newState = reducer(this.state, action);
        
        // Validate new state if validator exists
        const validator = this.validators.get(action.type);
        if (validator) {
            const validationResult = validator(newState, action);
            if (!validationResult.valid) {
                console.error(`State validation failed for ${action.type}:`, validationResult.errors);
                return this.state; // Reject invalid state changes
            }
        }

        if (newState === this.state) {
            return this.state;
        }

        this.state = newState;
        this.stateChangeCount++;
        
        // Enhanced history management
        this.addToHistory(action);
        
        // Periodic cleanup check
        this.checkForCleanup();

        return this.state;
    }

    /**
     * Add state to history with intelligent memory management
     */
    addToHistory(action) {
        const timestamp = Date.now();
        const checksum = this.calculateChecksum(this.state);
        const isCritical = this.isCriticalState(action);
        
        const historyEntry = {
            state: this.state,
            timestamp,
            checksum,
            actionType: action.type,
            critical: isCritical
        };
        
        // Mark critical states for preservation
        if (isCritical) {
            this.criticalStates.add(this.history.length);
        }
        
        this.history.push(historyEntry);
        
        // Trigger cleanup if needed
        if (this.history.length >= this.maxHistory * this.compactThreshold) {
            this.compactHistory();
        }
    }

    /**
     * Determine if a state should be preserved as critical
     */
    isCriticalState(action) {
        const criticalActions = [
            'TURN_START',
            'TURN_END', 
            'COMBAT_COMPLETED',
            'UNIT_DIES',
            'GAME_OVER',
            'DRAFT_COMPLETED'
        ];
        
        return criticalActions.includes(action.type);
    }

    /**
     * Compact history by removing non-critical intermediate states
     */
    compactHistory() {
        if (!this.compactHistory || this.history.length <= this.maxHistory) {
            return;
        }

        console.log(`📦 Compacting history: ${this.history.length} → ${this.maxHistory} entries`);
        
        const compactedHistory = [];
        const step = Math.ceil(this.history.length / this.maxHistory);
        
        // Always keep the first state
        compactedHistory.push(this.history[0]);
        
        // Keep critical states and sample others
        for (let i = 1; i < this.history.length - 1; i++) {
            const entry = this.history[i];
            
            if (entry.critical || this.criticalStates.has(i) || i % step === 0) {
                compactedHistory.push(entry);
            }
        }
        
        // Always keep the current state
        compactedHistory.push(this.history[this.history.length - 1]);
        
        // Update critical states indices
        this.criticalStates.clear();
        compactedHistory.forEach((entry, index) => {
            if (entry.critical) {
                this.criticalStates.add(index);
            }
        });
        
        this.history = compactedHistory;
        console.log(`✅ History compacted to ${this.history.length} entries`);
    }

    /**
     * Check if cleanup is needed and perform it
     */
    checkForCleanup() {
        const now = Date.now();
        
        if (now - this.lastCleanup > this.cleanupInterval) {
            this.performCleanup();
            this.lastCleanup = now;
        }
    }

    /**
     * Perform periodic cleanup
     */
    performCleanup() {
        const memoryUsage = this.estimateMemoryUsage();
        
        if (memoryUsage > this.memoryLimit) {
            console.warn(`🧹 Memory usage (${Math.round(memoryUsage / 1024 / 1024)}MB) exceeds limit, triggering cleanup`);
            this.aggressiveCleanup();
        }
        
        // Remove old temporary states
        this.removeExpiredStates();
    }

    /**
     * Aggressive cleanup when memory limit is exceeded
     */
    aggressiveCleanup() {
        // Reduce max history temporarily
        const originalMax = this.maxHistory;
        this.maxHistory = Math.max(10, Math.floor(originalMax * 0.5));
        
        this.compactHistory();
        
        // Restore original max
        this.maxHistory = originalMax;
        
        console.log('🚀 Aggressive cleanup completed');
    }

    /**
     * Remove expired temporary states
     */
    removeExpiredStates() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const originalLength = this.history.length;
        
        // Keep recent states and critical states
        this.history = this.history.filter((entry, index) => {
            return entry.timestamp > oneHourAgo || 
                   entry.critical || 
                   this.criticalStates.has(index) ||
                   index >= this.history.length - 10; // Always keep last 10
        });
        
        if (this.history.length < originalLength) {
            console.log(`🗑️ Removed ${originalLength - this.history.length} expired states`);
        }
    }

    /**
     * Estimate memory usage of history
     */
    estimateMemoryUsage() {
        try {
            return JSON.stringify(this.history).length * 2; // Rough estimate (UTF-16)
        } catch (error) {
            console.warn('Could not estimate memory usage:', error);
            return this.history.length * 1024; // Fallback estimate
        }
    }

    /**
     * Calculate checksum for state integrity
     */
    calculateChecksum(state) {
        try {
            const str = JSON.stringify(state);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Setup state validators
     */
    setupValidators() {
        // Add validator for unit operations
        this.validators.set('PLACE_UNIT', (state, action) => {
            if (action.unit) {
                return TypeValidator.validateUnit(action.unit, 'place-unit');
            }
            return { valid: true };
        });
        
        // Add validator for player damage
        this.validators.set('PLAYER_DAMAGE', (state, action) => {
            if (!action.playerId || !['player', 'ai'].includes(action.playerId)) {
                return { valid: false, errors: ['Invalid playerId'] };
            }
            if (!Number.isInteger(action.amount) || action.amount < 0) {
                return { valid: false, errors: ['Invalid damage amount'] };
            }
            return { valid: true };
        });
    }

    /**
     * Get current state with validation
     */
    getCurrentState() {
        // Validate current state integrity
        const validation = TypeValidator.validateGameState(this.state, 'getCurrentState');
        if (!validation.valid) {
            console.error('Current state validation failed:', validation.errors);
        }
        
        return this.state;
    }

    /**
     * Enhanced undo with integrity checking
     */
    undo() {
        if (this.history.length > 1) {
            const removed = this.history.pop();
            const previous = this.history[this.history.length - 1];
            
            // Verify state integrity
            const expectedChecksum = this.calculateChecksum(previous.state);
            if (previous.checksum !== expectedChecksum) {
                console.error('State corruption detected during undo!');
                this.history.push(removed); // Restore
                return this.state;
            }
            
            this.state = previous.state;
            console.log(`↶ Undid action: ${removed.actionType}`);
        }
        return this.state;
    }

    /**
     * Get memory health metrics
     */
    getHealthMetrics() {
        const memoryUsage = this.estimateMemoryUsage();
        
        return {
            historyLength: this.history.length,
            maxHistory: this.maxHistory,
            memoryUsage: Math.round(memoryUsage / 1024 / 1024 * 100) / 100, // MB
            memoryLimit: Math.round(this.memoryLimit / 1024 / 1024 * 100) / 100, // MB
            stateChangeCount: this.stateChangeCount,
            criticalStates: this.criticalStates.size,
            lastCleanup: new Date(this.lastCleanup).toLocaleTimeString()
        };
    }

    /**
     * Setup default reducers (implement as needed)
     */
    setupDefaultReducers() {
        // Placeholder - implement specific reducers as needed
        this.reducers.set('PLACE_UNIT', (state, action) => {
            // Implement unit placement logic
            return state;
        });
        
        this.reducers.set('PLAYER_DAMAGE', (state, action) => {
            // Implement player damage logic
            return {
                ...state,
                players: {
                    ...state.players,
                    [action.playerId]: {
                        ...state.players[action.playerId],
                        health: Math.max(0, state.players[action.playerId].health - action.amount)
                    }
                }
            };
        });
    }
}

export default EnhancedGameState;