/**
 * Scenario Selection Component
 * Handles the scenario selection UI and user interactions
 */
export default class ScenarioSelectionComponent {
    constructor() {
        this.scenarioManager = null;
        this.onScenarioSelected = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the scenario selection component
     */
    async initialize(scenarioManager, onScenarioSelected) {
        this.scenarioManager = scenarioManager;
        this.onScenarioSelected = onScenarioSelected;
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('🎭 ScenarioSelectionComponent initialized');
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

            // Add hover effects for additional feedback
            button.addEventListener('mouseenter', (e) => {
                this.showScenarioPreview(button.getAttribute('data-scenario'));
            });

            button.addEventListener('mouseleave', (e) => {
                this.hideScenarioPreview();
            });
        });

        console.log(`🎮 Set up event listeners for ${scenarioButtons.length} scenario buttons`);
    }

    /**
     * Handle scenario selection
     */
    async handleScenarioSelection(scenarioId, buttonElement) {
        try {
            console.log(`🎯 Scenario selected: ${scenarioId}`);
            
            // Add visual feedback
            this.showSelectionFeedback(buttonElement);
            
            // Get scenario info for confirmation
            const scenario = this.scenarioManager.getScenario(scenarioId);
            if (!scenario) {
                throw new Error(`Scenario not found: ${scenarioId}`);
            }

            // Show loading state
            this.showLoadingState(true);
            
            // Notify parent that scenario was selected
            if (this.onScenarioSelected) {
                await this.onScenarioSelected(scenarioId);
            }

        } catch (error) {
            console.error('Failed to select scenario:', error);
            this.showError(error.message);
            this.showLoadingState(false);
        }
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
     * Show scenario preview on hover (optional enhancement)
     */
    showScenarioPreview(scenarioId) {
        const scenario = this.scenarioManager.getScenario(scenarioId);
        if (!scenario) return;

        // Create or update preview tooltip
        let preview = document.getElementById('scenarioPreview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'scenarioPreview';
            preview.className = 'scenario-preview';
            document.body.appendChild(preview);
        }

        const scenarioInfo = scenario.getScenarioInfo();
        preview.innerHTML = `
            <div class="preview-header">${scenarioInfo.name}</div>
            <div class="preview-description">${scenarioInfo.description}</div>
            <div class="preview-difficulty">Difficulty: ${scenarioInfo.difficulty}</div>
        `;

        preview.style.display = 'block';
    }

    /**
     * Hide scenario preview
     */
    hideScenarioPreview() {
        const preview = document.getElementById('scenarioPreview');
        if (preview) {
            preview.style.display = 'none';
        }
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
     * Show the scenario selection screen
     */
    show() {
        const scenarioScreen = document.getElementById('scenarioSelection');
        if (scenarioScreen) {
            scenarioScreen.classList.remove('hidden');
            console.log('📺 Scenario selection screen shown');
        }
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
        this.hideScenarioPreview();

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
            'scenarioPreview',
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