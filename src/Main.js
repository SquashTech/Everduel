/**
 * Simple Main Application Entry Point
 * Based on REBUILD_GAME_ENGINE_ONLY.md - KEEP IT SIMPLE!
 */
import SimpleGameEngine from './core/SimpleGameEngine.js';
import CombatSystem from './systems/CombatSystem.js';
import CardSystem from './systems/CardSystem.js';
import AbilitySystem from './systems/AbilitySystem.js';
import SimpleAISystem from './systems/SimpleAISystem.js';
import UIManager from './components/UIManager.js';

/**
 * Simple Main Application Class
 */
class SimpleCardGameApp {
    constructor() {
        this.gameEngine = null;
        this.isInitialized = false;
        this.systems = {};
    }

    /**
     * Initialize the application - SIMPLE VERSION
     */
    async initialize() {
        try {
            console.log('🚀 Simple Card Game Application starting...');
            
            // Create simple game engine
            this.gameEngine = new SimpleGameEngine();
            
            // Create and register systems
            await this.initializeSystems();
            
            // Initialize game engine
            await this.gameEngine.initialize();
            
            // Setup window functions for UI compatibility
            this.setupWindowFunctions();
            
            // Start new game
            this.gameEngine.startGame();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            this.isInitialized = true;
            console.log('✅ Simple Card Game initialized successfully');
            
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
        this.systems.ui = new UIManager();
        
        // Register systems with game engine
        this.gameEngine.registerSystem('CombatSystem', this.systems.combat);
        this.gameEngine.registerSystem('CardSystem', this.systems.cards);
        this.gameEngine.registerSystem('AbilitySystem', this.systems.abilities);
        this.gameEngine.registerSystem('ai', this.systems.ai);  // AI system registered as 'ai'
        this.gameEngine.registerSystem('UIManager', this.systems.ui);
        
        // Initialize UI Manager
        await this.systems.ui.initialize();
        
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

        console.log('🔧 Window functions registered for simple UI compatibility');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.gameEngine) {
            this.gameEngine.destroy();
        }
        this.isInitialized = false;
        console.log('🗑️ Simple Card Game destroyed');
    }
}

/**
 * Initialize the application when DOM is ready
 */
let cardGameApp = null;

async function initializeSimpleCardGame() {
    try {
        console.log('🎮 Starting Simple Card Game...');
        
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
        
        console.log('🎮 Simple Card Game ready to play!');
        
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