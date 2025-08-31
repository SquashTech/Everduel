/**
 * Draft Overlay Component for card selection
 * Manages the modal interface for selecting cards from draft pools
 */
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
        this.eventBus.on('draft:completed', () => this.hideDraftOptions());
        this.eventBus.on('draft:failed', (data) => this.handleDraftFailed(data));
    }

    /**
     * Setup click handlers for the overlay
     */
    setupClickHandlers() {
        // Close button functionality
        const closeButton = document.querySelector('#draftOverlay .modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hideDraftOptions());
        }

        // Click outside to close
        const overlay = document.getElementById('draftOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideDraftOptions();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hideDraftOptions();
            }
        });
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

        // Update header
        const cost = tier * 2;
        draftInfo.textContent = `Choose a Tier ${tier} Card (${cost} Gold)`;

        // Create card options HTML
        draftCards.innerHTML = options.map(card => this.createDraftCardHTML(card)).join('');
        console.log('Draft cards HTML updated with', options.length, 'cards');

        // Add click handlers to cards
        this.setupCardClickHandlers();

        // Show overlay
        overlay.classList.add('active');
        console.log('Draft overlay should now be visible with class "active"');
        console.log('Overlay computed style:', window.getComputedStyle(overlay).display);
    }

    /**
     * Hide the draft options overlay
     */
    hideDraftOptions() {
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
        return `
            <div class="game-card game-card--draft draft-card ${card.color}" data-card-id="${card.id}" data-pool-id="${card.poolId}">
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

        // Hide overlay
        this.hideDraftOptions();

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
        this.hideDraftOptions();
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