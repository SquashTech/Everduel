/**
 * Optimized Battlefield Component
 * Eliminates redundant stats recalculations and excessive logging
 */
import OptimizedUpdater from '../utils/OptimizedUpdater.js';

export default class OptimizedBattlefieldComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.optimizedUpdater = null;
        
        // Reduce debug logging frequency
        this.logThrottleMap = new Map();
        this.logThrottleInterval = 1000; // 1 second between same messages
    }

    initialize() {
        this.optimizedUpdater = new OptimizedUpdater(this.eventBus);
        this.setupOptimizedEventHandlers();
        console.log('⚡ OptimizedBattlefieldComponent initialized');
    }

    /**
     * Setup event handlers with optimized batching
     */
    setupOptimizedEventHandlers() {
        // Batch stats recalculations
        this.eventBus.on('turn:started', (data) => {
            this.updateAttackableUnits(data);
            this.optimizedUpdater.requestStatsRecalculation('turn:started');
        });

        this.eventBus.on('card:played', (data) => {
            if (data.unit) {
                this.updateAttackableUnits(data);
                // Only recalculate if unit has aura effects
                if (this.unitHasAuraEffect(data.unit)) {
                    this.optimizedUpdater.requestStatsRecalculation('card:played-aura');
                }
            }
        });

        this.eventBus.on('unit:dies', (data) => {
            setTimeout(() => {
                this.updateAttackableUnits();
                // Only recalculate if dead unit had aura effects
                if (this.unitHasAuraEffect(data.unit)) {
                    this.optimizedUpdater.requestStatsRecalculation('unit:dies-aura');
                }
            }, 300);
        });

        // Handle batched updates
        this.eventBus.on('batch:stats-recalculation', () => {
            this.executeStatsRecalculation();
        });

        this.eventBus.on('batch:attackable-units-update', () => {
            this.executeAttackableUnitsUpdate();
        });
    }

    /**
     * Check if unit has aura effects that require stats recalculation
     */
    unitHasAuraEffect(unit) {
        if (!unit || !unit.ability) return false;
        
        const auraKeywords = [
            'all friendly units',
            'all units',
            'give.*units.*+',
            'aura',
            'while this is in play'
        ];
        
        const abilityText = unit.ability.toLowerCase();
        return auraKeywords.some(keyword => abilityText.includes(keyword));
    }

    /**
     * Execute stats recalculation (called by batch processor)
     */
    executeStatsRecalculation() {
        const state = this.gameState.getState();
        
        // Throttle logging
        this.throttledLog('stats-recalc', '📊 Executing batched stats recalculation');
        
        ['player', 'ai'].forEach(playerId => {
            const battlefield = state.players[playerId].battlefield;
            
            battlefield.forEach((unit, slotIndex) => {
                if (unit) {
                    this.recalculateUnitStats(unit, playerId, slotIndex);
                }
            });
        });
    }

    /**
     * Recalculate stats for a single unit (no logging spam)
     */
    recalculateUnitStats(unit, playerId, slotIndex) {
        const state = this.gameState.getState();
        const slotBuff = state.players[playerId].slotBuffs[slotIndex];
        
        // Apply base stats + slot buffs
        const effectiveAttack = (unit.currentAttack || unit.attack) + (slotBuff.attack || 0);
        const effectiveHealth = (unit.currentHealth || unit.health) + (slotBuff.health || 0);
        
        // Only update UI if stats actually changed
        if (unit.effectiveAttack !== effectiveAttack || unit.effectiveHealth !== effectiveHealth) {
            unit.effectiveAttack = effectiveAttack;
            unit.effectiveHealth = effectiveHealth;
            
            this.updateUnitDisplay(unit, playerId, slotIndex);
        }
    }

    /**
     * Update unit display without excessive logging
     */
    updateUnitDisplay(unit, playerId, slotIndex) {
        const unitElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"] .unit-stats`);
        
        if (unitElement) {
            const attackElement = unitElement.querySelector('.unit-attack');
            const healthElement = unitElement.querySelector('.unit-health');
            
            if (attackElement) attackElement.textContent = unit.effectiveAttack;
            if (healthElement) healthElement.textContent = unit.effectiveHealth;
        }
    }

    /**
     * Execute attackable units update (called by batch processor)
     */
    executeAttackableUnitsUpdate() {
        this.throttledLog('attackable-update', '⚔️ Executing batched attackable units update');
        
        const state = this.gameState.getState();
        if (state.currentPlayer !== 'player') return;
        
        const playerBattlefield = state.players.player.battlefield;
        
        playerBattlefield.forEach((unit, slotIndex) => {
            if (unit && !unit.hasAttacked && !unit.justPlaced) {
                this.markUnitAsAttackable(unit, slotIndex);
            }
        });
    }

    /**
     * Mark unit as attackable without spam logging
     */
    markUnitAsAttackable(unit, slotIndex) {
        const unitElement = document.querySelector(`[data-player="player"][data-slot="${slotIndex}"]`);
        if (unitElement && !unitElement.classList.contains('attackable')) {
            unitElement.classList.add('attackable');
            // Only log when actually making a unit attackable
            this.throttledLog(`unit-${unit.name}-attackable`, `⚔️ ${unit.name} can attack`);
        }
    }

    /**
     * Throttled logging to prevent spam
     */
    throttledLog(key, message, data = null) {
        const now = Date.now();
        const lastLogTime = this.logThrottleMap.get(key) || 0;
        
        if (now - lastLogTime > this.logThrottleInterval) {
            console.log(message, data || '');
            this.logThrottleMap.set(key, now);
        }
    }

    /**
     * Update attackable units (legacy method for compatibility)
     */
    updateAttackableUnits(data) {
        this.optimizedUpdater.requestAttackableUnitsUpdate('updateAttackableUnits');
    }

    /**
     * Recalculate all stats (legacy method for compatibility)
     */
    recalculateAllStats() {
        this.optimizedUpdater.requestStatsRecalculation('recalculateAllStats');
    }

    /**
     * Get efficiency metrics
     */
    getEfficiencyMetrics() {
        return {
            optimizedUpdater: this.optimizedUpdater.getStats(),
            throttledLogs: this.logThrottleMap.size,
            throttleInterval: this.logThrottleInterval
        };
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.optimizedUpdater.setDebugMode(true);
        this.logThrottleInterval = 0; // Disable throttling in debug mode
    }

    /**
     * Disable debug mode for production
     */
    disableDebugMode() {
        this.optimizedUpdater.setDebugMode(false);
        this.logThrottleInterval = 1000; // Re-enable throttling
    }
}