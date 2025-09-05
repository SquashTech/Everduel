/**
 * Simple Main Application Entry Point
 * Based on REBUILD_GAME_ENGINE_ONLY.md - KEEP IT SIMPLE!
 */
import SimpleGameEngine from './core/SimpleGameEngine.js';
import CombatSystem from './systems/CombatSystem.js';
import CardSystem from './systems/CardSystem.js';
import AbilitySystem from './systems/AbilitySystem.js';
import SimpleAISystem from './systems/SimpleAISystem.js';
import OptimizedUIManager from './components/OptimizedUIManager.js';
import DebugCardGenerator from './debug/DebugCardGenerator.js';
import ScenarioManager from './scenarios/ScenarioManager.js';
import ScenarioSelectionComponent from './components/ScenarioSelectionComponent.js';

/**
 * Simple Main Application Class
 */
class SimpleCardGameApp {
    constructor() {
        this.gameEngine = null;
        this.isInitialized = false;
        this.systems = {};
        this.scenarioManager = null;
        this.scenarioSelectionComponent = null;
        this.gameStarted = false;
    }

    /**
     * Initialize the application - SIMPLE VERSION
     */
    async initialize() {
        try {
            console.log('🚀 Everduel Application starting...');
            
            // Create simple game engine
            this.gameEngine = new SimpleGameEngine();
            
            // Create and register systems
            await this.initializeSystems();
            
            // Initialize game engine
            await this.gameEngine.initialize();
            
            // Setup window functions for UI compatibility
            this.setupWindowFunctions();
            
            // Initialize scenario system
            await this.initializeScenarioSystem();
            
            // Hide loading indicator and show scenario selection
            this.hideLoadingIndicator();
            this.showScenarioSelection();
            
            this.isInitialized = true;
            console.log('✅ Everduel initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoadingIndicator();
            throw error;
        }
    }

    /**
     * Hide the loading indicator
     */
    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Initialize all game systems - USING EXISTING WORKING SYSTEMS
     */
    async initializeSystems() {
        console.log('📦 Initializing game systems...');
        
        // Create systems - preserve existing working ones, use new simple AI
        this.systems.combat = new CombatSystem();
        this.systems.cards = new CardSystem();
        this.systems.abilities = new AbilitySystem();
        this.systems.ai = new SimpleAISystem(); // Use new simple AI
        this.systems.ui = new OptimizedUIManager(); // Fixed OptimizedUIManager - now has components!
        
        // Create debug system (only for testing)
        this.debugCardGenerator = new DebugCardGenerator();
        
        // Register systems with game engine
        this.gameEngine.registerSystem('CombatSystem', this.systems.combat);
        this.gameEngine.registerSystem('CardSystem', this.systems.cards);
        this.gameEngine.registerSystem('AbilitySystem', this.systems.abilities);
        this.gameEngine.registerSystem('ai', this.systems.ai);  // AI system registered as 'ai'
        this.gameEngine.registerSystem('UIManager', this.systems.ui);
        
        // Initialize UI Manager
        await this.systems.ui.initialize();
        
        // Initialize debug card generator
        this.debugCardGenerator.initialize(this.gameEngine);
        
        console.log(`✅ Registered ${Object.keys(this.systems).length} systems`);
    }

    /**
     * Setup window functions for UI compatibility - DIRECT CALLS
     */
    setupWindowFunctions() {
        // Draft functions - use existing CardSystem
        window.startDraft = (tier) => {
            this.gameEngine.eventBus.emit('draft:start', {
                tier: parseInt(tier),
                playerId: 'player'
            });
        };

        window.selectDraftCard = (selectedCard) => {
            this.gameEngine.eventBus.emit('draft:select', {
                selectedCard,
                playerId: 'player'
            });
        };

        // Game control functions - DIRECT CALL TO SIMPLE ENGINE
        window.endTurn = async () => {
            console.log('🎮 End Turn button clicked - calling SimpleGameEngine.endPlayerTurn()');
            await this.gameEngine.endPlayerTurn(); // Now properly awaits async call
        };

        window.resetGame = () => {
            this.gameEngine.startGame();
        };

        // UI functions
        window.toggleGameLog = () => {
            const logPanel = document.getElementById('gameLogPanel');
            if (logPanel) {
                logPanel.classList.toggle('hidden');
            }
        };

        // Debug functions
        window.getGameState = () => {
            return this.gameEngine.getState();
        };

        // Scenario functions
        window.returnToScenarioSelection = () => {
            this.returnToScenarioSelection();
        };

        console.log('🔧 Window functions registered for simple UI compatibility');
    }

    /**
     * Initialize scenario system
     */
    async initializeScenarioSystem() {
        console.log('🎭 Initializing scenario system...');
        
        // Create scenario manager
        this.scenarioManager = new ScenarioManager();
        await this.scenarioManager.initialize(this.gameEngine);
        
        // Create scenario selection component
        this.scenarioSelectionComponent = new ScenarioSelectionComponent();
        await this.scenarioSelectionComponent.initialize(
            this.scenarioManager,
            this.onScenarioSelected.bind(this)
        );
        
        console.log('✅ Scenario system initialized');
    }

    /**
     * Handle scenario selection
     */
    async onScenarioSelected(scenarioId) {
        try {
            console.log(`🎬 Loading scenario: ${scenarioId}`);
            
            // Select and load the scenario
            await this.scenarioManager.selectScenario(scenarioId);
            
            // Store scenario ID globally for win tracking
            window.currentScenarioId = scenarioId;
            console.log('🔧 Set global currentScenarioId:', scenarioId);
            
            // Notify GameInfoComponent about current scenario for win tracking
            if (this.gameEngine && this.gameEngine.uiManager) {
                const gameInfoComponent = this.gameEngine.uiManager.components.get('gameInfo');
                if (gameInfoComponent && gameInfoComponent.setCurrentScenario) {
                    gameInfoComponent.setCurrentScenario(scenarioId);
                    console.log('✅ Successfully called setCurrentScenario on GameInfoComponent');
                } else {
                    console.warn('⚠️ GameInfoComponent or setCurrentScenario method not found');
                }
            } else {
                console.warn('⚠️ GameEngine or UIManager not found');
            }
            
            // Hide scenario selection and show game
            this.hideScenarioSelection();
            this.showGame();
            
            // Start the game with the selected scenario
            this.gameEngine.startGame();
            
            // Re-apply scenario setup after startGame() to override any resets
            await this.scenarioManager.getCurrentScenario().applyScenarioSetup();
            
            this.gameStarted = true;
            
            console.log(`🎮 Game started with scenario: ${scenarioId}`);
            
        } catch (error) {
            console.error('Failed to load scenario:', error);
            this.scenarioSelectionComponent.showError(error.message);
        }
    }

    /**
     * Show scenario selection screen
     */
    showScenarioSelection() {
        if (this.scenarioSelectionComponent) {
            this.scenarioSelectionComponent.show();
        }
    }

    /**
     * Hide scenario selection screen
     */
    hideScenarioSelection() {
        if (this.scenarioSelectionComponent) {
            this.scenarioSelectionComponent.hide();
        }
    }

    /**
     * Show game interface
     */
    showGame() {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.remove('hidden');
        }
    }

    /**
     * Hide game interface
     */
    hideGame() {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.add('hidden');
        }
    }

    /**
     * Return to scenario selection (for future "back to menu" functionality)
     */
    returnToScenarioSelection() {
        if (this.gameStarted) {
            // Reset game state if the method exists
            if (this.gameEngine && typeof this.gameEngine.reset === 'function') {
                this.gameEngine.reset();
            }
            this.gameStarted = false;
        }
        
        // Hide game and show scenario selection
        this.hideGame();
        this.showScenarioSelection();
        
        // Reset scenario selection component
        if (this.scenarioSelectionComponent && typeof this.scenarioSelectionComponent.reset === 'function') {
            this.scenarioSelectionComponent.reset();
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.scenarioSelectionComponent) {
            this.scenarioSelectionComponent.destroy();
        }
        if (this.scenarioManager) {
            this.scenarioManager.endCurrentScenario('destroyed');
        }
        if (this.gameEngine) {
            this.gameEngine.destroy();
        }
        this.isInitialized = false;
        this.gameStarted = false;
        console.log('🗑️ Everduel destroyed');
    }
}

/**
 * Initialize the application when DOM is ready
 */
let cardGameApp = null;

async function initializeSimpleCardGame() {
    try {
        console.log('🎮 Starting Everduel...');
        
        // Force hide loading after 5 seconds as fallback
        setTimeout(() => {
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator && !loadingIndicator.classList.contains('hidden')) {
                console.warn('Loading took too long, forcing hide');
                loadingIndicator.classList.add('hidden');
            }
        }, 5000);
        
        cardGameApp = new SimpleCardGameApp();
        await cardGameApp.initialize();
        
        // Make app available globally for debugging
        window.cardGameApp = cardGameApp;
        
        console.log('🎮 Everduel ready to play!');
        
    } catch (error) {
        console.error('Failed to start simple card game:', error);
        
        // Force hide loading indicator on error
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error';
        errorDiv.innerHTML = `
            <h2>Failed to Load Game</h2>
            <p>Error: ${error.message}</p>
            <button onclick="location.reload()">Reload Page</button>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 9999;
        `;
        document.body.appendChild(errorDiv);
    }
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimpleCardGame);
} else {
    initializeSimpleCardGame();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (cardGameApp) {
        cardGameApp.destroy();
    }
});

export default SimpleCardGameApp;