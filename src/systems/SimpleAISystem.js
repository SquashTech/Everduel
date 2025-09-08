/**
 * Simple AI System - NO ASYNC, NO EVENTS, NO DELAYS
 * Based on REBUILD_GAME_ENGINE_ONLY.md
 */
class SimpleAISystem {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.playerId = 'ai';
        this.isInitialized = false;
        
        console.log('🤖 SimpleAISystem constructor - NO COMPLEXITY');
    }

    /**
     * Initialize the AI system
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        // Listen for draft options - AI auto-selects immediately ONLY during AI turn
        this.eventBus.on('draft:options-ready', (data) => {
            const state = this.gameState.getState();
            // Only respond if it's AI's draft AND it's AI's turn
            if (data.playerId === this.playerId && state.currentPlayer === this.playerId) {
                console.log('🤖 AI responding to draft options');
                // No delay - make choice immediately to avoid race conditions
                this.makeDraftChoice(data);
            } else if (data.playerId === this.playerId) {
                console.log('🤖 AI ignoring draft options - not AI turn');
            }
        });
        
        this.isInitialized = true;
        console.log('🤖 SimpleAISystem initialized');
    }

    /**
     * Take full AI turn - NOW WITH DELAYS
     * Called directly from SimpleGameEngine.doAITurn()
     */
    async takeFullTurn() {
        console.log('🤖 SimpleAI takeFullTurn() - WITH DELAYS VERSION');
        
        try {
            // AI plays all cards from hand
            this.playAllCards();
            
            // Wait a bit before attacking
            await this.delay(500);
            
            // AI attacks with all units (now has internal delays)
            await this.attackWithAllUnits();
            
            console.log('🤖 SimpleAI turn completed');
            
        } catch (error) {
            console.error('🤖 SimpleAI error:', error);
        }
    }

    /**
     * Play all cards from hand - DIRECT METHOD CALLS
     */
    playAllCards() {
        const state = this.gameState.getState();
        const aiData = state.players[this.playerId];
        const hand = [...(aiData.hand || [])]; // Copy to avoid modification issues
        
        console.log(`🤖 Playing ${hand.length} cards from hand`);
        
        if (hand.length === 0) {
            console.log('🤖 No cards to play');
            return;
        }
        
        // Play up to 3 cards to avoid battlefield overflow
        const maxCards = Math.min(3, hand.length);
        let cardsPlayed = 0;
        
        for (let i = 0; i < maxCards; i++) {
            const card = hand[i];
            if (!card) continue;
            
            // Check if card has a preferred column (for scripted scenarios)
            let emptySlot;
            if (card.preferredColumn) {
                emptySlot = this.findEmptySlotInColumn(card.preferredColumn);
                // If preferred column is full, fall back to any empty slot
                if (emptySlot === -1) {
                    emptySlot = this.findEmptySlot();
                }
            } else {
                emptySlot = this.findEmptySlot();
            }
            
            if (emptySlot === -1) {
                console.log('🤖 Battlefield full, stopping card play');
                break;
            }
            
            console.log(`🤖 Playing ${card.name} to slot ${emptySlot}${card.preferredColumn ? ` (preferred ${card.preferredColumn} column)` : ''}`);
            
            // Play card using event (existing CardSystem will handle it)
            this.eventBus.emit('card:play', {
                playerId: this.playerId,
                card: card,
                slotIndex: emptySlot
            });
            
            cardsPlayed++;
        }
        
        console.log(`🤖 Played ${cardsPlayed} cards`);
    }

    /**
     * Play cards from hand - SIMPLE VERSION (alias for compatibility)
     */
    playCardsFromHand() {
        this.playAllCards();
    }

    /**
     * Attack with all available units - WITH DELAYS FOR READABILITY
     */
    async attackWithAllUnits() {
        const state = this.gameState.getState();
        const aiData = state.players[this.playerId];
        const battlefield = aiData.battlefield || [];
        
        console.log('🤖 Attacking with available units');
        
        // Collect all units that can attack
        const attackingUnits = [];
        battlefield.forEach((unit, slotIndex) => {
            if (unit && this.canUnitAttack(unit, aiData)) {
                // Create a copy of the unit with proper properties to avoid reference issues
                const attackingUnit = {
                    ...unit,
                    slotIndex: slotIndex,
                    owner: this.playerId
                };
                attackingUnits.push({ unit: attackingUnit, slotIndex });
            }
        });
        
        // Attack with each unit sequentially with delays
        let attacksExecuted = 0;
        for (const { unit: originalUnit, slotIndex } of attackingUnits) {
            // Get fresh state for each attack to ensure turn is still valid
            const currentState = this.gameState.getState();
            
            // Double-check it's still AI's turn (in case of any async issues)
            if (currentState.currentPlayer !== this.playerId) {
                console.log(`🤖 Turn changed during AI attacks, stopping`);
                break;
            }
            
            // Get fresh unit data from current battlefield state (critical for post-delay accuracy)
            const currentAiData = currentState.players[this.playerId];
            const freshUnit = currentAiData.battlefield[slotIndex];
            
            // Skip if unit no longer exists or has been replaced
            if (!freshUnit || freshUnit.name !== originalUnit.name) {
                console.log(`🤖 Unit at slot ${slotIndex} changed/removed during attacks, skipping`);
                continue;
            }
            
            // Re-validate if this unit can still attack with fresh data
            if (!this.canUnitAttack(freshUnit, currentAiData)) {
                console.log(`🤖 ${freshUnit.name} at slot ${slotIndex} can no longer attack, skipping`);
                continue;
            }
            
            console.log(`🤖 ${freshUnit.name} at slot ${slotIndex} attempting to attack (owner: ${freshUnit.owner})`);
            
            // Ensure owner is absolutely set before emitting attack
            if (!freshUnit.owner) {
                console.error(`🤖 ERROR: Unit ${freshUnit.name} missing owner! Setting to ${this.playerId}`);
                freshUnit.owner = this.playerId;
            }
            
            // Get deterministic target and emit combat:attack directly
            const combatSystem = this.gameEngine.systems.get('CombatSystem');
            if (combatSystem) {
                const target = combatSystem.getDeterministicTarget(freshUnit);
                if (target) {
                    this.eventBus.emit('combat:attack', {
                        attacker: { ...freshUnit, owner: this.playerId }, // Use fresh unit data
                        target: target,
                        attackerSlot: slotIndex,
                        targetSlot: target.slotIndex
                    });
                    
                    attacksExecuted++;
                    
                    // Wait for attack animation to complete instead of arbitrary delay
                    const animationManager = this.gameEngine.systems.get('AnimationManager');
                    if (animationManager) {
                        const attackerId = freshUnit.unitId || `${this.playerId}-${slotIndex}`;
                        await animationManager.waitForAttackerAnimation(attackerId);
                    } else {
                        // Fallback to delay if animation system not available
                        await this.delay(800);
                    }
                } else {
                    console.log(`🤖 No target found for ${freshUnit.name}, skipping attack`);
                }
            }
        }
        
        console.log(`🤖 Attack phase complete: ${attacksExecuted}/${attackingUnits.length} attacks executed (${attackingUnits.length - attacksExecuted} skipped due to state changes)`);
    }

    /**
     * Find empty battlefield slot - randomized placement
     */
    findEmptySlot() {
        const state = this.gameState.getState();
        const battlefield = state.players[this.playerId].battlefield || [];
        
        // Find all empty slots
        const emptySlots = [];
        for (let i = 0; i < 6; i++) {
            if (!battlefield[i]) {
                emptySlots.push(i);
            }
        }
        
        // Return random empty slot or -1 if battlefield is full
        if (emptySlots.length === 0) {
            return -1;
        }
        
        const randomIndex = Math.floor(Math.random() * emptySlots.length);
        return emptySlots[randomIndex];
    }

    /**
     * Find empty slot in a specific column (for scripted scenarios)
     */
    findEmptySlotInColumn(column) {
        const state = this.gameState.getState();
        const battlefield = state.players[this.playerId].battlefield || [];
        
        // Define column slots
        // Battlefield layout: [0,1,2] front row, [3,4,5] back row
        // Columns: left=[0,3], middle=[1,4], right=[2,5]
        let columnSlots;
        if (column === 'left') {
            columnSlots = [0, 3]; // Front left, back left
        } else if (column === 'middle') {
            columnSlots = [1, 4]; // Front middle, back middle
        } else if (column === 'right') {
            columnSlots = [2, 5]; // Front right, back right
        } else {
            // Invalid column, fall back to regular empty slot
            return this.findEmptySlot();
        }
        
        // Find empty slots in the specified column
        const emptyColumnSlots = columnSlots.filter(slot => !battlefield[slot]);
        
        if (emptyColumnSlots.length === 0) {
            return -1; // Column is full
        }
        
        // Return first available slot in column (front row preferred)
        return emptyColumnSlots[0];
    }

    /**
     * Check if unit can attack - aligned with Combat System logic
     */
    canUnitAttack(unit, aiData) {
        if (!unit) return false;
        
        // Check if already attacked (slot-based tracking)
        const hasAttacked = aiData.hasAttacked || [];
        if (hasAttacked.includes(unit.slotIndex)) {
            console.log(`🤖 ${unit.name} already attacked this turn`);
            return false;
        }
        
        // Check summoning sickness - use same logic as Combat System
        if (!unit.canAttack && !this.hasAbility(unit, 'Rush')) {
            console.log(`🤖 ${unit.name} has summoning sickness (canAttack: ${unit.canAttack}, Rush: ${this.hasAbility(unit, 'Rush')})`);
            return false;
        }
        
        return true;
    }

    /**
     * Find attack target - prioritize enemy units, then player
     */
    findAttackTarget() {
        const state = this.gameState.getState();
        const enemyBattlefield = state.players.player.battlefield || [];
        
        // Attack first available enemy unit
        for (let i = 0; i < enemyBattlefield.length; i++) {
            const unit = enemyBattlefield[i];
            if (unit) {
                return { 
                    type: 'unit', 
                    unit, 
                    slotIndex: i, 
                    playerId: 'player',
                    name: unit.name
                };
            }
        }
        
        // Attack player if no units
        return { 
            type: 'player', 
            playerId: 'player',
            name: 'player'
        };
    }

    /**
     * Check if unit has a specific ability - aligned with other systems
     */
    hasAbility(unit, ability) {
        return unit.ability && unit.ability.toLowerCase().includes(ability.toLowerCase());
    }

    /**
     * Check if unit has Rush ability
     */
    hasRush(unit) {
        return this.hasAbility(unit, 'Rush');
    }


    /**
     * Make draft choice when options are ready
     */
    makeDraftChoice(data) {
        const { options, tier } = data;
        if (!options || options.length === 0) {
            return;
        }

        const state = this.gameState.getState();
        console.log(`🤖 AI making draft choice for tier ${tier} on turn ${state.turn}`);

        // Pick card with highest combined stats
        let bestCard = options[0];
        let bestScore = (bestCard.attack || 0) + (bestCard.health || 0);
        
        for (const card of options) {
            const score = (card.attack || 0) + (card.health || 0);
            if (score > bestScore) {
                bestCard = card;
                bestScore = score;
            }
        }

        console.log(`🤖 AI selects ${bestCard.name} (${bestCard.attack}/${bestCard.health}) from ${options.length} tier ${tier} options`);
        
        this.eventBus.emit('draft:select', {
            selectedCard: bestCard,
            playerId: this.playerId
        });
    }
    
    /**
     * Helper method for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default SimpleAISystem;