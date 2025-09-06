/**
 * Keyword System - Handles keyword definitions and tooltips
 */
export class KeywordSystem {
    constructor() {
        this.settings = {
            tooltipsEnabled: true
        };
        this.keywords = {
            'unleash': {
                name: 'Unleash',
                description: 'Trigger effect when unit is summoned'
            },
            'flying': {
                name: 'Flying',
                description: 'Always attacks player unless enemy Flying in column'
            },
            'trample': {
                name: 'Trample',
                description: 'Excess damage dealt to unit carries over to player'
            },
            'sneaky': {
                name: 'Sneaky',
                description: 'First attack targets enemy player directly'
            },
            'rush': {
                name: 'Rush',
                description: 'Can attack the turn it\'s played'
            },
            'ranged': {
                name: 'Ranged',
                description: 'Ignores Front Row when attacking'
            },
            'kindred': {
                name: 'Kindred',
                description: 'Triggers when summoning unit with same Tag'
            },
            'manacharge': {
                name: 'Manacharge',
                description: 'Triggers when you use Blue Unleash abilities'
            },
            'last gasp': {
                name: 'Last Gasp',
                description: 'Triggers when unit is destroyed'
            },
            'banish': {
                name: 'Banish',
                description: 'Removed from game permanently (doesn\'t return to deck)'
            }
        };
        
        this.keywordBox = null;
        this.currentHoveredCard = null;
    }

    /**
     * Initialize the keyword system
     */
    initialize() {
        this.createKeywordBox();
        this.setupEventListeners();
    }

    /**
     * Create the keyword definition box in the unused screen space
     */
    createKeywordBox() {
        this.keywordBox = document.createElement('div');
        this.keywordBox.id = 'keywordDefinitionBox';
        this.keywordBox.className = 'keyword-definition-box';
        this.keywordBox.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; width: 100%;">
                <div class="keyword-box-content" id="keywordBoxContent">
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="cardLibraryButton" class="game-settings-button" title="Card Library">📚</button>
                    <button id="gameSettingsButton" class="game-settings-button" title="Settings">⚙️</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.keywordBox);
        this.createSettingsModal();
        this.setupSettingsListeners();
        this.setupCardLibraryButton();
    }

    /**
     * Setup event listeners for card hover detection
     */
    setupEventListeners() {
        document.addEventListener('mouseenter', this.handleCardHover.bind(this), true);
        document.addEventListener('mouseleave', this.handleCardLeave.bind(this), true);
    }

    /**
     * Handle card hover events
     */
    handleCardHover(event) {
        // Safety check: ensure event.target is an element with closest method
        if (!event.target || !event.target.closest) return;
        
        const cardElement = event.target.closest('.game-card, .hand-card, .draft-card, .deck-card');
        if (!cardElement) return;

        // Get card data
        const cardData = this.extractCardData(cardElement);
        if (!cardData || !cardData.ability) return;

        this.currentHoveredCard = cardElement;
        this.showKeywordsForCard(cardData.ability);
    }

    /**
     * Handle card leave events
     */
    handleCardLeave(event) {
        // Safety check: ensure event.target is an element with closest method
        if (!event.target || !event.target.closest) return;
        
        const cardElement = event.target.closest('.game-card, .hand-card, .draft-card, .deck-card');
        if (cardElement === this.currentHoveredCard) {
            this.currentHoveredCard = null;
            this.hideKeywords();
        }
    }

    /**
     * Extract card data from card element
     */
    extractCardData(cardElement) {
        // Try to get ability text from the card element
        let abilityElement = cardElement.querySelector('.card-ability, .unit-ability');
        
        if (abilityElement) {
            return {
                ability: abilityElement.textContent.trim()
            };
        }

        // If no ability element found, check if it's a battlefield unit
        const unitElement = cardElement.querySelector('.unit-stats');
        if (unitElement) {
            const abilityDiv = cardElement.querySelector('.unit-ability');
            return {
                ability: abilityDiv ? abilityDiv.textContent.trim() : ''
            };
        }

        return null;
    }

    /**
     * Show keywords found in the card's ability text
     */
    showKeywordsForCard(abilityText) {
        // Check if tooltips are disabled
        if (!this.settings.tooltipsEnabled) {
            return;
        }
        
        const foundKeywords = this.findKeywordsInText(abilityText);
        
        if (foundKeywords.length === 0) {
            this.hideKeywords();
            return;
        }

        const contentDiv = document.getElementById('keywordBoxContent');
        contentDiv.innerHTML = '';

        foundKeywords.forEach(keyword => {
            const keywordDiv = document.createElement('div');
            keywordDiv.className = 'keyword-definition';
            keywordDiv.innerHTML = `
                <div class="keyword-text"><span class="keyword-name-highlight">${keyword.name}</span> - ${keyword.description}</div>
            `;
            contentDiv.appendChild(keywordDiv);
        });

        this.keywordBox.classList.add('active');
    }

    /**
     * Hide the keyword box
     */
    hideKeywords() {
        const contentDiv = document.getElementById('keywordBoxContent');
        contentDiv.innerHTML = '';
        this.keywordBox.classList.remove('active');
    }

    /**
     * Find keywords in ability text
     */
    findKeywordsInText(abilityText) {
        if (!abilityText) return [];

        const foundKeywords = [];
        const lowerText = abilityText.toLowerCase();

        for (const [keywordKey, keywordData] of Object.entries(this.keywords)) {
            if (lowerText.includes(keywordKey)) {
                foundKeywords.push(keywordData);
            }
        }

        return foundKeywords;
    }

    /**
     * Create the settings modal
     */
    createSettingsModal() {
        this.settingsModal = document.createElement('div');
        this.settingsModal.id = 'gameSettingsModal';
        this.settingsModal.className = 'game-settings-modal hidden';
        this.settingsModal.innerHTML = `
            <div class="settings-modal-content">
                <h3>Game Settings</h3>
                <div class="settings-option">
                    <label>
                        <input type="checkbox" id="tooltipsToggle" ${this.settings.tooltipsEnabled ? 'checked' : ''}>
                        Enable Tooltips
                    </label>
                </div>
                <div class="settings-buttons">
                    <button id="quitGameButton" class="settings-quit-button">Quit to Scenario Selection</button>
                    <button id="closeSettingsButton" class="settings-close-button">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.settingsModal);
    }

    /**
     * Setup settings event listeners
     */
    setupSettingsListeners() {
        const settingsButton = document.getElementById('gameSettingsButton');
        const settingsModal = document.getElementById('gameSettingsModal');
        const closeButton = document.getElementById('closeSettingsButton');
        const quitButton = document.getElementById('quitGameButton');
        const tooltipsToggle = document.getElementById('tooltipsToggle');

        settingsButton.addEventListener('click', () => {
            settingsModal.classList.toggle('hidden');
        });

        closeButton.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        quitButton.addEventListener('click', () => {
            this.quitToScenarioSelection();
        });

        tooltipsToggle.addEventListener('change', (e) => {
            this.settings.tooltipsEnabled = e.target.checked;
            if (!this.settings.tooltipsEnabled) {
                this.hideKeywords();
            }
        });

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    /**
     * Setup card library button
     */
    setupCardLibraryButton() {
        const cardLibraryButton = document.getElementById('cardLibraryButton');
        if (!cardLibraryButton) return;
        
        cardLibraryButton.addEventListener('click', () => {
            this.showCardLibrary();
        });
        
        // Setup modal close functionality if not already setup
        const cardLibraryModal = document.getElementById('cardLibraryModal');
        const closeBtn = document.getElementById('cardLibraryCloseBtn');
        
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
            closeBtn.setAttribute('data-listener-attached', 'true');
            closeBtn.addEventListener('click', () => {
                this.hideCardLibrary();
            });
        }
        
        if (cardLibraryModal && !cardLibraryModal.hasAttribute('data-listener-attached')) {
            cardLibraryModal.setAttribute('data-listener-attached', 'true');
            cardLibraryModal.addEventListener('click', (e) => {
                if (e.target === cardLibraryModal) {
                    this.hideCardLibrary();
                }
            });
        }
    }

    /**
     * Show the card library modal
     */
    showCardLibrary() {
        // Load cards if not already loaded
        this.loadCardLibrary();
        
        const modal = document.getElementById('cardLibraryModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            console.log('📚 Card library opened from game');
        }
    }

    /**
     * Hide the card library modal
     */
    hideCardLibrary() {
        const modal = document.getElementById('cardLibraryModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            console.log('📚 Card library closed');
        }
    }

    /**
     * Load and display all cards in the library
     */
    loadCardLibrary() {
        // Import the card loading logic from ScenarioSelectionComponent
        // Check if already loaded
        if (document.querySelector('.card-library-card')) {
            return;
        }
        
        // Get CARD_DATABASE from EmbeddedGameData
        import('../data/EmbeddedGameData.js').then(module => {
            const CARD_DATABASE = module.CARD_DATABASE;
            
            // Color order: red first, then yellow, green, blue, purple
            const colorOrder = ['red', 'yellow', 'green', 'blue', 'purple'];
            
            // Load cards for each tier
            for (let tier = 1; tier <= 5; tier++) {
                const tierCards = CARD_DATABASE[tier.toString()] || [];
                const container = document.getElementById(`tier${tier}Cards`);
                
                if (!container) continue;
                
                // Sort cards by color order
                const sortedCards = tierCards.sort((a, b) => {
                    const aIndex = colorOrder.indexOf(a.color);
                    const bIndex = colorOrder.indexOf(b.color);
                    const aOrder = aIndex === -1 ? 999 : aIndex;
                    const bOrder = bIndex === -1 ? 999 : bIndex;
                    return aOrder - bOrder;
                });
                
                // Create card elements
                sortedCards.forEach(card => {
                    const cardElement = this.createCardElement(card, tier);
                    container.appendChild(cardElement);
                });
            }
            
            console.log('📚 Card library loaded with all cards');
        });
    }

    /**
     * Create a card element for the library using draft card format
     */
    createCardElement(card, tier) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `game-card game-card--draft draft-card card-library-card ${card.color}`;
        
        // Convert tier to Roman numeral
        const tierRoman = ['I', 'II', 'III', 'IV', 'V'][tier - 1];
        const tierIndicatorHTML = `<div class="tier-indicator">${tierRoman}</div>`;
        
        // Create card HTML matching draft format
        cardDiv.innerHTML = `
            ${tierIndicatorHTML}
            <div class="card-header">
                <div class="card-name">${card.name}</div>
            </div>
            <div class="card-ability">
                ${card.ability || ''}
            </div>
            <div class="card-stats">
                <div class="stat-attack">
                    <span class="stat-value">${card.attack}</span>
                </div>
                <div class="stat-health">
                    <span class="stat-value">${card.health}</span>
                </div>
            </div>
        `;
        
        return cardDiv;
    }

    /**
     * Quit to scenario selection screen
     */
    quitToScenarioSelection() {
        // Show scenario selection screen and hide game
        const scenarioScreen = document.querySelector('.scenario-selection-screen');
        const gameContainer = document.querySelector('.game-container, #gameContainer');
        
        if (scenarioScreen) {
            scenarioScreen.classList.remove('hidden');
        }
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Hide settings modal
        this.settingsModal.classList.add('hidden');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.keywordBox) {
            this.keywordBox.remove();
        }
        if (this.settingsModal) {
            this.settingsModal.remove();
        }
        document.removeEventListener('mouseenter', this.handleCardHover.bind(this), true);
        document.removeEventListener('mouseleave', this.handleCardLeave.bind(this), true);
    }
}

export default KeywordSystem;