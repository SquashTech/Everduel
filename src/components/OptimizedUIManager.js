/**
 * Optimized UI Manager
 * Eliminates redundant UI updates and excessive logging
 */
import OptimizedUpdater from '../utils/OptimizedUpdater.js';
import BattlefieldComponent from './BattlefieldComponent.js';
import HandComponent from './HandComponent.js';
import ControlsComponent from './ControlsComponent.js';
import GameInfoComponent from './GameInfoComponent.js';
import DraftOverlayComponent from './DraftOverlayComponent.js';
import DragonFlameComponent from './DragonFlameComponent.js';
import SoulsComponent from './SoulsComponent.js';

export default class OptimizedUIManager {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.components = new Map();
        this.isInitialized = false;
        
        this.optimizedUpdater = null;
        this.lastUpdateState = null;
        this.updateCount = 0;
        this.duplicateUpdatesPrevented = 0;
    }

    async initialize() {
        this.setupOptimizedEventHandlers();
        this.initializeComponents();
        this.optimizedUpdater = new OptimizedUpdater(this.eventBus);
        this.isInitialized = true;
        console.log('⚡ OptimizedUIManager initialized');
    }

    /**
     * Initialize all UI components
     */
    initializeComponents() {
        // Use working battlefield component with optimized UI manager
        this.components.set('battlefield', new BattlefieldComponent());
        this.components.set('hand', new HandComponent());
        this.components.set('controls', new ControlsComponent());
        this.components.set('gameInfo', new GameInfoComponent());
        this.components.set('draftOverlay', new DraftOverlayComponent());
        this.components.set('dragonFlame', new DragonFlameComponent());
        this.components.set('souls', new SoulsComponent());
        
        // Inject dependencies into each component
        this.components.forEach((component, name) => {
            // Special handling for components which use setDependencies
            if (name === 'dragonFlame' || name === 'souls') {
                component.setDependencies(this.gameState, this.eventBus);
            } else {
                component.gameEngine = this.gameEngine;
                component.eventBus = this.eventBus;
                component.gameState = this.gameState;
                component.uiManager = this;
            }
            
            if (component.initialize) {
                component.initialize();
            }
        });
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
        this.eventBus.on('combat:attack-completed', (data) => this.handleAttackCompleted(data));
        this.eventBus.on('combat:attack-invalid', (data) => this.handleInvalidAttack(data));
        this.eventBus.on('card:played', (data) => this.handleCardPlayed(data));
        this.eventBus.on('turn:started', (data) => this.handleTurnStarted(data));
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
                        component.update(state);
                    } catch (error) {
                        console.error(`❌ Error updating component ${component.constructor.name}:`, error);
                    }
                }
            });
            
            this.lastUpdateState = this.createStateSignature(state);
        } else {
            this.duplicateUpdatesPrevented++;
            // Only log every 10th duplicate to reduce console noise
            if (this.duplicateUpdatesPrevented % 10 === 0) {
                console.log(`⏭️ Skipped duplicate UI updates (prevented ${this.duplicateUpdatesPrevented} total)`);
            }
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
            // Include actual hand cards, not just count
            playerHand: this.createHandSignature(state.players?.player?.hand),
            aiHand: this.createHandSignature(state.players?.ai?.hand),
            // Battlefield signatures (unit count and health totals)
            playerBattlefield: this.createBattlefieldSignature(state.players?.player?.battlefield),
            aiBattlefield: this.createBattlefieldSignature(state.players?.ai?.battlefield),
            // Slot buffs
            playerSlotBuffs: this.createSlotBuffsSignature(state.players?.player?.slotBuffs),
            aiSlotBuffs: this.createSlotBuffsSignature(state.players?.ai?.slotBuffs),
            // Draft state
            draftOptions: state.draftOptions?.length || 0,
            // Game over state
            gameOver: state.gameOver,
            winner: state.winner
        };
        
        return JSON.stringify(significantState);
    }

    /**
     * Create a compact signature of the hand state
     */
    createHandSignature(hand) {
        if (!hand) return '';
        
        return hand.map(card => {
            if (card.type === 'spell') {
                return `S:${card.id}:${card.handId}`;
            }
            return `U:${card.id}:${card.attack}/${card.health}:${card.handId}`;
        }).join('|');
    }

    /**
     * Create a compact signature of slot buffs
     */
    createSlotBuffsSignature(slotBuffs) {
        if (!slotBuffs) return '';
        
        return slotBuffs.map(buff => `${buff.attack}/${buff.health}`).join('|');
    }

    /**
     * Create a compact signature of the battlefield state
     */
    createBattlefieldSignature(battlefield) {
        if (!battlefield) return '';
        
        return battlefield.map(unit => {
            if (!unit) return 'null';
            // Include currentAttack if it exists, otherwise use attack
            const attack = unit.currentAttack !== undefined ? unit.currentAttack : unit.attack;
            const health = unit.currentHealth || unit.health;
            return `${unit.name}:${attack}/${health}:${unit.hasAttacked ? 'A' : 'R'}`;
        }).join('|');
    }

    /**
     * Add component with validation
     */
    addComponent(name, component) {
        if (!component) {
            console.warn('⚠️ Attempted to add null component to UIManager');
            return;
        }
        
        this.components.set(name, component);
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
     * Get a specific component
     * @param {string} name - Component name
     * @returns {Object|null} Component or null if not found
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Handle draft options becoming available
     * @param {Object} data - Draft options data
     */
    handleDraftOptionsReady(data) {
        // Only show draft modal for human player, not AI
        if (data.playerId !== 'player') {
            return;
        }
        
        const draftOverlay = this.getComponent('draftOverlay');
        if (draftOverlay) {
            draftOverlay.showDraftOptions(data.options, data.tier);
        }
        console.log('🃏 Draft options ready - immediate UI update');
    }

    /**
     * Handle draft completion
     */
    handleDraftCompleted() {
        const draftOverlay = this.getComponent('draftOverlay');
        if (draftOverlay) {
            draftOverlay.hideDraftOptions();
        }
        console.log('✅ Draft completed - immediate UI update');
    }

    /**
     * Handle attack completion with visual effects
     * @param {Object} data - Attack data
     */
    handleAttackCompleted(data) {
        const battlefield = this.getComponent('battlefield');
        if (battlefield) {
            battlefield.showAttackAnimation(data.attacker, data.target);
        }
    }

    /**
     * Handle invalid attack attempts
     * @param {Object} data - Invalid attack data
     */
    handleInvalidAttack(data) {
        console.log('🚫 Invalid attack:', data.reason, data.message);
        this.showNotification(data.message, 'warning');
    }

    /**
     * Handle card played event
     * @param {Object} data - Card played data
     */
    handleCardPlayed(data) {
        console.log('🃏 Card played:', data);
        this.optimizedUpdater.requestUIUpdate('card:played');
    }

    /**
     * Handle turn started event
     * @param {Object} data - Turn data
     */
    handleTurnStarted(data) {
        console.log('🔄 Turn started:', data.playerId);
        this.optimizedUpdater.requestUIUpdate('turn:started');
    }

    /**
     * Show attack arrow animation
     * @param {HTMLElement} attackerElement - Attacker element
     * @param {HTMLElement} targetElement - Target element
     */
    showAttackArrow(attackerElement, targetElement) {
        // Simple implementation - delegate to battlefield component
        const battlefield = this.getComponent('battlefield');
        if (battlefield && battlefield.showAttackAnimation) {
            battlefield.showAttackAnimation(
                { element: attackerElement },
                { element: targetElement }
            );
        }
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, warning, error)
     */
    showNotification(message, type = 'info') {
        // Create and show notification (simplified)
        console.log(`📢 [${type.toUpperCase()}] ${message}`);
    }

    /**
     * Get efficiency metrics
     */
    getEfficiencyMetrics() {
        return {
            totalUpdates: this.updateCount,
            duplicatesPrevented: this.duplicateUpdatesPrevented,
            preventionRatio: this.duplicateUpdatesPrevented / (this.updateCount + this.duplicateUpdatesPrevented),
            componentsManaged: this.components.size,
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