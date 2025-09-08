import WinTracker from '../utils/WinTracker.js';
import { CARD_DATABASE } from '../data/EmbeddedGameData.js';
import ChampionSelectionComponent from './ChampionSelectionComponent.js';

/**
 * Scenario Selection Component
 * Handles the scenario selection UI and user interactions
 */
export default class ScenarioSelectionComponent {
    constructor() {
        this.scenarioManager = null;
        this.onScenarioSelected = null;
        this.isInitialized = false;
        this.winTracker = new WinTracker();
        this.championSelection = new ChampionSelectionComponent();
        this.selectedScenarioId = null;
        
        // Define which scenarios are currently available
        this.availableScenarios = new Set([
            'tutorial-1',  // Easy Mode
            'tutorial-2',  // Behind the Curve
            'medium-1',    // Beasts of Burden
            'easy-1',      // It Takes a Village
            'hard-2'       // Goofy Goblins
        ]);
    }

    /**
     * Initialize the scenario selection component
     */
    async initialize(scenarioManager, onScenarioSelected) {
        this.scenarioManager = scenarioManager;
        this.onScenarioSelected = onScenarioSelected;
        
        // Initialize champion selection with callback
        this.championSelection.initialize((champion) => {
            this.onChampionSelected(champion);
        });
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up card library
        this.setupCardLibrary();
        
        // Update scenario availability display
        this.updateScenarioAvailability();
        
        this.isInitialized = true;
        console.log('🎭 ScenarioSelectionComponent initialized');
    }

    /**
     * Setup card library functionality
     */
    setupCardLibrary() {
        const cardLibraryBtn = document.getElementById('cardLibraryBtn');
        if (cardLibraryBtn) {
            cardLibraryBtn.addEventListener('click', () => {
                this.showCardLibrary();
            });
        }

        // Setup modal close functionality
        const cardLibraryModal = document.getElementById('cardLibraryModal');
        const closeBtn = document.getElementById('cardLibraryCloseBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideCardLibrary();
            });
        }

        if (cardLibraryModal) {
            cardLibraryModal.addEventListener('click', (e) => {
                if (e.target === cardLibraryModal) {
                    this.hideCardLibrary();
                }
            });
        }

        console.log('📚 Card library functionality initialized');
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
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            modal.style.zIndex = '20000';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
        }
        
        console.log('📚 Card library opened');
    }

    /**
     * Hide the card library modal
     */
    hideCardLibrary() {
        const modal = document.getElementById('cardLibraryModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        
        console.log('📚 Card library closed');
    }

    /**
     * Load and display all cards in the library
     */
    loadCardLibrary() {
        // Check if already loaded
        if (document.querySelector('.card-library-card')) {
            return;
        }

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
    }

    /**
     * Create a card element for the library using draft card format
     */
    createCardElement(card, tier) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `game-card game-card--draft draft-card ${card.color}`;
        
        // Convert tier to Roman numeral
        const tierRoman = this.getTierRomanNumeral(tier);
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
            <div class="card-tags">
                ${card.tags ? card.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
        `;

        return cardDiv;
    }

    /**
     * Convert tier number to Roman numeral
     */
    getTierRomanNumeral(tier) {
        const romanNumerals = {
            1: 'I',
            2: 'II', 
            3: 'III',
            4: 'IV',
            5: 'V'
        };
        return romanNumerals[tier] || tier.toString();
    }

    /**
     * Setup event listeners for scenario buttons
     */
    setupEventListeners() {
        const scenarioButtons = document.querySelectorAll('.scenario-btn');
        
        scenarioButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const scenarioId = button.getAttribute('data-scenario');
                this.handleScenarioSelection(scenarioId, button);
            });
        });

        // Set up reset progress button listener
        const resetProgressBtn = document.getElementById('resetProgressBtn');
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', () => {
                this.handleResetProgress();
            });
        }

        console.log(`🎮 Set up event listeners for ${scenarioButtons.length} scenario buttons`);
    }

    /**
     * Handle scenario selection - now shows confirmation modal
     */
    async handleScenarioSelection(scenarioId, buttonElement) {
        try {
            console.log(`🎯 Scenario clicked: ${scenarioId}`);
            
            // Check if scenario is available
            if (!this.availableScenarios.has(scenarioId)) {
                console.log(`🚫 Scenario ${scenarioId} is not available yet`);
                this.showUnavailableMessage(buttonElement);
                return;
            }
            
            // Get scenario info for confirmation
            const scenario = this.scenarioManager.getScenario(scenarioId);
            if (!scenario) {
                throw new Error(`Scenario not found: ${scenarioId}`);
            }

            // Show confirmation modal instead of immediately starting
            this.showConfirmationModal(scenarioId, buttonElement, scenario);

        } catch (error) {
            console.error('Failed to show scenario confirmation:', error);
            this.showError(error.message);
        }
    }

    /**
     * Show confirmation modal for scenario
     */
    showConfirmationModal(scenarioId, buttonElement, scenario) {
        const modal = document.getElementById('scenarioConfirmationModal');
        const iconElement = document.getElementById('confirmationScenarioIcon');
        const titleElement = document.getElementById('confirmationScenarioTitle');
        const descriptionElement = document.getElementById('scenarioDescription');
        const detailsElement = document.getElementById('scenarioDetails');

        if (!modal || !iconElement || !titleElement || !descriptionElement) {
            console.error('Confirmation modal elements not found');
            return;
        }

        // Get scenario info and button details
        const scenarioInfo = scenario.getScenarioInfo();
        const iconText = buttonElement.querySelector('.scenario-icon').textContent;

        // Populate modal content
        iconElement.textContent = iconText;
        titleElement.textContent = scenarioInfo.name;
        descriptionElement.textContent = scenarioInfo.description || 'Are you ready to begin this scenario?';
        
        // Add difficulty info with sword rating
        const difficultyRating = '⚔️'.repeat(scenarioInfo.difficulty);
        detailsElement.innerHTML = `<strong>Difficulty:</strong> ${difficultyRating} (${scenarioInfo.difficulty}/5)`;

        // Store scenario info for confirmation
        modal.setAttribute('data-scenario-id', scenarioId);

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        modal.style.zIndex = '99999';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        // Set up event listeners for modal buttons
        this.setupConfirmationModalListeners();
    }

    /**
     * Setup event listeners for confirmation modal buttons
     */
    setupConfirmationModalListeners() {
        const modal = document.getElementById('scenarioConfirmationModal');
        const cancelBtn = document.getElementById('scenarioConfirmationCancel');
        const confirmBtn = document.getElementById('scenarioConfirmationConfirm');

        // Remove existing listeners to avoid duplicates
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));

        // Get fresh references
        const newCancelBtn = document.getElementById('scenarioConfirmationCancel');
        const newConfirmBtn = document.getElementById('scenarioConfirmationConfirm');

        // Cancel button - hide modal
        newCancelBtn.addEventListener('click', () => {
            this.hideConfirmationModal();
        });

        // Confirm button - start scenario
        newConfirmBtn.addEventListener('click', async () => {
            const scenarioId = modal.getAttribute('data-scenario-id');
            this.hideConfirmationModal();
            await this.confirmScenarioSelection(scenarioId);
        });

        // Click outside modal to cancel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideConfirmationModal();
            }
        });
    }

    /**
     * Hide confirmation modal
     */
    hideConfirmationModal() {
        const modal = document.getElementById('scenarioConfirmationModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            modal.removeAttribute('data-scenario-id');
        }
    }

    /**
     * Confirm scenario selection and start the scenario
     */
    async confirmScenarioSelection(scenarioId) {
        try {
            console.log(`✅ Scenario confirmed: ${scenarioId}`);
            
            // Store the selected scenario
            this.selectedScenarioId = scenarioId;
            
            // Show champion selection instead of directly starting
            this.championSelection.show();

        } catch (error) {
            console.error('Failed to show champion selection:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Handle champion selection and start the game
     */
    async onChampionSelected(champion) {
        try {
            console.log(`👑 Champion selected: ${champion.name}, starting scenario: ${this.selectedScenarioId}`);
            
            // Show loading state
            this.showLoadingState(true);
            
            // Notify parent that scenario and champion were selected
            if (this.onScenarioSelected) {
                await this.onScenarioSelected(this.selectedScenarioId, champion);
            }

        } catch (error) {
            console.error('Failed to start scenario with champion:', error);
            this.showError(error.message);
            this.showLoadingState(false);
        }
    }

    /**
     * Handle reset progress button click
     */
    handleResetProgress() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to reset all scenario progress? This will remove all completion stars and cannot be undone.')) {
            console.log('🗑️ Resetting all scenario progress...');
            
            // Clear all wins
            this.winTracker.clearAllWins();
            
            // Remove all win stars from buttons
            document.querySelectorAll('.win-star').forEach(star => {
                star.remove();
            });
            
            // Show success message
            this.showProgressResetMessage();
            
            console.log('✅ All scenario progress has been reset');
        }
    }

    /**
     * Show progress reset confirmation message
     */
    showProgressResetMessage() {
        // Create temporary success message
        const message = document.createElement('div');
        message.className = 'progress-reset-message';
        message.innerHTML = `
            <div class="message-content">
                <div class="message-icon">✅</div>
                <div class="message-text">All progress has been reset!</div>
            </div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            font-weight: bold;
        `;
        
        document.body.appendChild(message);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    /**
     * Show visual feedback for selection
     */
    showSelectionFeedback(buttonElement) {
        // Remove previous selections
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Add selected class
        buttonElement.classList.add('selected');

        // Add temporary pulse effect
        buttonElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            buttonElement.style.transform = '';
        }, 150);
    }


    /**
     * Show loading state
     */
    showLoadingState(isLoading) {
        const scenarioScreen = document.getElementById('scenarioSelection');
        if (scenarioScreen) {
            if (isLoading) {
                scenarioScreen.classList.add('loading');
                
                // Add loading overlay
                let loadingOverlay = document.getElementById('scenarioLoading');
                if (!loadingOverlay) {
                    loadingOverlay = document.createElement('div');
                    loadingOverlay.id = 'scenarioLoading';
                    loadingOverlay.className = 'scenario-loading-overlay';
                    loadingOverlay.innerHTML = `
                        <div class="loading-content">
                            <div class="loading-spinner">🎮</div>
                            <div class="loading-text">Loading scenario...</div>
                        </div>
                    `;
                    scenarioScreen.appendChild(loadingOverlay);
                }
                loadingOverlay.style.display = 'flex';
            } else {
                scenarioScreen.classList.remove('loading');
                const loadingOverlay = document.getElementById('scenarioLoading');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error display
        let errorDiv = document.getElementById('scenarioError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'scenarioError';
            errorDiv.className = 'scenario-error';
            document.body.appendChild(errorDiv);
        }

        errorDiv.innerHTML = `
            <div class="error-content">
                <div class="error-icon">❌</div>
                <div class="error-text">${message}</div>
                <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">Close</button>
            </div>
        `;
        errorDiv.style.display = 'flex';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    /**
     * Update scenario availability display
     */
    updateScenarioAvailability() {
        console.log('🔒 Updating scenario availability...');
        
        const scenarioButtons = document.querySelectorAll('.scenario-btn');
        scenarioButtons.forEach(button => {
            const scenarioId = button.getAttribute('data-scenario');
            if (scenarioId && !this.availableScenarios.has(scenarioId)) {
                // Gray out unavailable scenarios
                button.classList.add('scenario-unavailable');
                button.setAttribute('title', 'Coming Soon - This scenario is not yet available');
                
                // Add a lock icon or "Coming Soon" indicator
                if (!button.querySelector('.unavailable-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'unavailable-overlay';
                    overlay.innerHTML = `
                        <div class="unavailable-icon">🔒</div>
                        <div class="unavailable-text">Coming Soon</div>
                    `;
                    button.appendChild(overlay);
                }
                
                console.log(`🔒 Marked ${scenarioId} as unavailable`);
            }
        });
        
        console.log(`🔒 Updated availability for ${scenarioButtons.length} scenarios`);
    }

    /**
     * Show unavailable scenario message
     */
    showUnavailableMessage(buttonElement) {
        // Create temporary message
        const message = document.createElement('div');
        message.className = 'unavailable-message';
        message.innerHTML = `
            <div class="message-content">
                <div class="message-icon">🔒</div>
                <div class="message-text">This scenario is not yet available!</div>
            </div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b6b;
            color: white;
            padding: 20px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            font-weight: bold;
            font-size: 16px;
        `;
        
        document.body.appendChild(message);
        
        // Add shake effect to button
        buttonElement.style.animation = 'shake 0.5s ease-in-out';
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
            buttonElement.style.animation = '';
        }, 2000);
    }

    /**
     * Show the scenario selection screen
     */
    show() {
        const scenarioScreen = document.getElementById('scenarioSelection');
        if (scenarioScreen) {
            scenarioScreen.classList.remove('hidden');
            scenarioScreen.style.display = 'block';
            
            // Update win indicators when showing
            this.updateScenarioWinIndicators();
            
            // Update scenario availability
            this.updateScenarioAvailability();
            
            console.log('📺 Scenario selection screen shown');
        }
    }
    
    /**
     * Update scenario buttons with win indicators
     */
    updateScenarioWinIndicators() {
        console.log('⭐ Updating scenario win indicators...');
        
        // Debug: Show all wins in localStorage
        const allWins = this.winTracker.getStats();
        console.log('⭐ All completed scenarios in localStorage:', allWins);
        
        const scenarioButtons = document.querySelectorAll('.scenario-btn');
        console.log(`⭐ Found ${scenarioButtons.length} scenario buttons`);
        
        scenarioButtons.forEach(button => {
            const scenarioId = button.getAttribute('data-scenario');
            const hasWon = this.winTracker.hasWon(scenarioId);
            console.log(`⭐ Button ${scenarioId}: hasWon = ${hasWon}`);
            
            // Debug: Show all wins for this check
            console.log('🔍 All current wins:', this.winTracker.getStats());
            
            if (scenarioId && hasWon) {
                this.addWinIndicatorToButton(button, scenarioId);
            }
        });
        
        console.log(`⭐ Updated ${scenarioButtons.length} scenario buttons`);
    }
    
    /**
     * Add win indicator to a scenario button
     * @param {HTMLElement} button - The scenario button element
     * @param {string} scenarioId - The scenario ID
     */
    addWinIndicatorToButton(button, scenarioId) {
        // Check if star already exists
        if (button.querySelector('.win-star')) {
            console.log(`⭐ Star already exists for scenario: ${scenarioId}`);
            return;
        }
        
        // Create star element
        const star = document.createElement('div');
        star.className = 'win-star';
        star.textContent = '⭐';
        star.title = 'Completed';
        
        // Add to button (position is now handled by CSS)
        button.appendChild(star);
        
        console.log(`⭐ Added win star to scenario: ${scenarioId}`);
    }

    /**
     * Hide the scenario selection screen
     */
    hide() {
        const scenarioScreen = document.getElementById('scenarioSelection');
        if (scenarioScreen) {
            scenarioScreen.classList.add('hidden');
            console.log('📺 Scenario selection screen hidden');
        }
    }

    /**
     * Check if scenario selection screen is visible
     */
    isVisible() {
        const scenarioScreen = document.getElementById('scenarioSelection');
        return scenarioScreen && !scenarioScreen.classList.contains('hidden');
    }

    /**
     * Reset the component state
     */
    reset() {
        // Remove selection states
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Hide any overlays
        this.showLoadingState(false);
        this.hideConfirmationModal();

        // Hide error messages
        const errorDiv = document.getElementById('scenarioError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        // Remove event listeners by replacing elements
        const scenarioScreen = document.getElementById('scenarioSelection');
        if (scenarioScreen) {
            const newScenarioScreen = scenarioScreen.cloneNode(true);
            scenarioScreen.parentNode.replaceChild(newScenarioScreen, scenarioScreen);
        }

        // Clean up created elements
        const elementsToRemove = [
            'scenarioLoading', 
            'scenarioError'
        ];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });

        this.isInitialized = false;
        console.log('🗑️ ScenarioSelectionComponent destroyed');
    }
}