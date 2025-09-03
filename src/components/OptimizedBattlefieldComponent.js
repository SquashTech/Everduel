/**
 * Optimized Battlefield Component
 * Eliminates redundant stats recalculations and excessive logging
 */
import OptimizedUpdater from '../utils/OptimizedUpdater.js';
import StatCalculator from '../utils/StatCalculator.js';

export default class OptimizedBattlefieldComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.optimizedUpdater = null;
        
        // Core battlefield functionality
        this.draggedCard = null;
        this.selectedAttacker = null;
        this.validTargets = [];
        this.lastClickTime = 0;
        this.lastClickSlot = null;
        this.clickDebounceMs = 250;
        this.isProcessingPlacement = false;
        this.justDropped = false;
        this.placingCardAt = null;
        this.globalClickBlocked = false;
        this.statCalculator = new StatCalculator();
        
        // Optimization features
        this.logThrottleMap = new Map();
        this.logThrottleInterval = 1000; // 1 second between same messages
    }

    initialize() {
        this.statCalculator.initialize(this.gameState);
        this.optimizedUpdater = new OptimizedUpdater(this.eventBus);
        this.setupOptimizedEventHandlers();
        this.setupDragAndDrop();
        this.setupClickHandlers();
        this.initializeSlotBuffs();
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

        this.eventBus.on('unit:dies', (data) => this.handleUnitDeath(data));
        
        this.eventBus.on('combat:attack-completed', (data) => {
            this.updateAfterAttack(data);
            setTimeout(() => this.updateAttackableUnits(), 600);
        });
        
        this.eventBus.on('slot:buff-updated', (data) => this.updateSlotBuff(data));
        this.eventBus.on('unit:stats-updated', (data) => this.handleUnitStatsUpdate(data));

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

    /**
     * Main update method called by UIManager
     */
    update(state) {
        if (!state) return;
        this.renderBattlefield(state);
        this.updateAttackableUnits();
    }

    /**
     * Render the battlefield display
     */
    renderBattlefield(state) {
        ['player', 'ai'].forEach(playerId => {
            const battlefield = state.players[playerId].battlefield;
            battlefield.forEach((unit, slotIndex) => {
                this.renderUnit(unit, playerId, slotIndex);
            });
        });
    }

    /**
     * Render a single unit in a slot
     */
    renderUnit(unit, playerId, slotIndex) {
        const slotElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"]`);
        if (!slotElement) return;

        if (!unit) {
            slotElement.innerHTML = '';
            slotElement.classList.remove('occupied', 'attackable');
            return;
        }

        slotElement.classList.add('occupied');
        slotElement.innerHTML = `
            <div class="unit-card">
                <div class="unit-name">${unit.name}</div>
                <div class="unit-stats">
                    <span class="unit-attack">${unit.effectiveAttack || unit.currentAttack || unit.attack}</span>
                    /
                    <span class="unit-health">${unit.effectiveHealth || unit.currentHealth || unit.health}</span>
                </div>
                ${unit.ability ? `<div class="unit-ability">${unit.ability}</div>` : ''}
            </div>
        `;
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const playerSlots = document.querySelectorAll('[data-player="player"][data-slot]');
        playerSlots.forEach((slot, index) => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                this.handleCardDrop(e, index);
            });
        });
    }

    /**
     * Setup click handlers for unit selection and attacks
     */
    setupClickHandlers() {
        const allSlots = document.querySelectorAll('[data-player][data-slot]');
        allSlots.forEach((slot, index) => {
            const playerId = slot.getAttribute('data-player');
            const slotIndex = parseInt(slot.getAttribute('data-slot'));
            
            slot.addEventListener('click', (e) => {
                this.handleSlotClick(e, playerId, slotIndex);
            });
        });
    }

    /**
     * Handle card drop on battlefield slot
     */
    handleCardDrop(e, slotIndex) {
        const cardData = e.dataTransfer.getData('application/json');
        if (!cardData) return;

        const card = JSON.parse(cardData);
        this.eventBus.emit('card:play-requested', {
            card: card,
            slotIndex: slotIndex,
            playerId: 'player'
        });
    }

    /**
     * Handle slot click for unit selection and attacks
     */
    handleSlotClick(e, playerId, slotIndex) {
        if (this.globalClickBlocked || this.isProcessingPlacement) return;

        const state = this.gameState.getState();
        const unit = state.players[playerId]?.battlefield[slotIndex];

        // If player unit and can attack, select as attacker
        if (playerId === 'player' && unit && !unit.hasAttacked && !unit.justPlaced) {
            this.selectAttacker(unit, slotIndex);
        }
        // If enemy unit and we have attacker selected, attack
        else if (playerId === 'ai' && this.selectedAttacker) {
            this.executeAttack(this.selectedAttacker, unit, slotIndex);
        }
    }

    /**
     * Select unit as attacker
     */
    selectAttacker(unit, slotIndex) {
        this.selectedAttacker = { unit, slotIndex };
        this.highlightValidTargets();
        console.log(`⚔️ Selected ${unit.name} as attacker`);
    }

    /**
     * Execute attack between units
     */
    executeAttack(attacker, target, targetSlotIndex) {
        this.eventBus.emit('combat:attack-requested', {
            attackerId: 'player',
            attackerSlotIndex: attacker.slotIndex,
            targetId: 'ai',
            targetSlotIndex: targetSlotIndex
        });
        
        this.clearSelection();
    }

    /**
     * Clear attacker selection
     */
    clearSelection() {
        this.selectedAttacker = null;
        this.validTargets = [];
        document.querySelectorAll('.selected, .valid-target').forEach(el => {
            el.classList.remove('selected', 'valid-target');
        });
    }

    /**
     * Highlight valid attack targets
     */
    highlightValidTargets() {
        const aiSlots = document.querySelectorAll('[data-player="ai"][data-slot]');
        aiSlots.forEach(slot => slot.classList.add('valid-target'));
    }

    /**
     * Initialize slot buffs display
     */
    initializeSlotBuffs() {
        // Initialize empty slot buffs for both players
        ['player', 'ai'].forEach(playerId => {
            for (let i = 0; i < 6; i++) {
                this.updateSlotBuffDisplay(playerId, i, { attack: 0, health: 0 });
            }
        });
    }

    /**
     * Handle unit death
     */
    handleUnitDeath(data) {
        setTimeout(() => {
            this.updateAttackableUnits();
            if (this.unitHasAuraEffect(data.unit)) {
                this.optimizedUpdater.requestStatsRecalculation('unit:dies-aura');
            }
        }, 300);
    }

    /**
     * Update after attack completion
     */
    updateAfterAttack(data) {
        this.clearSelection();
        // Force update display after attack
        const state = this.gameState.getState();
        this.renderBattlefield(state);
    }

    /**
     * Update slot buff display
     */
    updateSlotBuff(data) {
        this.updateSlotBuffDisplay(data.playerId, data.slotIndex, data.buff);
    }

    /**
     * Update slot buff display
     */
    updateSlotBuffDisplay(playerId, slotIndex, buff) {
        const slotElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"]`);
        if (!slotElement) return;

        // Add buff indicator if buffs exist
        if (buff.attack > 0 || buff.health > 0) {
            let buffElement = slotElement.querySelector('.slot-buff');
            if (!buffElement) {
                buffElement = document.createElement('div');
                buffElement.className = 'slot-buff';
                slotElement.appendChild(buffElement);
            }
            buffElement.textContent = `+${buff.attack}/+${buff.health}`;
        }
    }

    /**
     * Handle unit stats update
     */
    handleUnitStatsUpdate(data) {
        this.optimizedUpdater.requestStatsRecalculation('unit:stats-updated');
    }

    /**
     * Show attack animation
     */
    showAttackAnimation(attacker, target) {
        console.log(`⚔️ ${attacker.name} attacks ${target.name}`);
        // Simplified animation - could be enhanced
        const attackerElement = document.querySelector(`[data-player="player"][data-slot="${attacker.slotIndex}"]`);
        if (attackerElement) {
            attackerElement.classList.add('attacking');
            setTimeout(() => {
                attackerElement.classList.remove('attacking');
            }, 500);
        }
    }
}