/**
 * Game Info Component for displaying player stats and game information
 * Manages health, gold, turn indicators, and other game state displays
 */
class GameInfoComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
    }

    /**
     * Initialize the game info component
     */
    initialize() {
        this.setupEventHandlers();
        console.log('ℹ️ GameInfoComponent initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.eventBus.on('turn:started', (data) => this.updateTurnDisplay(data.player));
        this.eventBus.on('player:health-changed', (data) => this.updateHealth(data));
        this.eventBus.on('player:gold-changed', (data) => this.updateGold(data));
    }

    /**
     * Update component with current game state
     * @param {Object} state - Current game state
     */
    update(state) {
        this.updatePlayerStats(state.players.player, 'player');
        this.updatePlayerStats(state.players.ai, 'ai');
        this.updateTurnDisplay(state.currentPlayer);
        this.updateTurnCounter(state.turn);
    }

    /**
     * Update player statistics display
     * @param {Object} player - Player data
     * @param {string} playerId - Player identifier
     */
    updatePlayerStats(player, playerId) {
        this.updateElementText(`${playerId}Health`, player.health);
        this.updateElementText(`${playerId}Gold`, player.gold);
        this.updateElementText(`${playerId}MaxGold`, player.maxGold);
        // Hand count no longer displayed in UI
        this.updateElementText(`${playerId}DeckCount`, player.deck.length);
    }

    /**
     * Update turn display and indicators
     * @param {string} currentPlayer - Current player
     */
    updateTurnDisplay(currentPlayer) {
        const playerInfo = document.getElementById('playerPlayerInfo');
        const aiInfo = document.getElementById('aiPlayerInfo');
        const playerStatus = document.getElementById('playerTurnStatus');
        const aiStatus = document.getElementById('aiTurnStatus');
        
        if (currentPlayer === 'player') {
            // Player's turn
            if (playerInfo) {
                playerInfo.classList.add('active-turn');
                playerInfo.classList.remove('ai-turn');
            }
            if (aiInfo) {
                aiInfo.classList.remove('active-turn', 'ai-turn');
            }
            if (playerStatus) {
                playerStatus.textContent = 'YOUR TURN';
            }
            if (aiStatus) {
                aiStatus.textContent = 'Waiting...';
            }
        } else {
            // AI's turn
            if (aiInfo) {
                aiInfo.classList.add('ai-turn');
                aiInfo.classList.remove('active-turn');
            }
            if (playerInfo) {
                playerInfo.classList.remove('active-turn', 'ai-turn');
            }
            if (aiStatus) {
                aiStatus.textContent = 'AI TURN';
            }
            if (playerStatus) {
                playerStatus.textContent = 'Waiting...';
            }
        }
    }

    /**
     * Update current player indicator
     * @param {string} player - Current player
     */
    updateCurrentPlayer(player) {
        this.updateTurnDisplay(player);
        
        // Also update any global turn indicators
        const globalTurnIndicator = document.getElementById('globalTurnIndicator');
        if (globalTurnIndicator) {
            globalTurnIndicator.textContent = player === 'player' ? 'Your Turn' : 'AI Turn';
            globalTurnIndicator.className = `turn-indicator ${player === 'player' ? 'player' : 'ai'}-turn`;
        }
    }

    /**
     * Update turn counter
     * @param {number} turnNumber - Current turn number
     */
    updateTurnCounter(turnNumber) {
        const turnCounterElement = document.getElementById('turnCounter');
        if (turnCounterElement) {
            turnCounterElement.textContent = `Turn ${turnNumber}`;
        }
    }

    /**
     * Update player health with animation
     * @param {Object} data - Health change data
     */
    updateHealth(data) {
        const { playerId, health, previousHealth } = data;
        const healthElement = document.getElementById(`${playerId}Health`);
        
        if (healthElement) {
            healthElement.textContent = health;
            
            // Add animation class based on change
            if (previousHealth !== undefined) {
                const change = health - previousHealth;
                if (change < 0) {
                    healthElement.classList.add('health-decrease');
                    setTimeout(() => healthElement.classList.remove('health-decrease'), 1000);
                } else if (change > 0) {
                    healthElement.classList.add('health-increase');
                    setTimeout(() => healthElement.classList.remove('health-increase'), 1000);
                }
            }
            
            // Add low health warning
            if (health <= 5) {
                healthElement.classList.add('low-health');
            } else {
                healthElement.classList.remove('low-health');
            }
        }
    }

    /**
     * Update player gold with animation
     * @param {Object} data - Gold change data
     */
    updateGold(data) {
        const { playerId, gold, previousGold } = data;
        const goldElement = document.getElementById(`${playerId}Gold`);
        
        if (goldElement) {
            goldElement.textContent = gold;
            
            // Add animation class based on change
            if (previousGold !== undefined) {
                const change = gold - previousGold;
                if (change < 0) {
                    goldElement.classList.add('gold-decrease');
                    setTimeout(() => goldElement.classList.remove('gold-decrease'), 1000);
                } else if (change > 0) {
                    goldElement.classList.add('gold-increase');
                    setTimeout(() => goldElement.classList.remove('gold-increase'), 1000);
                }
            }
        }
    }

    /**
     * Show turn transition animation
     * @param {string} newPlayer - Player whose turn it is
     */
    showTurnTransition(newPlayer) {
        const indicator = document.createElement('div');
        indicator.className = 'turn-transition-indicator';
        indicator.textContent = newPlayer === 'player' ? 'Your Turn!' : 'AI Turn';
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${newPlayer === 'player' ? '#4ecdc4' : '#ff6b6b'};
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            animation: turnTransition 2s ease-in-out;
        `;
        
        document.body.appendChild(indicator);
        
        // Remove after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    /**
     * Update game phase indicator
     * @param {string} phase - Current game phase
     */
    updateGamePhase(phase) {
        const phaseElement = document.getElementById('gamePhase');
        if (phaseElement) {
            phaseElement.textContent = this.formatPhase(phase);
            phaseElement.className = `game-phase phase-${phase}`;
        }
    }

    /**
     * Format phase name for display
     * @param {string} phase - Raw phase name
     * @returns {string} Formatted phase name
     */
    formatPhase(phase) {
        switch (phase) {
            case 'draft': return 'Draft Phase';
            case 'play': return 'Play Phase';
            case 'combat': return 'Combat Phase';
            case 'end': return 'End Phase';
            default: return phase.charAt(0).toUpperCase() + phase.slice(1);
        }
    }

    /**
     * Update dragon souls display (if applicable)
     * @param {Object} dragonSouls - Dragon souls data
     */
    updateDragonSouls(dragonSouls) {
        const playerSoulsElement = document.getElementById('playerDragonSouls');
        const aiSoulsElement = document.getElementById('aiDragonSouls');
        
        if (playerSoulsElement) {
            playerSoulsElement.textContent = dragonSouls.player || 0;
        }
        
        if (aiSoulsElement) {
            aiSoulsElement.textContent = dragonSouls.ai || 0;
        }
    }

    /**
     * Show game over screen
     * @param {string} winner - Winner of the game
     */
    showGameOver(winner) {
        const gameOverModal = document.createElement('div');
        gameOverModal.className = 'game-over-modal';
        gameOverModal.innerHTML = `
            <div class="game-over-content">
                <h2>${winner === 'player' ? 'Victory!' : 'Defeat!'}</h2>
                <p>${winner === 'player' ? 'Congratulations! You won!' : 'Better luck next time!'}</p>
                <button onclick="resetGame()" class="restart-btn">Play Again</button>
            </div>
        `;
        
        gameOverModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(gameOverModal);
    }

    /**
     * Helper method to update element text content
     * @param {string} elementId - Element ID
     * @param {string|number} value - New value
     */
    updateElementText(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value.toString();
        }
    }

    /**
     * Helper method to add CSS class to element
     * @param {string} elementId - Element ID
     * @param {string} className - Class name to add
     */
    addElementClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Helper method to remove CSS class from element
     * @param {string} elementId - Element ID
     * @param {string} className - Class name to remove
     */
    removeElementClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }
}

export default GameInfoComponent;