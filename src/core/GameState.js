/**
 * Immutable game state management system
 * All state changes go through reducers to ensure predictability
 */
class GameState {
    constructor(initialState = null) {
        this.state = initialState || this.getInitialState();
        this.history = [this.state];
        this.maxHistory = 50; // Limit memory usage
        this.reducers = new Map();
        this.middleware = [];
        
        this.setupDefaultReducers();
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
                    health: 20,
                    gold: 2,
                    maxGold: 2,
                    hand: [],
                    deck: [],
                    battlefield: Array(6).fill(null),
                    hasAttacked: [],
                    slotBuffs: Array(6).fill(null).map(() => ({attack: 0, health: 0}))
                },
                ai: {
                    health: 20,
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
            dragonSouls: { player: 0, ai: 0 }
        };
    }

    /**
     * Get current state (immutable)
     */
    getState() {
        return this.state;
    }

    /**
     * Dispatch an action to update state
     * @param {Object} action - Action object with type and payload
     * @returns {Object} New state
     */
    dispatch(action) {
        // Apply middleware
        let processedAction = action;
        for (const middleware of this.middleware) {
            processedAction = middleware(processedAction, this.state);
        }

        const reducer = this.reducers.get(processedAction.type);
        if (!reducer) {
            console.warn(`No reducer found for action type: ${processedAction.type}`);
            return this.state;
        }

        const newState = reducer(this.state, processedAction.payload);
        
        // Ensure immutability
        if (newState === this.state) {
            console.warn(`Reducer for ${processedAction.type} returned the same state reference`);
            return this.state;
        }

        this.state = newState;
        
        // Add to history
        this.history.push(this.state);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        return this.state;
    }

    /**
     * Register a reducer for a specific action type
     * @param {string} actionType - Type of action
     * @param {Function} reducer - Reducer function
     */
    addReducer(actionType, reducer) {
        this.reducers.set(actionType, reducer);
    }

    /**
     * Add middleware function
     * @param {Function} middleware - Middleware function
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Undo last action
     * @returns {Object} Previous state or current if no history
     */
    undo() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current state
            this.state = this.history[this.history.length - 1];
        }
        return this.state;
    }

    /**
     * Setup default reducers for common game actions
     */
    setupDefaultReducers() {
        // Player actions
        this.addReducer('SET_PLAYER_HEALTH', (state, { playerId, health }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    health: Math.max(0, health)
                }
            }
        }));

        this.addReducer('SET_PLAYER_GOLD', (state, { playerId, gold, maxGold }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    gold: Math.max(0, gold),
                    maxGold: maxGold || state.players[playerId].maxGold
                }
            }
        }));

        this.addReducer('ADD_CARD_TO_HAND', (state, { playerId, card }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    hand: [...state.players[playerId].hand, { ...card, handId: Date.now() }]
                }
            }
        }));

        this.addReducer('REMOVE_CARD_FROM_HAND', (state, { playerId, cardIndex }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    hand: state.players[playerId].hand.filter((_, index) => index !== cardIndex)
                }
            }
        }));

        this.addReducer('PLACE_UNIT', (state, { playerId, unit, slotIndex }) => {
            const battlefield = [...state.players[playerId].battlefield];
            battlefield[slotIndex] = { ...unit, slotIndex, owner: playerId };
            
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        battlefield
                    }
                }
            };
        });

        this.addReducer('REMOVE_UNIT', (state, { playerId, slotIndex }) => {
            const battlefield = [...state.players[playerId].battlefield];
            battlefield[slotIndex] = null;
            
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        battlefield
                    }
                }
            };
        });

        this.addReducer('UPDATE_UNIT', (state, { playerId, slotIndex, updates }) => {
            const battlefield = [...state.players[playerId].battlefield];
            if (battlefield[slotIndex]) {
                battlefield[slotIndex] = { ...battlefield[slotIndex], ...updates };
            }
            
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        battlefield
                    }
                }
            };
        });

        this.addReducer('SET_CURRENT_PLAYER', (state, { playerId }) => ({
            ...state,
            currentPlayer: playerId
        }));

        this.addReducer('SET_PHASE', (state, { phase }) => ({
            ...state,
            phase
        }));

        this.addReducer('INCREMENT_TURN', (state) => ({
            ...state,
            turn: state.turn + 1
        }));

        // NEW: TurnManager actions
        this.addReducer('SET_TURN', (state, { turn }) => ({
            ...state,
            turn: turn
        }));

        this.addReducer('TURN_SWITCH', (state, { fromPlayer, toPlayer, turn }) => ({
            ...state,
            currentPlayer: toPlayer,
            turn: turn
        }));

        this.addReducer('SET_DRAFT_OPTIONS', (state, { options, tier }) => ({
            ...state,
            draftOptions: options,
            currentDraftTier: tier
        }));

        this.addReducer('CLEAR_DRAFT', (state) => ({
            ...state,
            draftOptions: [],
            currentDraftTier: null
        }));

        this.addReducer('APPLY_SLOT_BUFF', (state, { playerId, slotIndex, attackBuff, healthBuff }) => {
            const slotBuffs = [...state.players[playerId].slotBuffs];
            slotBuffs[slotIndex] = {
                attack: slotBuffs[slotIndex].attack + attackBuff,
                health: slotBuffs[slotIndex].health + healthBuff
            };
            
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        slotBuffs
                    }
                }
            };
        });

        this.addReducer('ADD_DRAGON_SOUL', (state, { playerId, amount }) => ({
            ...state,
            dragonSouls: {
                ...state.dragonSouls,
                [playerId]: state.dragonSouls[playerId] + amount
            }
        }));

        this.addReducer('SET_PLAYER_HAS_ATTACKED', (state, { playerId, hasAttacked }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    hasAttacked
                }
            }
        }));

        this.addReducer('ADD_CARD_TO_DECK', (state, { playerId, card }) => {
            // Reset card to base stats when adding to deck
            const resetCard = this.resetCardToBase(card);
            
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        deck: [...state.players[playerId].deck, resetCard]
                    }
                }
            };
        });

        this.addReducer('REMOVE_CARD_FROM_DECK', (state, { playerId, cardIndex }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    deck: state.players[playerId].deck.filter((_, index) => index !== cardIndex)
                }
            }
        }));

        this.addReducer('RESET_ATTACK_FLAGS', (state, { playerId }) => ({
            ...state,
            players: {
                ...state.players,
                [playerId]: {
                    ...state.players[playerId],
                    hasAttacked: []
                }
            }
        }));

        this.addReducer('SET_UNITS_CAN_ATTACK', (state, { playerId }) => {
            const battlefield = state.players[playerId].battlefield.map(unit => {
                if (unit) {
                    return { ...unit, canAttack: true, summonedThisTurn: false };
                }
                return unit;
            });

            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...state.players[playerId],
                        battlefield
                    }
                }
            };
        });

        this.addReducer('RESET_GAME', () => this.getInitialState());
    }

    /**
     * Reset a card to its base stats (removes all buffs and modifications)
     * @param {Object} card - Card to reset
     * @returns {Object} Card with base stats
     */
    resetCardToBase(card) {
        const resetCard = {
            ...card,
            // Remove all current stat modifications
            currentAttack: undefined,
            currentHealth: undefined,
            maxHealth: undefined,
            // Keep original stats
            attack: card.attack,
            health: card.health,
            // Reset status flags
            hasAttacked: undefined,
            // Keep core properties
            id: card.id,
            name: card.name,
            ability: card.ability,
            tags: card.tags ? [...card.tags] : [],
            color: card.color,
            tier: card.tier,
            // Keep any original owner reference but reset owner to undefined
            originalOwner: card.originalOwner,
            owner: undefined
        };
        
        // Remove any undefined properties to keep object clean
        Object.keys(resetCard).forEach(key => {
            if (resetCard[key] === undefined) {
                delete resetCard[key];
            }
        });
        
        return resetCard;
    }

    /**
     * Helper method to create deep copy of objects
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => GameState.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = GameState.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }
}

export default GameState;