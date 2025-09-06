/**
 * Card system handling drafting, deck management, and card effects
 * Manages all card-related operations including drafting and hand management
 */
import ErrorHandler from '../core/ErrorHandler.js';
import UnitFactory from '../utils/UnitFactory.js';

class CardSystem {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.errorHandler = null;
        this.draftPools = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        this.globalDraftedCards = new Set();
    }

    /**
     * Initialize the card system
     */
    async initialize() {
        this.errorHandler = new ErrorHandler(this.eventBus);
        this.initializeDraftPools();
        this.setupEventHandlers();
        console.log('🃏 CardSystem initialized');
    }

    /**
     * Initialize draft pools from card database
     */
    initializeDraftPools() {
        const cardDatabase = this.gameEngine.getCardDatabase();
        
        for (let tier = 1; tier <= 5; tier++) {
            this.draftPools[tier] = [];
            if (cardDatabase[tier]) {
                cardDatabase[tier].forEach(card => {
                    this.draftPools[tier].push({
                        ...card, 
                        poolId: `${card.id}_${Date.now()}_${Math.random()}`,
                        tier: tier // Add tier information to each card
                    });
                });
                console.log(`Tier ${tier}: ${this.draftPools[tier].length} cards loaded`);
            }
        }
    }

    /**
     * Setup event handlers for card-related events
     */
    setupEventHandlers() {
        this.eventBus.on('draft:start', (data) => this.handleDraftStart(data));
        this.eventBus.on('draft:select', (data) => this.handleDraftSelection(data));
        this.eventBus.on('draft:reroll', (data) => this.handleDraftReroll(data));
        this.eventBus.on('card:play', (data) => this.handleCardPlay(data));
        this.eventBus.on('card:draw', (data) => this.handleCardDraw(data));
    }

    /**
     * Start a draft for a specific tier
     * @param {Object} data - Draft data containing tier and player
     */
    handleDraftStart(data) {
        const { tier, playerId } = data;
        console.log('🃏 CardSystem: Draft start requested for tier', tier, 'by', playerId);
        
        const state = this.gameState.getState();
        
        // Check if there's already an active draft (e.g., after a reroll)
        if (state.currentDraftTier && state.draftOptions && state.draftOptions.length > 0) {
            console.log('📌 Draft already in progress for tier', state.currentDraftTier, '- showing existing options');
            // Just re-show the existing draft options without charging again
            this.eventBus.emit('draft:options-ready', {
                options: state.draftOptions,
                tier: state.currentDraftTier,
                playerId
            });
            return;
        }
        
        // Validation
        if (!this.canAffordDraft(tier, playerId)) {
            console.log('❌ Draft failed: insufficient gold');
            this.eventBus.emit('draft:failed', { 
                reason: 'insufficient_gold', 
                tier, 
                playerId 
            });
            return;
        }

        const availableCards = this.getAvailableCards(tier);
        console.log('🔍 Available cards for tier', tier, ':', availableCards.length);
        
        if (availableCards.length === 0) {
            console.log('❌ Draft failed: no cards available');
            this.eventBus.emit('draft:failed', { 
                reason: 'no_cards_available', 
                tier, 
                playerId 
            });
            return;
        }

        // Deduct gold immediately when starting draft
        const cost = tier * 2;
        const currentGold = state.players[playerId].gold;
        
        console.log(`💰 Deducting ${cost} gold from ${playerId} (current: ${currentGold})`);
        
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_GOLD',
            payload: {
                playerId,
                gold: currentGold - cost
            }
        });

        // Create draft options
        const draftOptions = availableCards.slice(0, 3);
        console.log('✨ Created draft options:', draftOptions);
        
        this.gameEngine.dispatch({
            type: 'SET_DRAFT_OPTIONS',
            payload: { options: draftOptions, tier }
        });

        console.log('📢 Emitting draft:options-ready event');
        this.eventBus.emit('draft:options-ready', {
            options: draftOptions,
            tier,
            playerId
        });
    }

    /**
     * Handle draft card selection
     * @param {Object} data - Selection data
     */
    handleDraftSelection(data) {
        try {
            const { selectedCard, playerId } = data;
            const state = this.gameState.getState();
            const tier = state.currentDraftTier;
        
        if (!selectedCard || !tier) {
            console.warn('Invalid draft selection');
            return;
        }

        // Note: Gold has already been deducted when the draft started
        // Just check hand limit
        if (state.players[playerId].hand.length >= 3) {
            this.eventBus.emit('draft:failed', { 
                reason: 'hand_full', 
                tier, 
                playerId 
            });
            return;
        }

        // Add card to hand
        this.gameEngine.dispatch({
            type: 'ADD_CARD_TO_HAND',
            payload: {
                playerId,
                card: { ...selectedCard, handId: Date.now() }
            }
        });

        // Mark card as drafted
        this.globalDraftedCards.add(selectedCard.poolId);

        // Clear draft options
        this.gameEngine.dispatch({ type: 'CLEAR_DRAFT' });

        // Calculate the cost that was already paid when draft started
        const cost = tier * 2;

        this.eventBus.emit('draft:completed', {
            selectedCard,
            playerId,
            tier,
            cost
        });
        
        } catch (error) {
            const result = this.errorHandler.handleError(error, {
                selectedCard: data.selectedCard,
                playerId: data.playerId,
                tier: data.tier
            }, {
                operation: 'handleDraftSelection',
                component: 'CardSystem',
                severity: 'high',
                fallback: () => {
                    // Safe fallback: just emit the failure event
                    this.eventBus.emit('draft:failed', {
                        selectedCard: data.selectedCard,
                        playerId: data.playerId,
                        error: error.message,
                        recovered: true
                    });
                }
            });
            
            if (result.action === 'fallback') {
                result.result();
            }
        }
    }

    /**
     * Handle draft reroll
     * @param {Object} data - Reroll data
     */
    handleDraftReroll(data) {
        const { tier, playerId } = data;
        console.log('🎲 CardSystem: Reroll requested for tier', tier, 'by', playerId);
        
        const state = this.gameState.getState();
        
        // Check if player can afford reroll
        if (state.players[playerId].gold < 1) {
            this.eventBus.emit('draft:failed', { 
                reason: 'insufficient_gold_reroll', 
                tier, 
                playerId 
            });
            return;
        }

        // Deduct 1 gold for reroll
        const currentGold = state.players[playerId].gold;
        
        console.log(`💰 Deducting 1 gold for reroll from ${playerId} (current: ${currentGold})`);
        
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_GOLD',
            payload: {
                playerId,
                gold: currentGold - 1
            }
        });

        // Get new draft options
        const availableCards = this.getAvailableCards(tier);
        
        if (availableCards.length === 0) {
            console.log('❌ Reroll failed: no cards available');
            this.eventBus.emit('draft:failed', { 
                reason: 'no_cards_available', 
                tier, 
                playerId 
            });
            return;
        }

        // Create new draft options
        const newDraftOptions = availableCards.slice(0, 3);
        console.log('✨ Created new draft options after reroll:', newDraftOptions);
        
        this.gameEngine.dispatch({
            type: 'SET_DRAFT_OPTIONS',
            payload: { options: newDraftOptions, tier }
        });

        // Emit reroll complete event
        this.eventBus.emit('draft:reroll-complete', {
            options: newDraftOptions,
            tier,
            playerId
        });
    }

    /**
     * Handle card play
     * @param {Object} data - Play data
     */
    handleCardPlay(data) {
        try {
            const { card, slotIndex, playerId } = data;
            const state = this.gameState.getState();
        
        // Validation
        if (!this.canPlayCard(card, slotIndex, playerId)) {
            this.eventBus.emit('card:play-failed', {
                reason: 'invalid_play',
                card,
                slotIndex,
                playerId
            });
            return;
        }

        // Remove from hand
        const handIndex = state.players[playerId].hand.findIndex(
            handCard => handCard.handId === card.handId
        );
        
        if (handIndex !== -1) {
            this.gameEngine.dispatch({
                type: 'REMOVE_CARD_FROM_HAND',
                payload: { playerId, cardIndex: handIndex }
            });
        }

        // Create unit from card
        const unit = this.createUnitFromCard(card, playerId, slotIndex);

        // Apply existing slot buffs to the new unit BEFORE placing it
        this.applyExistingSlotBuffs(unit, playerId, slotIndex);

        // Place on battlefield (with buffs already applied)
        console.log(`⚔️ Placing ${unit.name} at slot ${slotIndex}. Has Rush: ${unit.ability && unit.ability.includes('Rush')}`);
        this.gameEngine.dispatch({
            type: 'PLACE_UNIT',
            payload: { playerId, unit, slotIndex }
        });
        
        // Log attack status after placement for debugging
        const updatedState = this.gameState.getState();
        const hasAttacked = updatedState.players[playerId].hasAttacked || [];
        console.log(`⚔️ Attack tracking after placement: hasAttacked slots = [${hasAttacked.join(', ')}]`);

        // Trigger unleash ability if present - Route directly to AbilitySystem
        if (unit.ability && unit.ability.toLowerCase().includes('unleash')) {
            this.eventBus.emit('ability:unleash', {
                unit,
                context: { slotIndex, playerId }
            });

            // Check if this is a Blue Unleash ability - triggers Manacharge
            if (unit.color === 'blue') {
                console.log(`🔵 Blue Unleash triggered! Activating all Manacharge abilities for ${playerId}`);
                this.eventBus.emit('ability:manacharge-trigger', {
                    playerId,
                    triggerUnit: unit
                });
            }
        }

        // Enhanced game log for card play

        // Check for kindred effects
        this.checkKindredEffects(unit, playerId);

        this.eventBus.emit('card:played', {
            card,
            unit,
            slotIndex,
            playerId
        });
        
        } catch (error) {
            const result = this.errorHandler.handleError(error, {
                card: data.card,
                playerId: data.playerId,
                slotIndex: data.slotIndex
            }, {
                operation: 'handleCardPlay',
                component: 'CardSystem',
                severity: 'high',
                fallback: () => {
                    // Safe fallback: emit failure event and try to maintain game state consistency
                    this.eventBus.emit('card:play-failed', {
                        card: data.card,
                        slotIndex: data.slotIndex,
                        playerId: data.playerId,
                        error: error.message,
                        recovered: true
                    });
                }
            });
            
            if (result.action === 'fallback') {
                result.result();
            }
        }
    }

    /**
     * Handle card draw from deck - costs 3 gold
     * @param {Object} data - Draw data
     */
    handleCardDraw(data) {
        const { playerId, source = 'deck', free = false } = data;
        const state = this.gameState.getState();
        
        // Check hand limit
        if (state.players[playerId].hand.length >= 3) {
            this.eventBus.emit('card:draw-failed', {
                reason: 'hand_full',
                playerId
            });
            return;
        }

        // Get deck
        const deck = state.players[playerId].deck;
        if (deck.length === 0) {
            this.eventBus.emit('card:draw-failed', {
                reason: 'empty_deck',
                playerId
            });
            return;
        }

        // Check gold cost (3 gold to draw from deck, unless free)
        const drawCost = 3;
        if (!free && state.players[playerId].gold < drawCost) {
            this.eventBus.emit('card:draw-failed', {
                reason: 'insufficient_gold',
                playerId,
                cost: drawCost
            });
            return;
        }

        // Deduct gold cost
        if (!free) {
            this.eventBus.emit('player:spend-gold', {
                playerId,
                amount: drawCost
            });
        }

        // Draw top card from deck (deterministic)
        const topCardIndex = 0;
        const drawnCard = deck[topCardIndex];

        // Remove from deck
        this.gameEngine.dispatch({
            type: 'REMOVE_CARD_FROM_DECK',
            payload: { playerId, cardIndex: topCardIndex }
        });

        // Add to hand
        this.gameEngine.dispatch({
            type: 'ADD_CARD_TO_HAND',
            payload: {
                playerId,
                card: { ...drawnCard, handId: Date.now() }
            }
        });

        this.eventBus.emit('card:drawn', {
            card: drawnCard,
            playerId,
            source,
            cost: free ? 0 : drawCost
        });
    }

    /**
     * Check if player can afford to draft a tier
     * @param {number} tier - Tier to draft
     * @param {string} playerId - Player ID
     * @returns {boolean} True if can afford
     */
    canAffordDraft(tier, playerId) {
        const state = this.gameState.getState();
        const cost = tier * 2;
        return state.players[playerId].gold >= cost;
    }

    /**
     * Get available cards for a tier
     * @param {number} tier - Tier number
     * @param {number} count - Number of cards to return
     * @returns {Array} Array of available cards
     */
    getAvailableCards(tier, count = 3) {
        const available = this.draftPools[tier].filter(
            card => !this.globalDraftedCards.has(card.poolId)
        );
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Get count of available cards in a tier
     * @param {number} tier - Tier number
     * @returns {number} Count of available cards
     */
    getDraftPoolCount(tier) {
        return this.draftPools[tier].filter(
            card => !this.globalDraftedCards.has(card.poolId)
        ).length;
    }

    /**
     * Check if a card can be played in a slot
     * @param {Object} card - Card to play
     * @param {number} slotIndex - Target slot index
     * @param {string} playerId - Player ID
     * @returns {boolean} True if can play
     */
    canPlayCard(card, slotIndex, playerId) {
        const state = this.gameState.getState();
        
        // Check if it's player's turn
        if (state.currentPlayer !== playerId) {
            return false;
        }

        // Check if slot is empty
        if (state.players[playerId].battlefield[slotIndex] !== null) {
            return false;
        }

        // Check slot index validity
        if (slotIndex < 0 || slotIndex >= 6) {
            return false;
        }

        return true;
    }

    /**
     * Create a unit from a card
     * @param {Object} card - Source card
     * @param {string} playerId - Owner player ID
     * @param {number} slotIndex - Slot position
     * @returns {Object} Unit object
     */
    createUnitFromCard(card, playerId, slotIndex) {
        const unit = UnitFactory.createPlayedUnit(card, playerId, slotIndex);
        
        // Validate the created unit
        if (!UnitFactory.validateUnit(unit)) {
            console.error('❌ Failed to create valid unit from card:', card);
            throw new Error(`Invalid unit created from card: ${card.name}`);
        }
        
        return unit;
    }

    /**
     * Check and apply kindred effects
     * @param {Object} unit - Newly summoned unit
     * @param {string} playerId - Player ID
     */
    checkKindredEffects(unit, playerId) {
        const state = this.gameState.getState();
        const battlefield = state.players[playerId].battlefield;
        
        console.log(`🔍 Checking Kindred for ${unit.name} (${unit.tags}) on ${playerId}'s battlefield`);
        console.log(`🔍 Battlefield state:`, battlefield.map((u, i) => u ? `${i}: ${u.name}` : `${i}: empty`));
        
        battlefield.forEach((existingUnit, slotIndex) => {
            // Skip empty slots and the unit itself (prevent self-triggering)
            if (!existingUnit || existingUnit === unit || existingUnit.id === unit.id) {
                return;
            }
            
            // Additional safety check: don't trigger if units are in the same slot
            if (slotIndex === unit.slotIndex) {
                return;
            }
            
            console.log(`🔍 Comparing with ${existingUnit.name} at slot ${slotIndex}`);
            
            // Check if existing unit has kindred and shares tags with newly played unit
            if (existingUnit.ability && 
                existingUnit.ability.toLowerCase().includes('kindred') &&
                existingUnit.tags.some(tag => unit.tags.includes(tag))) {
                
                console.log(`👥 ${existingUnit.name}'s Kindred should trigger! (${unit.name} shares tags)`);
                this.eventBus.emit('ability:kindred', {
                    unit: existingUnit,
                    triggeringUnit: unit,
                    context: { newUnit: unit, slotIndex }
                });
            }
            
            // Check if new unit has kindred and shares tags with existing unit
            if (unit.ability && 
                unit.ability.toLowerCase().includes('kindred') &&
                unit.tags.some(tag => existingUnit.tags.includes(tag))) {
                
                console.log(`👥 ${unit.name}'s Kindred should trigger! (${existingUnit.name} shares tags)`);
                this.eventBus.emit('ability:kindred', {
                    unit,
                    triggeringUnit: existingUnit,
                    context: { existingUnit, slotIndex: unit.slotIndex }
                });
            }
        });
    }

    /**
     * Add a card to a player's deck
     * @param {string} playerId - Player ID
     * @param {Object} card - Card to add
     */
    addCardToDeck(playerId, card) {
        this.gameEngine.dispatch({
            type: 'ADD_CARD_TO_DECK',
            payload: { playerId, card }
        });
    }

    /**
     * Get all cards of a specific tier
     * @param {number} tier - Tier number
     * @returns {Array} Array of cards
     */
    getCardsByTier(tier) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        return cardDatabase[tier] || [];
    }

    /**
     * Get card by ID
     * @param {string} cardId - Card ID
     * @returns {Object|null} Card object or null if not found
     */
    getCardById(cardId) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        for (let tier = 1; tier <= 5; tier++) {
            if (cardDatabase[tier]) {
                const card = cardDatabase[tier].find(c => c.id === cardId);
                if (card) return card;
            }
        }
        return null;
    }

    /**
     * Apply existing slot buffs to a newly placed unit
     * @param {Object} unit - Unit to apply buffs to
     * @param {string} playerId - Player ID
     * @param {number} slotIndex - Slot index
     */
    applyExistingSlotBuffs(unit, playerId, slotIndex) {
        const state = this.gameState.getState();
        const slotBuff = state.players[playerId].slotBuffs[slotIndex];
        
        console.log(`🔍 Checking existing slot buffs for ${unit.name} (${unit.attack}/${unit.health}) at slot ${slotIndex}:`, slotBuff);
        
        if (slotBuff && (slotBuff.attack > 0 || slotBuff.health > 0)) {
            // Apply the slot buffs to the unit
            const originalAttack = unit.currentAttack || unit.attack;
            const originalHealth = unit.currentHealth || unit.health;
            
            unit.currentAttack = originalAttack + slotBuff.attack;
            unit.currentHealth = originalHealth + slotBuff.health;
            unit.maxHealth = (unit.maxHealth || unit.health) + slotBuff.health; // Only increase max health, not base health
            
            console.log(`💪 Applied existing slot buffs to ${unit.name}: ${originalAttack}/${originalHealth} + ${slotBuff.attack}/${slotBuff.health} = ${unit.currentAttack}/${unit.currentHealth}`);
            
            // Emit event to update UI if needed
            this.eventBus.emit('unit:stats-updated', {
                playerId,
                slotIndex,
                unit
            });
        } else {
            console.log(`ℹ️ No existing slot buffs for ${unit.name} at slot ${slotIndex}`);
        }
    }

    /**
     * Reset draft pools (useful for new games)
     */
    resetDraftPools() {
        this.globalDraftedCards.clear();
        this.initializeDraftPools();
        this.eventBus.emit('draft:pools-reset');
    }
}

export default CardSystem;