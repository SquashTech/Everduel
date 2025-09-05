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
     * Take full AI turn - SYNCHRONOUS AND SIMPLE
     * Called directly from SimpleGameEngine.doAITurn()
     */
    takeFullTurn() {
        console.log('🤖 SimpleAI takeFullTurn() - SYNCHRONOUS VERSION');
        
        try {
            // AI plays all cards from hand
            this.playAllCards();
            
            // AI attacks with all units
            this.attackWithAllUnits();
            
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
            
            const emptySlot = this.findEmptySlot();
            if (emptySlot === -1) {
                console.log('🤖 Battlefield full, stopping card play');
                break;
            }
            
            console.log(`🤖 Playing ${card.name} to slot ${emptySlot}`);
            
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
     * Attack with all available units - DIRECT METHOD CALLS
     */
    attackWithAllUnits() {
        const state = this.gameState.getState();
        const aiData = state.players[this.playerId];
        const battlefield = aiData.battlefield || [];
        
        console.log('🤖 Attacking with available units');
        
        let attackCount = 0;
        battlefield.forEach((unit, slotIndex) => {
            if (unit && this.canUnitAttack(unit, aiData)) {
                // Ensure unit has proper properties for combat system
                unit.slotIndex = slotIndex;
                unit.owner = this.playerId;
                
                console.log(`🤖 ${unit.name} at slot ${slotIndex} attempting to attack`);
                
                // Get deterministic target and emit combat:attack directly
                const combatSystem = this.gameEngine.systems.get('CombatSystem');
                if (combatSystem) {
                    const target = combatSystem.getDeterministicTarget(unit);
                    if (target) {
                        this.eventBus.emit('combat:attack', {
                            attacker: unit,
                            target: target,
                            attackerSlot: slotIndex,
                            targetSlot: target.slotIndex
                        });
                    }
                }
                
                attackCount++;
            }
        });
        
        console.log(`🤖 Attacked with ${attackCount} units`);
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
     * Check if unit can attack
     */
    canUnitAttack(unit, aiData) {
        if (!unit) return false;
        
        // Check if already attacked (slot-based tracking)
        const hasAttacked = aiData.hasAttacked || [];
        if (hasAttacked.includes(unit.slotIndex)) {
            return false;
        }
        
        // Check summoning sickness - units can't attack turn they're summoned unless Rush
        if (unit.summonedThisTurn && !this.hasRush(unit)) {
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
     * Check if unit has Rush ability
     */
    hasRush(unit) {
        return unit.ability && unit.ability.toLowerCase().includes('rush');
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
}

export default SimpleAISystem;