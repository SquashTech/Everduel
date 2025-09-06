import WinTracker from '../utils/WinTracker.js';

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
        this.winTracker = new WinTracker();
        this.currentScenarioId = null;
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
        this.eventBus.on('game:ended', (data) => this.showGameOver(data.winner));
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
        this.updateSouls(state.souls);
    }

    /**
     * Update player statistics display
     * @param {Object} player - Player data
     * @param {string} playerId - Player identifier
     */
    updatePlayerStats(player, playerId) {
        this.updateElementText(`${playerId}Health`, player.health);
        this.updateElementText(`${playerId}GoldCurrent`, player.gold);
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
        
        // Battlefield turn indicators
        const playerTurnIndicator = document.getElementById('playerBattlefieldTurn');
        const aiTurnIndicator = document.getElementById('aiBattlefieldTurn');
        
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
            
            // Update battlefield turn indicators
            if (playerTurnIndicator) {
                playerTurnIndicator.classList.add('active');
            }
            if (aiTurnIndicator) {
                aiTurnIndicator.classList.remove('active');
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
            
            // Update battlefield turn indicators
            if (aiTurnIndicator) {
                aiTurnIndicator.classList.add('active');
            }
            if (playerTurnIndicator) {
                playerTurnIndicator.classList.remove('active');
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
        const goldElement = document.getElementById(`${playerId}GoldCurrent`);
        
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
     * Update dragon flames display (if applicable)
     * @param {Object} dragonFlames - Dragon flames data
     */
    updateDragonFlames(dragonFlames) {
        const playerFlamesElement = document.getElementById('playerDragonFlames');
        const aiFlamesElement = document.getElementById('aiDragonFlames');
        
        if (playerFlamesElement) {
            playerFlamesElement.textContent = dragonFlames.player || 0;
        }
        
        if (aiFlamesElement) {
            aiFlamesElement.textContent = dragonFlames.ai || 0;
        }
    }

    /**
     * Update souls display
     * @param {Object} souls - Souls data
     */
    updateSouls(souls) {
        const playerSoulsElement = document.getElementById('playerSouls');
        const aiSoulsElement = document.getElementById('aiSouls');
        
        if (playerSoulsElement) {
            playerSoulsElement.textContent = souls.player || 0;
        }
        
        if (aiSoulsElement) {
            aiSoulsElement.textContent = souls.ai || 0;
        }
    }

    /**
     * Show game over screen
     * @param {string} winner - Winner of the game
     */
    showGameOver(winner) {
        console.log('🎯 showGameOver called with winner:', winner);
        
        // Save win to localStorage if player won
        console.log('🔍 Win check debug:', {
            winner,
            currentScenarioId: this.currentScenarioId,
            condition: winner === 'player' && this.currentScenarioId
        });
        
        // Try to get scenario ID from alternative sources if not set
        let scenarioId = this.currentScenarioId;
        if (!scenarioId) {
            // Try to get from global variable
            if (window.currentScenarioId) {
                scenarioId = window.currentScenarioId;
                console.log('🔄 Got scenario ID from global variable:', scenarioId);
            }
            // Try to get from the game engine or scenario manager
            else if (this.gameState?.currentScenario?.id) {
                scenarioId = this.gameState.currentScenario.id;
                console.log('🔄 Got scenario ID from gameState:', scenarioId);
            } else if (window.cardGameApp?.scenarioManager?.currentScenario) {
                scenarioId = window.cardGameApp.scenarioManager.currentScenario.id || window.cardGameApp.scenarioManager.currentScenario.scenarioId;
                console.log('🔄 Got scenario ID from scenarioManager:', scenarioId);
            }
        }
        
        console.log('🔍 Final scenario ID check:', {
            originalId: this.currentScenarioId,
            finalId: scenarioId,
            willRecord: winner === 'player' && scenarioId
        });
        
        if (winner === 'player' && scenarioId) {
            // Use ScenarioSelectionComponent's WinTracker if available, fallback to local one
            const winTracker = window.cardGameApp && window.cardGameApp.scenarioSelectionComponent 
                ? window.cardGameApp.scenarioSelectionComponent.winTracker 
                : this.winTracker;
                
            console.log('🏆 Recording win for scenario:', scenarioId);
            console.log('🔍 WinTracker source:', window.cardGameApp?.scenarioSelectionComponent ? 'ScenarioSelectionComponent' : 'local');
            
            winTracker.markScenarioWon(scenarioId);
            
            // Debug: Check if win was recorded
            console.log('✅ Win recorded? Check:', winTracker.hasWon(scenarioId));
            
            // Immediately update any visible scenario buttons with stars
            if (window.cardGameApp && window.cardGameApp.scenarioSelectionComponent) {
                // Only update if scenario selection is currently visible
                const scenarioScreen = document.getElementById('scenarioSelection');
                if (scenarioScreen && !scenarioScreen.classList.contains('hidden')) {
                    window.cardGameApp.scenarioSelectionComponent.updateScenarioWinIndicators();
                }
            }
        }
        
        const modal = document.getElementById('gameEndModal');
        const iconElement = document.getElementById('gameEndIcon');
        const titleElement = document.getElementById('gameEndTitle');
        const returnBtn = document.getElementById('returnToScenariosBtn');
        
        console.log('🔍 Modal elements check:', {
            modal: !!modal,
            icon: !!iconElement,
            title: !!titleElement,
            button: !!returnBtn
        });
        
        if (!modal || !iconElement || !titleElement) {
            console.error('❌ Game end modal elements not found - using fallback');
            // Fallback: try to create the modal if it doesn't exist
            this.createGameOverModalFallback(winner);
            return;
        }
        
        console.log('✅ All modal elements found - showing modal');
        
        // Update modal content based on winner
        if (winner === 'player') {
            modal.classList.add('victory');
            modal.classList.remove('defeat');
            iconElement.textContent = '🏆';
            titleElement.textContent = 'Victory!';
        } else {
            modal.classList.add('defeat');
            modal.classList.remove('victory');
            iconElement.textContent = '💀';
            titleElement.textContent = 'Defeat!';
        }
        
        // Set up return to scenarios button
        if (returnBtn) {
            console.log('🔘 Setting up return button click handler');
            returnBtn.onclick = (e) => {
                console.log('🔘 Return to scenarios button clicked!');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // Hide the modal
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                    console.log('🔘 Modal hidden');
                    
                    // Return to scenario selection
                    console.log('🔘 Calling returnToScenarioSelection()');
                    this.returnToScenarioSelection();
                } catch (error) {
                    console.error('🔘 Error in return button handler:', error);
                    // Fallback - just reload the page
                    console.log('🔘 Fallback: reloading page');
                    location.reload();
                }
            };
        } else {
            console.error('🔘 Return button not found!');
        }
        
        // Show the modal
        console.log('🎭 Before showing modal, classes:', modal.className);
        modal.classList.remove('hidden');
        console.log('🎭 After removing hidden, classes:', modal.className);
        
        // Force display in case CSS is overriding
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '10000';
        console.log('🎭 Modal should now be visible with inline styles');
        
        console.log(`🎮 Game Over - ${winner === 'player' ? 'Player' : 'AI'} wins!`);
    }
    
    /**
     * Return to scenario selection screen
     */
    returnToScenarioSelection() {
        console.log('🔄 Returning to scenario selection...');
        
        try {
            // Try to use the Main.js returnToScenarioSelection method if available
            if (window.cardGameApp && typeof window.cardGameApp.returnToScenarioSelection === 'function') {
                console.log('🔄 Using Main.js returnToScenarioSelection');
                window.cardGameApp.returnToScenarioSelection();
                
                // Reset current scenario tracking
                this.currentScenarioId = null;
                window.currentScenarioId = null;
                
                // Update scenario UI with win stars after Main.js handles the navigation
                setTimeout(() => {
                    if (window.cardGameApp && window.cardGameApp.scenarioSelectionComponent) {
                        window.cardGameApp.scenarioSelectionComponent.updateScenarioWinIndicators();
                    }
                }, 100);
                
                return;
            }
            
            // Fallback: Manual DOM manipulation
            console.log('🔄 Using manual DOM manipulation');
            
            // Hide game container (using class selector since it doesn't have an ID)
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) {
                gameContainer.style.display = 'none';
                gameContainer.classList.add('hidden');
                console.log('🔄 Game container hidden');
            } else {
                console.log('🔄 Game container not found');
            }
            
            // Show scenario selection
            const scenarioSelection = document.getElementById('scenarioSelection');
            if (scenarioSelection) {
                scenarioSelection.style.display = 'block';
                scenarioSelection.classList.remove('hidden');
                console.log('🔄 Scenario selection shown');
                
                // Update scenario UI with win stars
                // Update scenario win indicators via ScenarioSelectionComponent
            if (window.cardGameApp && window.cardGameApp.scenarioSelectionComponent) {
                window.cardGameApp.scenarioSelectionComponent.updateScenarioWinIndicators();
            }
            } else {
                console.log('🔄 Scenario selection not found');
            }
            
            // Reset current scenario tracking
            this.currentScenarioId = null;
            window.currentScenarioId = null;
            console.log('🔄 Successfully returned to scenario selection');
            
        } catch (error) {
            console.error('🔄 Error returning to scenarios:', error);
            // Fallback to page reload if state-based navigation fails
            console.log('🔄 Fallback: reloading page');
            location.reload();
        }
    }
    
    /**
     * Set the current scenario ID for win tracking
     * @param {string} scenarioId - The current scenario ID
     */
    setCurrentScenario(scenarioId) {
        this.currentScenarioId = scenarioId;
        console.log(`📝 Current scenario set to: ${scenarioId}`);
    }
    
    /**
     * Create game over modal as fallback if HTML element doesn't exist
     * @param {string} winner - Winner of the game
     */
    createGameOverModalFallback(winner) {
        console.log('Creating game over modal dynamically as fallback');
        
        // Check if modal already exists to avoid duplicates
        let modal = document.getElementById('gameEndModalDynamic');
        if (modal) {
            modal.remove();
        }
        
        // Create modal HTML
        modal = document.createElement('div');
        modal.id = 'gameEndModalDynamic';
        modal.className = `modal-overlay game-end-modal ${winner === 'player' ? 'victory' : 'defeat'}`;
        
        modal.innerHTML = `
            <div class="modal-content game-end-content">
                <div class="game-end-header">
                    <div class="game-end-icon">${winner === 'player' ? '🏆' : '💀'}</div>
                    <h2>${winner === 'player' ? 'Victory!' : 'Defeat!'}</h2>
                </div>
                <div class="game-end-actions">
                    <button class="btn btn-primary game-end-btn" id="returnToScenariosBtnDynamic">Return to Scenarios</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Set up button event
        const returnBtn = document.getElementById('returnToScenariosBtnDynamic');
        if (returnBtn) {
            returnBtn.onclick = () => {
                modal.remove();
                this.returnToScenarioSelection();
            };
        }
        
        // Show the modal
        modal.classList.remove('hidden');
        console.log(`🎮 Game Over Modal shown - ${winner === 'player' ? 'Player' : 'AI'} wins!`);
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