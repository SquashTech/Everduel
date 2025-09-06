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
                <button id="gameSettingsButton" class="game-settings-button">⚙️</button>
            </div>
        `;
        
        document.body.appendChild(this.keywordBox);
        this.createSettingsModal();
        this.setupSettingsListeners();
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