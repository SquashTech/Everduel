/**
 * Optimized UI Manager
 * Eliminates redundant UI updates and excessive logging
 */
import OptimizedUpdater from '../utils/OptimizedUpdater.js';

export default class OptimizedUIManager {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.components = [];
        this.isInitialized = false;
        
        this.optimizedUpdater = null;
        this.lastUpdateState = null;
        this.updateCount = 0;
        this.duplicateUpdatesPrevented = 0;
    }

    initialize() {
        this.optimizedUpdater = new OptimizedUpdater(this.eventBus);
        this.setupOptimizedEventHandlers();
        this.isInitialized = true;
        console.log('⚡ OptimizedUIManager initialized');
    }

    /**
     * Setup event handlers with intelligent batching
     */
    setupOptimizedEventHandlers() {
        // Batch UI updates instead of updating on every state change
        this.eventBus.on('state:changed', () => {
            this.optimizedUpdater.requestUIUpdate('state:changed');
        });
        
        this.eventBus.on('ui:refresh', () => {
            this.optimizedUpdater.requestUIUpdate('ui:refresh');
        });

        // Handle batched UI updates
        this.eventBus.on('batch:ui-update', () => {
            this.executeUIUpdate();
        });

        // Immediate updates for critical events (no batching)
        this.eventBus.on('draft:options-ready', (data) => this.handleDraftOptionsReady(data));
        this.eventBus.on('draft:completed', () => this.handleDraftCompleted());
    }

    /**
     * Execute UI update with duplicate detection
     */
    executeUIUpdate() {
        if (!this.isInitialized) return;
        
        const state = this.gameState.getState();
        
        // Check if state actually changed from last update
        if (this.hasStateChanged(state)) {
            this.updateCount++;
            console.log(`🔄 UI update #${this.updateCount} - Player: ${state.currentPlayer}, Turn: ${state.turn}`);
            
            this.components.forEach(component => {
                if (component.update) {
                    try {
                        component.update();
                    } catch (error) {
                        console.error(`❌ Error updating component ${component.constructor.name}:`, error);
                    }
                }
            });
            
            this.lastUpdateState = this.createStateSignature(state);
        } else {
            this.duplicateUpdatesPrevented++;
            console.log(`⏭️ Skipped duplicate UI update (prevented ${this.duplicateUpdatesPrevented} duplicates)`);
        }
    }

    /**
     * Check if the game state has meaningfully changed
     */
    hasStateChanged(state) {
        if (!this.lastUpdateState) return true;
        
        const currentSignature = this.createStateSignature(state);
        return currentSignature !== this.lastUpdateState;
    }

    /**
     * Create a signature of the current state for comparison
     */
    createStateSignature(state) {
        // Create a hash of the meaningful state properties
        const significantState = {
            currentPlayer: state.currentPlayer,
            turn: state.turn,
            phase: state.phase,
            playerHealth: state.players?.player?.health,
            aiHealth: state.players?.ai?.health,
            playerGold: state.players?.player?.gold,
            aiGold: state.players?.ai?.gold,
            playerHandCount: state.players?.player?.hand?.length,
            aiHandCount: state.players?.ai?.hand?.length,
            // Battlefield signatures (unit count and health totals)
            playerBattlefield: this.createBattlefieldSignature(state.players?.player?.battlefield),
            aiBattlefield: this.createBattlefieldSignature(state.players?.ai?.battlefield)
        };
        
        return JSON.stringify(significantState);
    }

    /**
     * Create a compact signature of the battlefield state
     */
    createBattlefieldSignature(battlefield) {
        if (!battlefield) return '';
        
        return battlefield.map(unit => {
            if (!unit) return 'null';
            return `${unit.name}:${unit.currentHealth || unit.health}:${unit.hasAttacked ? 'A' : 'R'}`;
        }).join('|');
    }

    /**
     * Add component with validation
     */
    addComponent(component) {
        if (!component) {
            console.warn('⚠️ Attempted to add null component to UIManager');
            return;
        }
        
        this.components.push(component);
        console.log(`✅ Added component: ${component.constructor.name}`);
    }

    /**
     * Update all components (legacy method for compatibility)
     */
    updateAllComponents() {
        this.optimizedUpdater.requestUIUpdate('updateAllComponents');
    }

    /**
     * Force immediate update (bypasses batching)
     */
    forceUpdate() {
        console.log('⚡ Force updating UI (bypassing batching)');
        this.lastUpdateState = null; // Force state change detection
        this.executeUIUpdate();
    }

    /**
     * Handle draft options ready (immediate update)
     */
    handleDraftOptionsReady(data) {
        console.log('🃏 Draft options ready - immediate UI update');
        this.forceUpdate();
    }

    /**
     * Handle draft completed (immediate update)
     */
    handleDraftCompleted() {
        console.log('✅ Draft completed - immediate UI update');
        this.forceUpdate();
    }

    /**
     * Get efficiency metrics
     */
    getEfficiencyMetrics() {
        return {
            totalUpdates: this.updateCount,
            duplicatesPrevented: this.duplicateUpdatesPrevented,
            preventionRatio: this.duplicateUpdatesPrevented / (this.updateCount + this.duplicateUpdatesPrevented),
            componentsManaged: this.components.length,
            optimizedUpdater: this.optimizedUpdater.getStats()
        };
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.optimizedUpdater.setDebugMode(true);
        console.log('🐛 OptimizedUIManager debug mode enabled');
    }

    /**
     * Print efficiency report
     */
    printEfficiencyReport() {
        const metrics = this.getEfficiencyMetrics();
        console.log('📊 UI Efficiency Report:');
        console.log(`  • Total UI updates: ${metrics.totalUpdates}`);
        console.log(`  • Duplicates prevented: ${metrics.duplicatesPrevented}`);
        console.log(`  • Prevention ratio: ${(metrics.preventionRatio * 100).toFixed(1)}%`);
        console.log(`  • Components managed: ${metrics.componentsManaged}`);
    }

    /**
     * Reset efficiency counters
     */
    resetEfficiencyCounters() {
        this.updateCount = 0;
        this.duplicateUpdatesPrevented = 0;
        this.lastUpdateState = null;
        console.log('🔄 UI efficiency counters reset');
    }
}