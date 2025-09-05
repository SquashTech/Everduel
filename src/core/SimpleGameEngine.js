/**
 * Simple GameEngine - Direct turn management without complexity
 * Based on REBUILD_GAME_ENGINE_ONLY.md
 */
import EventBus from './EventBus.js';
import GameState from './GameState.js';
import StateSelectors from './StateSelectors.js';
import GameLogger from './GameLogger.js';
import { CARD_DATABASE, GAME_CONFIG } from '../data/EmbeddedGameData.js';

class SimpleGameEngine {
    constructor() {
        this.eventBus = new EventBus();
        this.gameState = new GameState();
        this.stateSelectors = new StateSelectors(this.gameState);
        this.gameLogger = new GameLogger(this.eventBus);
        this.systems = new Map();
        this.currentPlayer = 'player';
        this.isInitialized = false;
        
        this.setupEventHandlers();
        console.log('🎮 SimpleGameEngine constructor - NO COMPLEX DEPENDENCIES');
    }

    /**
     * Utility method to create delays without nested timeouts
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize the game engine
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('SimpleGameEngine already initialized');
            return;
        }

        try {
            await this.loadGameData();
            
            // Initialize all registered systems
            for (const [name, system] of this.systems) {
                if (system.initialize) {
                    await system.initialize();
                }
            }

            this.isInitialized = true;
            this.eventBus.emit('game:initialized');
            
            console.log('🎮 SimpleGameEngine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SimpleGameEngine:', error);
            throw error;
        }
    }

    /**
     * Register a system with the game engine
     */
    registerSystem(name, system) {
        // Inject dependencies
        system.gameEngine = this;
        system.eventBus = this.eventBus;
        system.gameState = this.gameState;
        system.stateSelectors = this.stateSelectors;

        this.systems.set(name, system);
        console.log(`📦 System '${name}' registered`);
    }

    /**
     * Get a registered system
     */
    getSystem(name) {
        return this.systems.get(name) || null;
    }

    /**
     * Dispatch an action through the game state
     */
    dispatch(action) {
        const newState = this.gameState.dispatch(action);
        this.eventBus.emit('state:changed', { action, newState });
        return newState;
    }

    /**
     * Get current game state
     */
    getState() {
        return this.gameState.getState();
    }

    /**
     * Start a new game
     */
    startGame() {
        console.log('🎯 Starting new game - SIMPLE METHOD');
        
        // Reset game state
        this.dispatch({ type: 'RESET_GAME' });
        this.currentPlayer = 'player';
        
        // Set initial state
        this.dispatch({ 
            type: 'SET_CURRENT_PLAYER', 
            payload: { playerId: 'player' }
        });
        
        this.dispatch({ 
            type: 'SET_TURN', 
            payload: { turn: 1 }
        });
        
        // Emit turn started event for first turn
        this.eventBus.emit('turn:started', { player: 'player' });
        
        // Set initial gold - Turn 1 = 2 gold for both players
        this.dispatch({ 
            type: 'SET_PLAYER_GOLD', 
            payload: { playerId: 'player', gold: 2, maxGold: 2 }
        });
        
        this.dispatch({ 
            type: 'SET_PLAYER_GOLD', 
            payload: { playerId: 'ai', gold: 2, maxGold: 2 }
        });

        // AI will draft cards during its turns
        
        this.eventBus.emit('game:started');
        this.eventBus.emit('ui:refresh');
        
        console.log('🎯 New game started - Turn 1, Player goes first');
    }

    /**
     * End player turn - WITH PROPER AI TURN DELAY
     */
    async endPlayerTurn() {
        const state = this.getState();
        
        // Prevent double-clicking or invalid turn ending
        if (state.currentPlayer !== 'player') {
            console.log(`🚫 Ignoring endPlayerTurn - current player is '${state.currentPlayer}', expected 'player'`);
            return;
        }
        
        console.log(`🎮 Player ending turn ${state.turn}`);
        const currentTurn = state.turn;
        
        // Emit turn ended event for player's end-of-turn abilities
        this.eventBus.emit('turn:ended', { playerId: 'player' });
        
        // Switch to AI
        this.currentPlayer = 'ai';
        this.dispatch({ 
            type: 'SET_CURRENT_PLAYER', 
            payload: { playerId: 'ai' }
        });
        
        this.eventBus.emit('ui:refresh');
        
        // Give AI turn after a brief delay to let UI update
        await this.delay(800);
        console.log(`🤖 AI taking turn ${currentTurn}`);
        await this.doAITurn();
        
        // After AI turn, start next turn
        await this.delay(1000);
        this.startNextTurn();
        
        // Return control to player
        this.currentPlayer = 'player';
        this.dispatch({ 
            type: 'SET_CURRENT_PLAYER', 
            payload: { playerId: 'player' }
        });
        
        // Emit turn started event for player
        this.eventBus.emit('turn:started', { player: 'player' });
        
        this.eventBus.emit('ui:refresh');
        const newState = this.getState();
        console.log(`🎮 Turn ${newState.turn} - Player's turn begins`);
    }

    /**
     * Do AI turn - with proper event-based actions
     */
    async doAITurn() {
        const state = this.getState();
        console.log(`🤖 AI taking turn ${state.turn}`);
        console.log(`🤖 AI resources: ${state.players.ai.gold} gold, ${state.players.ai.hand.length} cards in hand`);
        
        // Emit turn started event for AI
        this.eventBus.emit('turn:started', { player: 'ai' });
        
        const aiSystem = this.systems.get('ai');
        if (aiSystem) {
            // AI drafts exactly ONE card (highest tier it can afford)
            this.aiDraftOneCard();
            
            // Give a moment for draft to complete before other actions
            await this.delay(600);
            
            // AI plays all cards from hand
            aiSystem.playCardsFromHand();
            
            // AI attacks with all units
            await this.delay(800);
            aiSystem.attackWithAllUnits();
            console.log('🤖 AI turn completed');
            
            // Emit turn ended event for AI's end-of-turn abilities
            this.eventBus.emit('turn:ended', { playerId: 'ai' });
        }
    }

    /**
     * Start next turn - increment turn number and give gold
     */
    startNextTurn() {
        const state = this.getState();
        const newTurn = state.turn + 1;
        
        console.log(`🔄 Starting turn ${newTurn} for both players`);
        
        // Increment turn
        this.dispatch({ 
            type: 'SET_TURN', 
            payload: { turn: newTurn }
        });
        
        // Gold progression: Max gold increases by 1 each turn
        // Turn 1: max 2, Turn 2: max 3, Turn 3: max 4, etc. (up to max 10)
        const newMaxGold = Math.min(newTurn + 1, 10);
        const newGold = newMaxGold;
        
        // Set both players to their new max gold
        this.dispatch({ 
            type: 'SET_PLAYER_GOLD', 
            payload: { playerId: 'player', gold: newGold, maxGold: newMaxGold }
        });
        
        this.dispatch({ 
            type: 'SET_PLAYER_GOLD', 
            payload: { playerId: 'ai', gold: newGold, maxGold: newMaxGold }
        });
        
        // Reset summoning sickness - units can attack after being on field for a turn
        this.dispatch({
            type: 'SET_UNITS_CAN_ATTACK',
            payload: { playerId: 'player' }
        });
        
        this.dispatch({
            type: 'SET_UNITS_CAN_ATTACK',
            payload: { playerId: 'ai' }
        });
        
        // Clear attack flags for the new turn
        this.dispatch({
            type: 'RESET_ATTACK_FLAGS',
            payload: { playerId: 'player' }
        });
        
        this.dispatch({
            type: 'RESET_ATTACK_FLAGS',
            payload: { playerId: 'ai' }
        });
        
        console.log(`💰 Turn ${newTurn}: Both players now have ${newGold} gold`);
    }

    /**
     * Give AI some starting cards for testing - REMOVED
     * The AI should only get cards through proper drafting with gold
     */

    /**
     * AI drafts one card - CORRECT COSTS
     */
    aiDraftOneCard() {
        const state = this.getState();
        const aiData = state.players.ai;
        const currentTurn = state.turn;
        
        console.log(`🤖 [Turn ${currentTurn}] AI draft check: ${aiData.gold} gold available`);
        
        // Tier costs: T1=2, T2=4, T3=6, T4=8, T5=10
        const tierCosts = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 };
        
        // Only draft ONE card per turn - check if already has cards from this turn
        if (aiData.hand.length >= currentTurn) {
            console.log(`🤖 [Turn ${currentTurn}] AI already has ${aiData.hand.length} cards, skipping draft`);
            return;
        }
        
        // Find highest tier AI can afford
        let affordableTier = 0;
        for (let tier = 5; tier >= 1; tier--) {
            if (aiData.gold >= tierCosts[tier]) {
                affordableTier = tier;
                break;
            }
        }
        
        if (affordableTier > 0) {
            console.log(`🤖 [Turn ${currentTurn}] AI drafting tier ${affordableTier} (costs ${tierCosts[affordableTier]} gold, will have ${aiData.gold - tierCosts[affordableTier]} left)`);
            
            // Use proper CardSystem draft process
            this.eventBus.emit('draft:start', {
                tier: affordableTier,
                playerId: 'ai'
            });
        } else {
            console.log(`🤖 [Turn ${currentTurn}] AI cannot afford drafts (has ${aiData.gold} gold, min cost is 2)`);
        }
    }

    /**
     * Force UI refresh
     */
    refreshUI() {
        // Update game state with current player
        this.dispatch({ 
            type: 'SET_CURRENT_PLAYER', 
            payload: { playerId: this.currentPlayer }
        });
        
        // Refresh UI
        this.eventBus.emit('ui:refresh');
        console.log(`🎮 UI refreshed for ${this.currentPlayer} turn`);
    }

    /**
     * Load game data from embedded sources
     */
    async loadGameData() {
        try {
            this.cardDatabase = CARD_DATABASE;
            this.gameConfig = GAME_CONFIG;
            console.log('📚 Embedded game data loaded successfully');
        } catch (error) {
            console.error('Failed to load embedded game data:', error);
            this.cardDatabase = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            this.gameConfig = {};
        }
    }

    /**
     * Get card database
     */
    getCardDatabase() {
        return this.cardDatabase;
    }

    /**
     * Get game configuration
     */
    getGameConfig() {
        return this.gameConfig;
    }

    /**
     * Setup basic event handlers - MINIMAL
     */
    setupEventHandlers() {
        // Handle unit death
        this.eventBus.on('unit:dies', (data) => {
            this.handleUnitDeath(data);
        });

        // Handle damage events
        this.eventBus.on('combat:damage', (data) => {
            this.handleDamage(data);
        });

        // Handle spending gold
        this.eventBus.on('player:spend-gold', (data) => {
            this.handleSpendGold(data);
        });

        // Handle slot buff
        this.eventBus.on('slot:buff', (data) => {
            this.handleSlotBuff(data);
        });
    }

    /**
     * Handle unit death - PRESERVED FROM WORKING VERSION
     */
    handleUnitDeath(data) {
        const { unit, owner, slotIndex } = data;
        
        console.log(`💀 Unit death: ${unit.name} (${owner}, slot ${slotIndex})`);
        
        // Check if unit is already marked as banished (from Unleash or other effects)
        let isBanished = unit.banished || false;
        if (isBanished) {
            console.log(`🚫 ${unit.name} is marked as banished (from Unleash or other effect)`);
        }
        
        // Check if Last Gasp will banish the unit or return it to hand
        if (unit.ability && unit.ability.toLowerCase().includes('last gasp')) {
            const lastGaspText = unit.ability.toLowerCase();
            if (lastGaspText.includes('banish this') || lastGaspText.includes('banish')) {
                isBanished = true;
                console.log(`🚫 ${unit.name} will be banished`);
            }
            // Abomination returns to hand instead of deck
            if (lastGaspText.includes('return this to your hand')) {
                isBanished = true;
                console.log(`🔄 ${unit.name} will return to hand instead of deck`);
            }
        }
        
        // Remove unit from battlefield FIRST
        this.dispatch({
            type: 'REMOVE_UNIT',
            payload: { playerId: owner, slotIndex }
        });
        
        // Check if unit is Undead and award Soul to owner
        if (unit.tags && unit.tags.includes('Undead')) {
            const state = this.gameState.getState();
            const currentSouls = state.souls[owner] || 0;
            console.log(`👻 Undead ${unit.name} died, ${owner} gains 1 Soul (${currentSouls} -> ${currentSouls + 1})`);
            
            this.dispatch({
                type: 'UPDATE_SOULS',
                payload: { playerId: owner, count: currentSouls + 1 }
            });

            // Trigger "when you gain a Soul" abilities
            this.eventBus.emit('souls:gained', {
                playerId: owner,
                amount: 1,
                newTotal: currentSouls + 1,
                source: unit
            });
        }

        // THEN trigger Last Gasp ability (after slot is cleared)
        if (unit.ability && unit.ability.toLowerCase().includes('last gasp')) {
            console.log(`🔮 Triggering Last Gasp for ${unit.name}: ${unit.ability}`);
            
            this.eventBus.emit('ability:last-gasp', {
                unit,
                context: { 
                    playerId: owner, 
                    slotIndex,
                    isBanished 
                }
            });
        }

        // Add to deck unless banished
        if (!isBanished) {
            const deckCard = { ...unit, originalOwner: owner };
            this.dispatch({
                type: 'ADD_CARD_TO_DECK',
                payload: { playerId: owner, card: deckCard }
            });
        }

        this.eventBus.emit('unit:death-processed', data);
    }

    /**
     * Handle damage events - PRESERVED FROM WORKING VERSION
     */
    handleDamage(data) {
        const { target, amount, source, type = 'combat' } = data;
        
        if (target.type === 'player') {
            const state = this.getState();
            const currentHealth = state.players[target.playerId].health;
            const newHealth = currentHealth - amount;
            
            console.log(`💀 Player damage: ${target.playerId} takes ${amount} damage (${currentHealth} -> ${newHealth})`);
            
            this.dispatch({
                type: 'SET_PLAYER_HEALTH',
                payload: {
                    playerId: target.playerId,
                    health: newHealth
                }
            });
            
        } else if (target.type === 'unit') {
            const state = this.getState();
            const unit = state.players[target.playerId].battlefield[target.slotIndex];
            
            if (unit) {
                const currentHealth = unit.currentHealth || unit.health;
                const newHealth = currentHealth - amount;
                
                if (newHealth <= 0) {
                    this.eventBus.emit('unit:dies', {
                        unit,
                        owner: target.playerId,
                        slotIndex: target.slotIndex
                    });
                } else {
                    this.dispatch({
                        type: 'UPDATE_UNIT',
                        payload: {
                            playerId: target.playerId,
                            slotIndex: target.slotIndex,
                            updates: { currentHealth: newHealth }
                        }
                    });
                    
                    // Emit survived-damage event for abilities
                    this.eventBus.emit('unit:survived-damage', {
                        unit: unit,
                        owner: target.playerId,
                        slotIndex: target.slotIndex,
                        damage: amount
                    });
                }
            }
        }
    }

    /**
     * Handle spending gold - PRESERVED FROM WORKING VERSION
     */
    handleSpendGold(data) {
        const { playerId, amount } = data;
        const state = this.getState();
        const currentGold = state.players[playerId].gold;
        
        if (currentGold >= amount) {
            this.dispatch({
                type: 'SET_PLAYER_GOLD',
                payload: {
                    playerId,
                    gold: currentGold - amount
                }
            });
        }
    }

    /**
     * Handle slot buff application - PRESERVED FROM WORKING VERSION
     */
    handleSlotBuff(data) {
        const { slotIndex, playerId, buff } = data;
        
        this.dispatch({
            type: 'APPLY_SLOT_BUFF',
            payload: {
                playerId,
                slotIndex,
                attackBuff: buff.attack,
                healthBuff: buff.health
            }
        });

        // Get updated state after buff application
        const state = this.getState();
        const slotBuff = state.players[playerId].slotBuffs[slotIndex];
        
        // Emit UI update event for slot buff visualization
        this.eventBus.emit('slot:buff-updated', {
            player: playerId,
            slot: slotIndex,
            attack: slotBuff.attack,
            health: slotBuff.health,
            type: 'slot-buff'
        });

        // Apply buffs to current unit in slot if any
        const currentUnit = state.players[playerId].battlefield[slotIndex];
        
        if (currentUnit && (slotBuff.attack > 0 || slotBuff.health > 0)) {
            // Calculate stats from base + total slot buff
            // Base stats are the original attack/health values
            const baseAttack = currentUnit.attack;
            const baseHealth = currentUnit.health;
            
            // Calculate the damage the unit has taken (if any)
            const currentDamage = currentUnit.maxHealth ? 
                (currentUnit.maxHealth - currentUnit.currentHealth) : 0;
            
            // Apply the TOTAL slot buff to the BASE stats
            // For health, increase max health but preserve damage taken
            const newMaxHealth = baseHealth + slotBuff.health;
            const buffedUnit = {
                ...currentUnit,
                currentAttack: baseAttack + slotBuff.attack,
                currentHealth: newMaxHealth - currentDamage, // Preserve damage
                maxHealth: newMaxHealth
            };
            
            console.log(`📊 Updating unit in buffed slot: ${currentUnit.name} base(${baseAttack}/${baseHealth}) + slot(${slotBuff.attack}/${slotBuff.health}) = ${buffedUnit.currentAttack}/${buffedUnit.currentHealth}/${buffedUnit.maxHealth}${currentDamage > 0 ? ` (preserved ${currentDamage} damage)` : ''}`);
            
            this.dispatch({
                type: 'UPDATE_UNIT',
                payload: {
                    playerId,
                    slotIndex,
                    updates: {
                        currentAttack: buffedUnit.currentAttack,
                        currentHealth: buffedUnit.currentHealth,
                        maxHealth: buffedUnit.maxHealth
                    }
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.eventBus.clear();
        this.systems.clear();
        this.isInitialized = false;
        console.log('🗑️ SimpleGameEngine destroyed');
    }
}

export default SimpleGameEngine;