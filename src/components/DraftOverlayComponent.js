/**
 * Draft Overlay Component for card selection
 * Manages the modal interface for selecting cards from draft pools
 */
import UnitFactory from '../utils/UnitFactory.js';

class DraftOverlayComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.currentOptions = [];
        this.currentTier = null;
    }

    /**
     * Initialize the draft overlay component
     */
    initialize() {
        this.setupEventHandlers();
        this.setupClickHandlers();
        console.log('🎴 DraftOverlayComponent initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.eventBus.on('draft:options-ready', (data) => {
            // Only show draft modal for human player, not AI
            if (data.playerId === 'player') {
                this.showDraftOptions(data.options, data.tier);
            }
        });
        this.eventBus.on('draft:completed', () => this.hideDraftOptions(true)); // Card was selected
        this.eventBus.on('draft:failed', (data) => this.handleDraftFailed(data));
        this.eventBus.on('draft:reroll-complete', (data) => {
            // Update the draft options with new cards after reroll
            if (data.playerId === 'player') {
                this.showDraftOptions(data.options, data.tier);
            }
        });
    }

    /**
     * Setup click handlers for the overlay
     */
    setupClickHandlers() {
        // No close functionality - draft window cannot be closed once opened
    }

    /**
     * Show draft options to the player
     * @param {Array} options - Available cards to choose from
     * @param {number} tier - Tier being drafted
     */
    showDraftOptions(options, tier) {
        console.log('🎴 Showing draft options:', options, 'tier:', tier);
        this.currentOptions = options;
        this.currentTier = tier;

        const overlay = document.getElementById('draftOverlay');
        const draftInfo = document.getElementById('draftInfo');
        const draftCards = document.getElementById('draftCards');

        console.log('Draft elements found:', {
            overlay: !!overlay,
            draftInfo: !!draftInfo,
            draftCards: !!draftCards
        });

        if (!overlay || !draftInfo || !draftCards) {
            console.error('Draft overlay elements not found');
            return;
        }

        // Update header - gold already paid when draft started
        const cost = tier * 2;
        draftInfo.textContent = `Choose a Tier ${tier} Card (${cost} Gold Paid)`;

        // Create card options HTML
        draftCards.innerHTML = options.map(card => this.createDraftCardHTML(card)).join('');
        console.log('Draft cards HTML updated with', options.length, 'cards');

        // Add click handlers to cards
        this.setupCardClickHandlers();

        // Setup reroll button
        this.setupRerollButton();

        // Update gold display
        this.updateGoldDisplay();

        // Show overlay
        overlay.classList.add('active');
        console.log('Draft overlay should now be visible with class "active"');
        console.log('Overlay computed style:', window.getComputedStyle(overlay).display);
    }

    /**
     * Hide the draft options overlay
     * @param {boolean} cardSelected - Whether a card was actually selected (default false)
     */
    hideDraftOptions(cardSelected = false) {
        // Only allow hiding the draft overlay if a card was actually selected
        // This prevents the window from being closed without making a selection
        if (!cardSelected) {
            return;
        }
        
        const overlay = document.getElementById('draftOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        this.currentOptions = [];
        this.currentTier = null;
    }

    /**
     * Check if overlay is visible
     * @returns {boolean} True if visible
     */
    isVisible() {
        const overlay = document.getElementById('draftOverlay');
        return overlay && overlay.classList.contains('active');
    }

    /**
     * Create HTML for a draft card option
     * @param {Object} card - Card data
     * @returns {string} HTML string
     */
    createDraftCardHTML(card) {
        const tierDisplay = UnitFactory.getCardTierDisplay(card);
        const tierIndicatorHTML = tierDisplay ? `<div class="tier-indicator">${tierDisplay}</div>` : '';
        
        return `
            <div class="game-card game-card--draft draft-card ${card.color}" data-card-id="${card.id}" data-pool-id="${card.poolId}">
                ${tierIndicatorHTML}
                <div class="card-header">
                    <div class="card-name">${card.name}</div>
                </div>
                <div class="card-ability">
                    ${card.ability || ''}
                </div>
                <div class="card-stats">
                    <div class="stat-attack">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">${card.attack}</span>
                    </div>
                    <div class="stat-health">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${card.health}</span>
                    </div>
                </div>
                <div class="card-tags">
                    ${card.tags ? card.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                </div>
            </div>
        `;
    }

    /**
     * Setup click handlers for draft cards
     */
    setupCardClickHandlers() {
        const cardElements = document.querySelectorAll('#draftCards .draft-card');
        
        cardElements.forEach((cardElement, index) => {
            cardElement.addEventListener('click', () => {
                const card = this.currentOptions[index];
                if (card) {
                    this.selectCard(card);
                }
            });

            // Add hover effects
            cardElement.addEventListener('mouseenter', () => {
                cardElement.style.transform = 'translateY(-5px) scale(1.02)';
                cardElement.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)';
            });

            cardElement.addEventListener('mouseleave', () => {
                cardElement.style.transform = '';
                cardElement.style.boxShadow = '';
            });
        });
    }

    /**
     * Setup reroll button functionality
     */
    setupRerollButton() {
        const rerollBtn = document.getElementById('rerollBtn');
        if (!rerollBtn) return;

        // Clear any existing event listeners
        const newRerollBtn = rerollBtn.cloneNode(true);
        rerollBtn.parentNode.replaceChild(newRerollBtn, rerollBtn);
        
        const rerollButton = document.getElementById('rerollBtn');
        
        // Add click handler
        rerollButton.addEventListener('click', () => {
            this.handleReroll();
        });

        // Update button state based on current gold
        this.updateRerollButtonState();
    }

    /**
     * Update reroll button state based on player gold
     */
    updateRerollButtonState() {
        const rerollBtn = document.getElementById('rerollBtn');
        if (!rerollBtn) return;

        const state = this.gameState.getState();
        const playerGold = state.players.player.gold;
        const canReroll = playerGold >= 1;

        rerollBtn.disabled = !canReroll;
        rerollBtn.style.opacity = canReroll ? '1' : '0.5';
        
        if (!canReroll) {
            rerollBtn.textContent = '🎲 Reroll (Need 1 Gold)';
        } else {
            rerollBtn.textContent = '🎲 Reroll (1 Gold)';
        }
    }

    /**
     * Update the gold display in the draft window
     */
    updateGoldDisplay() {
        const goldDisplay = document.getElementById('draftGoldDisplay');
        if (!goldDisplay) return;

        const state = this.gameState.getState();
        const playerGold = state.players.player.gold;
        goldDisplay.textContent = `💰 ${playerGold}`;
    }

    /**
     * Handle reroll button click
     */
    handleReroll() {
        const state = this.gameState.getState();
        const playerGold = state.players.player.gold;
        
        if (playerGold < 1) {
            this.uiManager.showNotification('Not enough gold to reroll', 'error');
            return;
        }

        console.log('🎲 Reroll requested for tier', this.currentTier);
        
        // Emit reroll event
        this.eventBus.emit('draft:reroll', {
            tier: this.currentTier,
            playerId: 'player'
        });
    }

    /**
     * Select a card from the draft options
     * @param {Object} card - Selected card
     */
    selectCard(card) {
        console.log('Draft card selected:', card.name);

        // Emit selection event
        this.eventBus.emit('draft:select', {
            selectedCard: card,
            playerId: 'player'
        });

        // Hide overlay (pass true to indicate a card was selected)
        this.hideDraftOptions(true);

        // Show selection feedback
        this.uiManager.showNotification(`Drafted ${card.name}!`, 'success');
    }

    /**
     * Handle draft failed
     * @param {Object} data - Failure data
     */
    handleDraftFailed(data) {
        let message = 'Draft failed';
        
        switch (data.reason) {
            case 'insufficient_gold':
                message = `Not enough gold to draft Tier ${data.tier}`;
                break;
            case 'no_cards_available':
                message = `No cards available in Tier ${data.tier}`;
                break;
            case 'hand_full':
                message = 'Your hand is full (3 cards maximum)';
                break;
            default:
                message = 'Draft failed: ' + data.reason;
        }

        this.uiManager.showNotification(message, 'error');
        this.hideDraftOptions(true); // Don't show "gold spent" message on failure
    }

    /**
     * Update component (called by UIManager)
     * @param {Object} state - Current game state
     */
    update(state) {
        // Update draft button availability based on gold and hand size
        this.updateDraftButtons(state);
    }

    /**
     * Update draft buttons based on current state
     * @param {Object} state - Game state
     */
    updateDraftButtons(state) {
        if (state.currentPlayer !== 'player') return;

        const playerGold = state.players.player.gold;
        const handSize = state.players.player.hand.length;
        const cardSystem = this.gameEngine.getSystem('CardSystem');

        for (let tier = 1; tier <= 5; tier++) {
            const cost = tier * 2;
            const countElement = document.getElementById(`tier${tier}Count`);
            
            if (countElement && cardSystem) {
                const availableCount = cardSystem.getDraftPoolCount(tier);
                countElement.textContent = availableCount.toString();
            }

            // Update tier button states
            const tierButton = document.querySelector(`button[onclick="startDraft(${tier})"]`);
            if (tierButton) {
                const canAfford = playerGold >= cost;
                const hasSpace = handSize < 3;
                const hasCards = cardSystem ? cardSystem.getDraftPoolCount(tier) > 0 : false;
                
                const canDraft = canAfford && hasSpace && hasCards;
                
                tierButton.disabled = !canDraft;
                tierButton.style.opacity = canDraft ? '1' : '0.5';
                
                // Update button text with status
                let buttonText = `Tier ${tier} (${cost} Gold)`;
                if (!hasSpace) buttonText += ' - Hand Full';
                else if (!canAfford) buttonText += ' - Need More Gold';
                else if (!hasCards) buttonText += ' - No Cards';
                
                tierButton.title = buttonText;
            }
        }
    }
}

export default DraftOverlayComponent;