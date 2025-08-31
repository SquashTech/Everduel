/**
 * State selectors for centralized and optimized state access
 * Provides clean interface to game state without direct getState() calls
 */
class StateSelectors {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Get current player ID
     */
    getCurrentPlayer() {
        return this.gameState.getState().currentPlayer;
    }

    /**
     * Get current turn number
     */
    getCurrentTurn() {
        return this.gameState.getState().turn;
    }

    /**
     * Get player data
     */
    getPlayer(playerId) {
        return this.gameState.getState().players[playerId];
    }

    /**
     * Get player's hand
     */
    getPlayerHand(playerId) {
        return this.gameState.getState().players[playerId].hand;
    }

    /**
     * Get player's battlefield
     */
    getPlayerBattlefield(playerId) {
        return this.gameState.getState().players[playerId].battlefield;
    }

    /**
     * Get player's gold
     */
    getPlayerGold(playerId) {
        return this.gameState.getState().players[playerId].gold;
    }

    /**
     * Get player's health
     */
    getPlayerHealth(playerId) {
        return this.gameState.getState().players[playerId].health;
    }

    /**
     * Get player's deck
     */
    getPlayerDeck(playerId) {
        return this.gameState.getState().players[playerId].deck;
    }

    /**
     * Get player's slot buffs
     */
    getPlayerSlotBuffs(playerId) {
        return this.gameState.getState().players[playerId].slotBuffs;
    }

    /**
     * Get specific slot buff
     */
    getSlotBuff(playerId, slotIndex) {
        return this.gameState.getState().players[playerId].slotBuffs[slotIndex];
    }

    /**
     * Get units that have attacked this turn
     */
    getHasAttacked(playerId) {
        return this.gameState.getState().players[playerId].hasAttacked;
    }

    /**
     * Get unit at specific slot
     */
    getUnitAtSlot(playerId, slotIndex) {
        return this.gameState.getState().players[playerId].battlefield[slotIndex];
    }

    /**
     * Get all units on battlefield for player
     */
    getAllUnits(playerId) {
        return this.gameState.getState().players[playerId].battlefield.filter(unit => unit !== null);
    }

    /**
     * Get enemy player ID
     */
    getEnemyPlayer(playerId) {
        return playerId === 'player' ? 'ai' : 'player';
    }

    /**
     * Get draft options
     */
    getDraftOptions() {
        return this.gameState.getState().draftOptions;
    }

    /**
     * Get current draft tier
     */
    getCurrentDraftTier() {
        return this.gameState.getState().currentDraftTier;
    }

    /**
     * Check if it's player's turn
     */
    isPlayerTurn(playerId) {
        return this.gameState.getState().currentPlayer === playerId;
    }

    /**
     * Check if player can afford cost
     */
    canAfford(playerId, cost) {
        return this.gameState.getState().players[playerId].gold >= cost;
    }

    /**
     * Check if player's hand has space
     */
    hasHandSpace(playerId, maxHandSize = 3) {
        return this.gameState.getState().players[playerId].hand.length < maxHandSize;
    }

    /**
     * Check if slot is empty
     */
    isSlotEmpty(playerId, slotIndex) {
        return this.gameState.getState().players[playerId].battlefield[slotIndex] === null;
    }

    /**
     * Check if unit has attacked this turn
     */
    hasUnitAttacked(playerId, unitId) {
        return this.gameState.getState().players[playerId].hasAttacked.includes(unitId);
    }

    /**
     * Get units with specific ability
     */
    getUnitsWithAbility(playerId, ability) {
        return this.gameState.getState().players[playerId].battlefield.filter(unit => 
            unit && unit.ability && unit.ability.toLowerCase().includes(ability.toLowerCase())
        );
    }

    /**
     * Get units with specific tag
     */
    getUnitsWithTag(playerId, tag) {
        return this.gameState.getState().players[playerId].battlefield.filter(unit => 
            unit && unit.tags && unit.tags.includes(tag)
        );
    }

    /**
     * Get game phase/state info
     */
    getGamePhase() {
        const state = this.gameState.getState();
        return {
            turn: state.turn,
            currentPlayer: state.currentPlayer,
            gameEnded: state.gameEnded,
            winner: state.winner
        };
    }

    /**
     * Get full game state (for when you really need it)
     * Use sparingly - prefer specific selectors
     */
    getFullState() {
        console.warn('StateSelectors: Using getFullState() - consider using specific selector instead');
        return this.gameState.getState();
    }
}

export default StateSelectors;