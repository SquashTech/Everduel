/**
 * Hand Component for managing player's hand
 * Handles card display, selection, and drag/drop functionality
 */
import DOMSanitizer from '../utils/DOMSanitizer.js';
import UnitFactory from '../utils/UnitFactory.js';

class HandComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.selectedCard = null;
    }

    /**
     * Initialize the hand component
     */
    initialize() {
        this.setupEventHandlers();
        this.setupDragAndDrop();
        console.log('🤚 HandComponent initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.eventBus.on('card:played', (data) => this.handleCardPlayed(data));
        this.eventBus.on('draft:completed', (data) => this.handleCardAdded(data));
    }

    /**
     * Setup drag and drop for hand cards
     */
    setupDragAndDrop() {
        // Will be set up when cards are rendered
    }

    /**
     * Update the hand display
     * @param {Object} state - Current game state
     */
    update(state) {
        this.updatePlayerHand(state.players.player);
        // Hand count no longer displayed in UI
    }

    /**
     * Update player's hand display
     * @param {Object} player - Player data
     */
    updatePlayerHand(player) {
        const handCardsContainer = document.getElementById('handCardsContainer');
        if (!handCardsContainer) return;

        const hand = player.hand || [];

        if (hand.length === 0) {
            DOMSanitizer.clearContent(handCardsContainer);
            return;
        }

        // Create hand cards using safe DOM methods
        DOMSanitizer.clearContent(handCardsContainer);
        hand.forEach((card, index) => {
            const cardElement = this.createHandCardElement(card, index);
            handCardsContainer.appendChild(cardElement);
        });

        // Setup interactions for each card
        this.setupHandCardInteractions();
    }

    /**
     * Create DOM element for a hand card (replaces createHandCardHTML)
     * @param {Object} card - Card data
     * @param {number} index - Card index in hand
     * @returns {HTMLElement} Card element
     */
    createHandCardElement(card, index) {
        const isSelected = this.selectedCard && this.selectedCard.handId === card.handId;
        
        // Create main card container
        const cardElement = DOMSanitizer.createElement('div', '', 
            `game-card game-card--hand hand-card ${card.color} ${isSelected ? 'selected' : ''}`);
        
        cardElement.setAttribute('data-card-index', index);
        cardElement.setAttribute('data-hand-id', card.handId);
        cardElement.setAttribute('draggable', 'true');
        
        // Add tier indicator if available
        const tierDisplay = UnitFactory.getCardTierDisplay(card);
        if (tierDisplay) {
            const tierIndicator = DOMSanitizer.createElement('div', tierDisplay, 'tier-indicator');
            cardElement.appendChild(tierIndicator);
        }
        
        // Create and append header
        const header = DOMSanitizer.createElement('div', '', 'card-header');
        const nameDiv = DOMSanitizer.createElement('div', card.name, 'card-name');
        header.appendChild(nameDiv);
        cardElement.appendChild(header);
        
        // Create and append ability
        const abilityDiv = DOMSanitizer.createElement('div', card.ability || '', 'card-ability');
        cardElement.appendChild(abilityDiv);
        
        // Create and append stats
        const statsDiv = DOMSanitizer.createElement('div', '', 'card-stats');
        
        const attackDiv = DOMSanitizer.createElement('div', '', 'stat-attack');
        const attackIcon = DOMSanitizer.createElement('span', '⚔️', 'stat-icon');
        const attackValue = DOMSanitizer.createElement('span', card.attack.toString(), 'stat-value');
        attackDiv.appendChild(attackIcon);
        attackDiv.appendChild(attackValue);
        
        const healthDiv = DOMSanitizer.createElement('div', '', 'stat-health');
        const healthIcon = DOMSanitizer.createElement('span', '❤️', 'stat-icon');
        const healthValue = DOMSanitizer.createElement('span', card.health.toString(), 'stat-value');
        healthDiv.appendChild(healthIcon);
        healthDiv.appendChild(healthValue);
        
        statsDiv.appendChild(attackDiv);
        statsDiv.appendChild(healthDiv);
        cardElement.appendChild(statsDiv);
        
        // Create and append tags
        const tagsDiv = DOMSanitizer.createElement('div', '', 'card-tags');
        if (card.tags && card.tags.length > 0) {
            card.tags.forEach(tag => {
                const tagSpan = DOMSanitizer.createElement('span', tag, 'tag');
                tagsDiv.appendChild(tagSpan);
            });
        }
        cardElement.appendChild(tagsDiv);
        
        return cardElement;
    }

    /**
     * Create HTML for a hand card (deprecated - use createHandCardElement instead)
     * @param {Object} card - Card data
     * @param {number} index - Card index in hand
     * @returns {string} HTML string
     * @deprecated Use createHandCardElement for security
     */
    createHandCardHTML(card, index) {
        console.warn('HandComponent: createHandCardHTML is deprecated, use createHandCardElement');
        return this.createHandCardElement(card, index).outerHTML;
    }

    /**
     * Setup interactions for hand cards
     */
    setupHandCardInteractions() {
        const handCards = document.querySelectorAll('.hand-card');
        
        handCards.forEach((cardElement, index) => {
            // Click to select
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectCard(index);
            });

            // Drag start
            cardElement.addEventListener('dragstart', (e) => {
                this.handleDragStart(e, index);
            });

            // Drag end
            cardElement.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });

            // Double click to auto-place (if possible)
            cardElement.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.tryAutoPlace(index);
            });

            // Hover effects
            cardElement.addEventListener('mouseenter', () => {
                if (!cardElement.classList.contains('selected')) {
                    cardElement.style.transform = 'translateY(-5px) scale(1.02)';
                    cardElement.style.zIndex = '10';
                }
            });

            cardElement.addEventListener('mouseleave', () => {
                if (!cardElement.classList.contains('selected')) {
                    cardElement.style.transform = '';
                    cardElement.style.zIndex = '';
                }
            });
        });
    }

    /**
     * Select a card from hand
     * @param {number} cardIndex - Index of card to select
     */
    selectCard(cardIndex) {
        const state = this.gameState.getState();
        const hand = state.players.player.hand;
        
        if (cardIndex < 0 || cardIndex >= hand.length) return;

        const card = hand[cardIndex];
        
        // Toggle selection
        if (this.selectedCard && this.selectedCard.handId === card.handId) {
            this.clearSelection();
        } else {
            this.selectedCard = card;
            this.update(state); // Re-render to show selection
            this.uiManager.showNotification(`${card.name} selected. Click an empty battlefield slot to place it.`, 'info');
        }
    }

    /**
     * Clear card selection
     */
    clearSelection() {
        this.selectedCard = null;
        const state = this.gameState.getState();
        this.update(state);
    }

    /**
     * Get currently selected card
     * @returns {Object|null} Selected card or null
     */
    getSelectedCard() {
        return this.selectedCard;
    }

    /**
     * Handle drag start
     * @param {Event} e - Drag event
     * @param {number} cardIndex - Card index
     */
    handleDragStart(e, cardIndex) {
        const state = this.gameState.getState();
        const card = state.players.player.hand[cardIndex];
        
        if (!card) return;

        // Check if it's player's turn
        if (state.currentPlayer !== 'player') {
            e.preventDefault();
            this.uiManager.showNotification("It's not your turn!", 'warning');
            return;
        }

        // Set drag data
        e.dataTransfer.setData('text/plain', JSON.stringify(card));
        e.dataTransfer.effectAllowed = 'move';

        // Visual feedback
        e.target.style.opacity = '0.5';

        // Store dragged card
        this.draggedCard = card;

        // Add visual cues to valid drop zones
        this.highlightValidDropZones();

        console.log('Started dragging card:', card.name);
    }

    /**
     * Handle drag end
     * @param {Event} e - Drag event
     */
    handleDragEnd(e) {
        // Clean up visual feedback
        this.resetDragStyling();
    }

    /**
     * Try to auto-place card in first available slot
     * @param {number} cardIndex - Card index
     */
    tryAutoPlace(cardIndex) {
        const state = this.gameState.getState();
        const card = state.players.player.hand[cardIndex];
        const battlefield = state.players.player.battlefield;
        
        if (!card) return;

        // Find first empty slot
        const emptySlot = battlefield.findIndex(slot => slot === null);
        
        if (emptySlot !== -1) {
            this.eventBus.emit('card:play', {
                card: card,
                slotIndex: emptySlot,
                playerId: 'player'
            });
        } else {
            this.uiManager.showNotification('No empty battlefield slots available', 'warning');
        }
    }

    /**
     * Handle card being played
     * @param {Object} data - Play data
     */
    handleCardPlayed(data) {
        if (data.playerId === 'player') {
            // Clear selection if the played card was selected
            if (this.selectedCard && this.selectedCard.handId === data.card.handId) {
                this.clearSelection();
            }

            // Reset any drag styling
            this.resetDragStyling();
        }
    }

    /**
     * Handle card being added to hand
     * @param {Object} data - Draft completion data
     */
    handleCardAdded(data) {
        if (data.playerId === 'player') {
            // Animate the new card
            setTimeout(() => {
                const handCards = document.querySelectorAll('.hand-card');
                const newCard = handCards[handCards.length - 1];
                if (newCard) {
                    newCard.classList.add('card-added');
                    setTimeout(() => {
                        newCard.classList.remove('card-added');
                    }, 600);
                }
            }, 100);
        }
    }

    /**
     * Remove card from hand display
     * @param {Object} card - Card to remove
     */
    removeCardFromHand(card) {
        const cardElement = document.querySelector(`[data-hand-id="${card.handId}"]`);
        if (cardElement) {
            cardElement.classList.add('card-leaving');
            setTimeout(() => {
                cardElement.remove();
            }, 300);
        }
    }

    /**
     * Highlight valid drop zones for dragging
     */
    highlightValidDropZones() {
        const state = this.gameState.getState();
        const battlefield = state.players.player.battlefield;
        
        // Highlight empty player slots
        battlefield.forEach((slot, index) => {
            const slotElement = document.querySelector(`[data-player="player"][data-slot="${index}"]`);
            if (slotElement && slot === null) {
                slotElement.classList.add('valid-drop');
            }
        });
    }

    /**
     * Clear drop zone highlights
     */
    clearDropZoneHighlights() {
        document.querySelectorAll('.valid-drop').forEach(slot => {
            slot.classList.remove('valid-drop');
        });
    }

    /**
     * Reset drag styling
     */
    resetDragStyling() {
        document.querySelectorAll('.hand-card').forEach(card => {
            card.style.opacity = '';
        });
        this.clearDropZoneHighlights();
        this.draggedCard = null;
    }

    /**
     * Update hand count display - REMOVED: Hand count no longer shown in UI
     */
    updateHandCount(count) {
        // Hand count display removed from UI - no longer needed
    }

    /**
     * Get hand size limit
     * @returns {number} Maximum hand size
     */
    getHandLimit() {
        return 3;
    }

    /**
     * Check if hand is full
     * @param {Object} state - Game state
     * @returns {boolean} True if hand is full
     */
    isHandFull(state) {
        return state.players.player.hand.length >= this.getHandLimit();
    }
}

export default HandComponent;