/**
 * Modular Ability System
 * Refactored architecture using specialized handlers
 * Replaces the monolithic AbilitySystem with a clean, maintainable structure
 */
import ErrorHandler from '../core/ErrorHandler.js';
import UnleashAbilityHandler from './abilities/UnleashAbilityHandler.js';
import LastGaspAbilityHandler from './abilities/LastGaspAbilityHandler.js';
import ManachargeAbilityHandler from './abilities/ManachargeAbilityHandler.js';
import KindredAbilityHandler from './abilities/KindredAbilityHandler.js';

class ModularAbilitySystem {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.errorHandler = null;
        
        // Initialize specialized handlers
        this.handlers = {
            unleash: new UnleashAbilityHandler(),
            lastGasp: new LastGaspAbilityHandler(),
            manacharge: new ManachargeAbilityHandler(),
            kindred: new KindredAbilityHandler()
        };
        
        this.initialized = false;
    }

    /**
     * Initialize the modular ability system
     */
    initialize() {
        if (this.initialized) {
            console.warn('ModularAbilitySystem already initialized');
            return;
        }

        // Initialize error handler
        this.errorHandler = new ErrorHandler(this.eventBus);
        
        // Initialize all handlers with dependencies
        Object.values(this.handlers).forEach(handler => {
            handler.initialize(this.gameEngine, this.eventBus, this.gameState);
        });
        
        // Set up system-level event handlers
        this.setupSystemEventHandlers();
        
        this.initialized = true;
        console.log('⚡ ModularAbilitySystem initialized with', Object.keys(this.handlers).length, 'handlers');
    }

    /**
     * Setup system-level event handlers
     */
    setupSystemEventHandlers() {
        // Handle general ability triggers that need coordination
        this.eventBus.on('turn:ended', (data) => this.handleEndOfTurn(data));
        this.eventBus.on('turn:started', (data) => this.handleStartOfTurn(data));
        this.eventBus.on('unit:survived-damage', (data) => this.handleSurvivedDamage(data));
        this.eventBus.on('unit:survived-attacking', (data) => this.handleSurvivedAttacking(data));
        this.eventBus.on('combat:attack-completed', (data) => this.handleAfterAttack(data));
        this.eventBus.on('card:played', (data) => this.handleOpponentSummoned(data));
    }

    /**
     * Get a specific handler by type
     */
    getHandler(type) {
        return this.handlers[type] || null;
    }

    /**
     * Add a new handler type (for extensibility)
     */
    addHandler(type, handler) {
        if (this.handlers[type]) {
            console.warn(`Handler ${type} already exists, replacing...`);
        }
        
        this.handlers[type] = handler;
        if (this.initialized) {
            handler.initialize(this.gameEngine, this.eventBus, this.gameState);
        }
        
        console.log(`✨ Added ${type} handler to ModularAbilitySystem`);
    }

    /**
     * Remove a handler type
     */
    removeHandler(type) {
        if (this.handlers[type]) {
            delete this.handlers[type];
            console.log(`🗑️ Removed ${type} handler from ModularAbilitySystem`);
        }
    }

    /**
     * Handle end of turn triggers
     */
    handleEndOfTurn(data) {
        try {
            const { playerId } = data;
            const state = this.gameState.getCurrentState();
            
            if (!state.players || !state.players[playerId]) {
                return;
            }
            
            const battlefield = state.players[playerId].battlefield;
            
            // Process end-of-turn effects for all units
            battlefield.forEach((unit, slotIndex) => {
                if (unit && this.hasEndOfTurnAbility(unit)) {
                    this.processEndOfTurnAbility(unit, playerId, slotIndex);
                }
            });
        } catch (error) {
            console.error('Error in handleEndOfTurn:', error);
            this.errorHandler?.handleError(error, { event: 'turn:ended', data });
        }
    }

    /**
     * Handle start of turn triggers
     */
    handleStartOfTurn(data) {
        try {
            const { playerId } = data;
            console.log(`🌅 Start of turn for ${playerId}`);
            
            // Reset temporary buffs, process start-of-turn abilities, etc.
            this.resetTemporaryEffects(playerId);
            this.processStartOfTurnAbilities(playerId);
        } catch (error) {
            console.error('Error in handleStartOfTurn:', error);
            this.errorHandler?.handleError(error, { event: 'turn:started', data });
        }
    }

    /**
     * Handle unit survived damage (for triggered abilities)
     */
    handleSurvivedDamage(data) {
        try {
            const { unit, damage, source } = data;
            
            if (unit && this.hasSurvivalAbility(unit)) {
                this.processSurvivalAbility(unit, 'damage', { damage, source });
            }
        } catch (error) {
            console.error('Error in handleSurvivedDamage:', error);
            this.errorHandler?.handleError(error, { event: 'unit:survived-damage', data });
        }
    }

    /**
     * Handle unit survived attacking
     */
    handleSurvivedAttacking(data) {
        try {
            const { unit, target } = data;
            
            if (unit && this.hasSurvivalAbility(unit)) {
                this.processSurvivalAbility(unit, 'attacking', { target });
            }
        } catch (error) {
            console.error('Error in handleSurvivedAttacking:', error);
            this.errorHandler?.handleError(error, { event: 'unit:survived-attacking', data });
        }
    }

    /**
     * Handle after attack effects
     */
    handleAfterAttack(data) {
        try {
            const { attacker, target, damage } = data;
            
            // Process post-combat abilities
            if (attacker && this.hasPostCombatAbility(attacker)) {
                this.processPostCombatAbility(attacker, { target, damage });
            }
        } catch (error) {
            console.error('Error in handleAfterAttack:', error);
            this.errorHandler?.handleError(error, { event: 'combat:attack-completed', data });
        }
    }

    /**
     * Handle opponent summoned (for Kindred triggers)
     */
    handleOpponentSummoned(data) {
        try {
            const { unit, playerId } = data;
            
            // Check for Kindred triggers
            this.checkKindredTriggers(unit, playerId);
        } catch (error) {
            console.error('Error in handleOpponentSummoned:', error);
            this.errorHandler?.handleError(error, { event: 'card:played', data });
        }
    }

    /**
     * Check if unit has end-of-turn ability
     */
    hasEndOfTurnAbility(unit) {
        return unit.ability && (
            unit.ability.toLowerCase().includes('end of turn') ||
            unit.ability.toLowerCase().includes('at the end of your turn')
        );
    }

    /**
     * Check if unit has survival-based ability
     */
    hasSurvivalAbility(unit) {
        return unit.ability && (
            unit.ability.toLowerCase().includes('when this takes damage') ||
            unit.ability.toLowerCase().includes('after attacking')
        );
    }

    /**
     * Check if unit has post-combat ability
     */
    hasPostCombatAbility(unit) {
        return unit.ability && (
            unit.ability.toLowerCase().includes('after this attacks') ||
            unit.ability.toLowerCase().includes('when this destroys')
        );
    }

    /**
     * Process end-of-turn ability for a unit
     */
    processEndOfTurnAbility(unit, playerId, slotIndex) {
        console.log(`🌙 Processing end-of-turn ability for ${unit.name}`);
        // Implementation would depend on specific end-of-turn effects
    }

    /**
     * Reset temporary effects at start of turn
     */
    resetTemporaryEffects(playerId) {
        const state = this.gameState.getCurrentState();
        const battlefield = state.players[playerId].battlefield;
        
        battlefield.forEach((unit, slotIndex) => {
            if (unit && unit.temporaryBuffs) {
                // Reset temporary buffs
                this.gameState.addAction({
                    type: 'RESET_TEMPORARY_BUFFS',
                    playerId,
                    slotIndex
                });
            }
        });
    }

    /**
     * Process start-of-turn abilities
     */
    processStartOfTurnAbilities(playerId) {
        // Implementation for start-of-turn triggered abilities
        console.log(`🌅 Processing start-of-turn abilities for ${playerId}`);
    }

    /**
     * Process survival-based abilities
     */
    processSurvivalAbility(unit, triggerType, context) {
        console.log(`💪 ${unit.name} survived ${triggerType}, checking for abilities`);
        // Implementation for survival-triggered abilities
    }

    /**
     * Process post-combat abilities
     */
    processPostCombatAbility(unit, context) {
        console.log(`⚔️ Processing post-combat ability for ${unit.name}`);
        // Implementation for post-combat abilities
    }

    /**
     * Check for Kindred ability triggers
     */
    checkKindredTriggers(newUnit, playerId) {
        const state = this.gameState.getCurrentState();
        const battlefield = state.players[playerId].battlefield;
        
        battlefield.forEach((existingUnit, slotIndex) => {
            if (existingUnit && 
                existingUnit !== newUnit && 
                existingUnit.ability && 
                existingUnit.ability.toLowerCase().includes('kindred:')) {
                
                // Check if units share tags
                if (KindredAbilityHandler.checkKindredTrigger(existingUnit, newUnit)) {
                    this.eventBus.emit('ability:kindred', {
                        unit: existingUnit,
                        triggeringUnit: newUnit,
                        context: { playerId, slotIndex }
                    });
                }
            }
        });
    }

    /**
     * Get system health metrics
     */
    getHealthMetrics() {
        return {
            initialized: this.initialized,
            handlerCount: Object.keys(this.handlers).length,
            handlers: Object.keys(this.handlers),
            errorHandler: !!this.errorHandler
        };
    }
}

export default ModularAbilitySystem;