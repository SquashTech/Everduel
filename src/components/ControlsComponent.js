/**
 * Controls Component for managing game controls
 * Handles buttons, actions, and control panel functionality
 */
class ControlsComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.isInitialized = false;
        this.isDrawing = false; // Flag to prevent double-drawing
    }

    /**
     * Initialize the controls component
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('🎮 ControlsComponent already initialized, skipping...');
            return;
        }
        
        this.setupEventHandlers();
        this.setupControlButtons();
        this.isInitialized = true;
        console.log('🎮 ControlsComponent initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        console.log('🔧 ENHANCED ControlsComponent - Double logging fix active!');
        this.eventBus.on('turn:started', (data) => {
            this.updateTurnControls(data);
            // Note: Turn logging now handled centrally via game:log events to prevent duplication
        });
        this.eventBus.on('game:state-changed', () => this.updateControls());
        
        // Listen for draw completion to properly reset button
        this.eventBus.on('card:drawn', (data) => {
            if (data.playerId === 'player') {
                this.resetDrawButton();
            }
        });
        
        this.eventBus.on('card:draw-failed', (data) => {
            if (data.playerId === 'player') {
                this.resetDrawButton();
            }
        });
        
        // Game Log Event Handlers
        this.setupGameLogHandlers();
    }

    /**
     * Setup game log event handlers to capture all game events
     */
    setupGameLogHandlers() {
        // Note: turn:started is handled in setupEventHandlers to avoid duplication
        
        // Game end events - keep this one as it's special case
        this.eventBus.on('game:ended', (data) => {
            const winner = data.winner === 'player' ? 'You' : data.winner === 'ai' ? 'AI' : 'No one';
            console.log(`🏆 Game Over - ${winner} wins!`);
        });
    }


    /**
     * Setup control button functionality
     */
    setupControlButtons() {
        // End Turn Button - UPDATED FOR SIMPLE SYSTEM
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', async () => {
                const state = this.gameState.getState();
                console.log(`🎮 End Turn button clicked (from ControlsComponent) - Current player: ${state.currentPlayer}`);
                
                // Only process if it's actually the player's turn
                if (state.currentPlayer !== 'player') {
                    console.log(`🚫 Ignoring End Turn click - not player's turn (current: ${state.currentPlayer})`);
                    return;
                }
                
                // Temporarily disable button to prevent double-clicks
                endTurnBtn.disabled = true;
                
                if (this.gameEngine && this.gameEngine.endPlayerTurn) {
                    try {
                        await this.gameEngine.endPlayerTurn(); // Now properly awaits async call
                        
                        // Re-enable button after a short delay
                        setTimeout(() => {
                            endTurnBtn.disabled = false;
                        }, 500);
                    } catch (error) {
                        console.error('❌ Error during endPlayerTurn:', error);
                        endTurnBtn.disabled = false;
                    }
                } else {
                    console.error('❌ GameEngine not available for endPlayerTurn()');
                    endTurnBtn.disabled = false;
                }
            });
        }

        // How to Play Button (sidebar)
        const howToPlayBtn = document.getElementById('howToPlayBtnSidebar');
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => {
                this.showHowToPlay();
            });
        }

        // Note: Game Log is now always visible on screen
        // Game Log Clear Button (if needed in the future)
        const gameLogClearBtn = document.getElementById('gameLogClearBtn');
        if (gameLogClearBtn) {
            gameLogClearBtn.addEventListener('click', () => {
                this.clearGameLog();
            });
        }

        // Spell Draft Button
        const spellDraftBtn = document.querySelector('button[onclick="startSpellDraft()"]');
        if (spellDraftBtn) {
            spellDraftBtn.addEventListener('click', () => {
                this.startSpellDraft();
            });
        }

        // Draw from Deck Button
        const drawDeckBtn = document.getElementById('drawDeckBtn');
        if (drawDeckBtn) {
            // Remove any existing listeners first to prevent duplicates
            const newDrawBtn = drawDeckBtn.cloneNode(true);
            drawDeckBtn.parentNode.replaceChild(newDrawBtn, drawDeckBtn);
            
            const drawBtn = document.getElementById('drawDeckBtn');
            if (drawBtn) {
                drawBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation(); // Stop ALL event propagation
                    this.drawFromDeck();
                }, { once: false, capture: true }); // Use capture phase for priority
            }
        }

        // Player Deck Button
        const playerDeckBtn = document.getElementById('playerDeckBtn');
        if (playerDeckBtn) {
            playerDeckBtn.addEventListener('click', () => {
                this.showDeck('player');
            });
        }

        // AI Deck Button
        const aiDeckBtn = document.getElementById('aiDeckBtn');
        if (aiDeckBtn) {
            aiDeckBtn.addEventListener('click', () => {
                this.showDeck('ai');
            });
        }

        // Draft Tier Buttons
        for (let tier = 1; tier <= 5; tier++) {
            const draftBtn = document.getElementById(`draftTier${tier}Btn`);
            if (draftBtn) {
                draftBtn.addEventListener('click', () => {
                    this.startDraft(tier);
                });
            }
        }

        // Deck Modal Close Button
        const deckModal = document.getElementById('deckModal');
        if (deckModal) {
            const closeBtn = deckModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideDeck();
                });
            }
            
            // Close on backdrop click
            deckModal.addEventListener('click', (e) => {
                if (e.target === deckModal) {
                    this.hideDeck();
                }
            });
        }

        // How to Play Modal Close Button
        const howToPlayModal = document.getElementById('howToPlayModal');
        if (howToPlayModal) {
            const closeBtn = howToPlayModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideHowToPlay();
                });
            }
            
            // Close on backdrop click
            howToPlayModal.addEventListener('click', (e) => {
                if (e.target === howToPlayModal) {
                    this.hideHowToPlay();
                }
            });
        }
    }

    /**
     * Update component state
     * @param {Object} state - Current game state
     */
    update(state) {
        this.updateTurnButton(state);
        this.updateActionButtons(state);
        this.updateDraftCounts(state);
    }

    /**
     * Update turn button state
     * @param {Object} state - Game state
     */
    updateTurnButton(state) {
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (!endTurnBtn) return;

        const isPlayerTurn = state.currentPlayer === 'player';
        
        endTurnBtn.disabled = !isPlayerTurn;
        endTurnBtn.textContent = isPlayerTurn ? 'End Turn' : 'AI Turn';
        endTurnBtn.style.opacity = isPlayerTurn ? '1' : '0.5';
    }

    /**
     * Update action buttons based on game state
     * @param {Object} state - Game state
     */
    updateActionButtons(state) {
        const player = state.players.player;
        const isPlayerTurn = state.currentPlayer === 'player';
        
        // Draw from deck button
        const drawBtn = document.getElementById('drawDeckBtn');
        if (drawBtn) {
            const cost = 3;
            const canAfford = player.gold >= cost;
            const hasSpace = player.hand.length < 3;
            const hasDeck = player.deck.length > 0;
            
            const canDraw = isPlayerTurn && canAfford && hasSpace && hasDeck;
            
            drawBtn.disabled = !canDraw;
            drawBtn.style.opacity = canDraw ? '1' : '0.5';
            
            let tooltip = `Draw from Deck (${cost} Gold)`;
            if (!hasDeck) tooltip += ' - Deck Empty';
            else if (!hasSpace) tooltip += ' - Hand Full';
            else if (!canAfford) tooltip += ' - Need More Gold';
            else if (!isPlayerTurn) tooltip += ' - Not Your Turn';
            
            drawBtn.title = tooltip;
        }

        // Spell draft button (placeholder functionality)
        const spellBtn = document.querySelector('button[onclick="startSpellDraft()"]');
        if (spellBtn) {
            const cost = 1;
            const canAfford = player.gold >= cost;
            const hasSpace = player.hand.length < 3;
            
            const canDraftSpell = isPlayerTurn && canAfford && hasSpace;
            
            spellBtn.disabled = !canDraftSpell;
            spellBtn.style.opacity = canDraftSpell ? '1' : '0.5';
            
            let tooltip = `Draft Spell (${cost} Gold)`;
            if (!hasSpace) tooltip += ' - Hand Full';
            else if (!canAfford) tooltip += ' - Need More Gold';
            else if (!isPlayerTurn) tooltip += ' - Not Your Turn';
            
            spellBtn.title = tooltip;
        }
    }

    /**
     * Update draft pool counts
     * @param {Object} state - Game state
     */
    updateDraftCounts(state) {
        const cardSystem = this.gameEngine.getSystem('CardSystem');
        if (!cardSystem) return;

        for (let tier = 1; tier <= 5; tier++) {
            const countElement = document.getElementById(`tier${tier}Count`);
            if (countElement) {
                const count = cardSystem.getDraftPoolCount(tier);
                countElement.textContent = count.toString();
            }
        }
    }

    /**
     * Update turn controls
     * @param {Object} data - Turn data
     */
    updateTurnControls(data) {
        const isPlayerTurn = data.player === 'player';
        
        // Update all player-specific controls
        const playerControls = document.querySelectorAll('.control-btn, .tier-btn');
        playerControls.forEach(button => {
            if (isPlayerTurn) {
                button.classList.remove('disabled-turn');
            } else {
                button.classList.add('disabled-turn');
            }
        });
    }

    /**
     * Update all controls
     */
    updateControls() {
        const state = this.gameState.getState();
        this.update(state);
    }

    /**
     * Show how to play modal
     */
    showHowToPlay() {
        const modal = document.getElementById('howToPlayModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Hide how to play modal
     */
    hideHowToPlay() {
        const modal = document.getElementById('howToPlayModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Toggle game log panel
     */
    toggleGameLog() {
        const logPanel = document.getElementById('gameLogPanel');
        if (logPanel) {
            if (logPanel.classList.contains('hidden')) {
                this.showGameLog();
            } else {
                this.hideGameLog();
            }
        }
    }

    /**
     * Show game log panel
     */
    showGameLog() {
        const logPanel = document.getElementById('gameLogPanel');
        if (logPanel) {
            logPanel.classList.remove('hidden');
            logPanel.classList.add('visible');
        }
    }

    /**
     * Hide game log panel
     */
    hideGameLog() {
        const logPanel = document.getElementById('gameLogPanel');
        if (logPanel) {
            logPanel.classList.add('hidden');
            logPanel.classList.remove('visible');
        }
    }

    /**
     * Start spell draft (placeholder)
     */
    startSpellDraft() {
        // For now, this is just a placeholder
        this.uiManager.showNotification('Spell drafting not yet implemented', 'info');
        
        // In the future, this could emit a spell draft event
        // this.eventBus.emit('spell:draft-start', { playerId: 'player' });
    }

    /**
     * Draw card from deck
     */
    drawFromDeck() {
        const drawBtn = document.getElementById('drawDeckBtn');
        
        // CRITICAL: Check debounce flag FIRST, before ANY other checks
        if (this.isDrawing) {
            console.log('🚫 Draw already in progress, ignoring click');
            return;
        }
        
        // CRITICAL: Disable IMMEDIATELY on click, before ANY validation
        this.isDrawing = true;
        if (drawBtn) {
            // Check if already processing via data attribute as backup
            if (drawBtn.dataset.processing === 'true') {
                this.isDrawing = false;
                return;
            }
            drawBtn.dataset.processing = 'true';
            drawBtn.disabled = true;
            drawBtn.style.opacity = '0.5';
        }
        
        const state = this.gameState.getState();
        const player = state.players.player;
        
        // Validation checks
        if (player.gold < 3) {
            this.uiManager.showNotification('Not enough gold to draw from deck (costs 3 gold)', 'error');
            this.resetDrawButton();
            return;
        }
        
        if (player.hand.length >= 3) {
            this.uiManager.showNotification('Your hand is full', 'error');
            this.resetDrawButton();
            return;
        }
        
        if (player.deck.length === 0) {
            this.uiManager.showNotification('Your deck is empty', 'error');
            this.resetDrawButton();
            return;
        }

        // Draw card (CardSystem will handle gold deduction)
        this.eventBus.emit('card:draw', { playerId: 'player', source: 'deck' });
        
        // Reset button after successful draw
        setTimeout(() => {
            this.resetDrawButton();
        }, 500);
    }
    
    /**
     * Reset draw button state
     */
    resetDrawButton() {
        const drawBtn = document.getElementById('drawDeckBtn');
        this.isDrawing = false;
        if (drawBtn) {
            drawBtn.dataset.processing = 'false';
            drawBtn.disabled = false;
            this.updateActionButtons(this.gameState.getState());
        }
    }

    /**
     * Start draft for specified tier
     * @param {number} tier - Tier to draft from (1-5)
     */
    startDraft(tier) {
        const state = this.gameState.getState();
        const player = state.players.player;
        const isPlayerTurn = state.currentPlayer === 'player';
        
        console.log(`🎯 Draft tier ${tier} clicked - Current player: ${state.currentPlayer}, Is player turn: ${isPlayerTurn}`);
        
        if (!isPlayerTurn) {
            console.log(`❌ Blocked draft - currentPlayer is '${state.currentPlayer}', expected 'player'`);
            this.uiManager.showNotification('Wait for your turn', 'error');
            return;
        }
        
        // Check if hand is full
        if (player.hand.length >= 3) {
            this.uiManager.showNotification('Your hand is full', 'error');
            return;
        }
        
        // Check gold cost based on tier
        const goldCost = tier * 2;
        if (player.gold < goldCost) {
            this.uiManager.showNotification(`Not enough gold (need ${goldCost} gold)`, 'error');
            return;
        }
        
        // Emit draft start event
        this.eventBus.emit('draft:start', {
            tier: tier,
            playerId: 'player'
        });
    }

    /**
     * Show deck modal
     * @param {string} playerId - 'player' or 'ai'
     */
    showDeck(playerId = 'player') {
        const state = this.gameState.getState();
        const deck = playerId === 'player' ? state.players.player.deck : state.players.ai.deck;
        const playerName = playerId === 'player' ? 'Your' : 'AI';
        
        const deckModal = document.getElementById('deckModal');
        const deckContent = document.getElementById('deckContent');
        
        if (deckModal && deckContent) {
            // Update modal title
            const modalTitle = deckModal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = `${playerName} Deck`;
            }
            
            if (deck.length === 0) {
                deckContent.innerHTML = `<div class="empty-deck">${playerName === 'Your' ? 'Your' : 'AI'} deck is empty. Units that have been played will be added here when they die.</div>`;
            } else {
                deckContent.innerHTML = deck.map(card => `
                    <div class="deck-card ${card.color}">
                        <div class="card-header">
                            <div class="card-name">${card.name}</div>
                        </div>
                        <div class="card-ability">
                            ${card.ability || 'No special ability'}
                        </div>
                        <div class="card-stats">
                            <div class="stat-attack">${card.attack}</div>
                            <div class="stat-health">${card.health}</div>
                        </div>
                        ${card.tags && card.tags.length > 0 ? `
                            <div class="card-tags">
                                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
            
            deckModal.style.display = 'flex';
            deckModal.classList.add('show');
        }
    }

    /**
     * Hide deck modal
     */
    hideDeck() {
        const deckModal = document.getElementById('deckModal');
        if (deckModal) {
            deckModal.classList.remove('show');
            // Hide the modal after transition
            setTimeout(() => {
                deckModal.style.display = 'none';
            }, 300);
        }
    }
}

export default ControlsComponent;